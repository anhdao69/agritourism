"""
FastAPI Backend for Land Cover Change Analysis with Fragstats Integration

To run:
    pip install fastapi uvicorn rasterio geopandas numpy pandas scipy xlsxwriter matplotlib contextily rpy2
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import io
import json
import shutil
import tempfile
import zipfile
from datetime import datetime
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
import rasterio.warp  # <--- ADDED THIS IMPORT
from rasterio.mask import mask
from rasterio.transform import array_bounds
from scipy.stats import chi2_contingency
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================================
# === IMPORTS: VISUALIZATION & RPY2 ==========================
# ============================================================

try:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.colors as mcolors

    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

try:
    import contextily as ctx

    HAS_CONTEXTILY = True
except ImportError:
    HAS_CONTEXTILY = False

# RPY2 Imports for Fragstats
try:
    import rpy2.robjects as ro
    from rpy2.robjects import StrVector, IntVector
    from rpy2.robjects.packages import importr
    from rpy2.robjects import pandas2ri

    HAS_RPY2 = True
except ImportError:
    HAS_RPY2 = False
    print("WARNING: rpy2 not installed. Fragstats analysis will be skipped.")

# ============================================================
# === SETUP ==================================================
# ============================================================

app = FastAPI(
    title="Land Cover Analysis API",
    description="Analyze NLCD land cover changes and Fragstats metrics",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_PATH = "/Users/hoanganh692004/Desktop/geojson"

# ============================================================
# === DICTIONARIES & CONFIGS =================================
# ============================================================

NLCD_LABELS = {
    11: "11-water",
    12: "12-ice_snow",
    21: "21-developed_open_space",
    22: "22-developed_low_intensity",
    23: "23-developed_medium_intensity",
    24: "24-developed_high_intensity",
    31: "31-barren_land",
    41: "41-deciduous_forest",
    42: "42-evergreen_forest",
    43: "43-mixed_forest",
    51: "51-dwarf_shrub",
    52: "52-shrub_scrub",
    71: "71-grassland_herbaceous",
    72: "72-sedge_herbaceous",
    73: "73-lichens",
    74: "74-moss",
    81: "81-pasture_hay",
    82: "82-cultivated_crops",
    90: "90-woody_wetlands",
    95: "95-emergent_herbaceous_wetlands",
    0: "0-empty",
}

RECLASS_NAMES = {
    1: "water",
    2: "developed",
    3: "forest",
    4: "shrub",
    5: "herbaceous",
    6: "nonvascular",
    7: "sparse_vegetation",
    0: "empty",
}

RECLASS_LABELS = {
    1: "1-water",
    2: "2-developed",
    3: "3-forest",
    4: "4-shrub",
    5: "5-herbaceous",
    6: "6-nonvascular",
    7: "7-sparse_vegetation",
    0: "0-empty",
}

RECLASS_DICT = {
    11: 1,
    12: 1,
    21: 2,
    22: 2,
    23: 2,
    24: 2,
    41: 3,
    42: 3,
    43: 3,
    51: 4,
    52: 4,
    71: 5,
    72: 5,
    81: 5,
    82: 5,
    90: 5,
    95: 5,
    73: 6,
    74: 6,
    31: 7,
}

LC_NAMES = {
    1: "Water",
    2: "Developed Area",
    3: "Forest",
    4: "Shrub",
    5: "Herbaceous",
    6: "Nonvascular",
    7: "Sparse Vegetation",
}

CLASS_COLORS = {
    1: "blue",
    2: "red",
    3: "green",
    4: "yellow",
    5: "purple",
    6: "orange",
    7: "brown",
}


class AnalysisRequest(BaseModel):
    geojson: Dict[str, Any]
    year1: int
    year2: int


# ============================================================
# === HELPER FUNCTIONS =======================================
# ============================================================


def get_tif_path(year: int) -> str:
    path = os.path.join(
        BASE_PATH,
        f"Annual_NLCD_LndCov_{year}_CU_C1V1",
        f"Annual_NLCD_LndCov_{year}_CU_C1V1.tif",
    )
    if not os.path.exists(path):
        raise FileNotFoundError(f"NLCD TIF file not found: {path}")
    return path


def crop_raster_in_memory(raster_path: str, geoms: list):
    with rasterio.open(raster_path) as src:
        cropped_data, cropped_transform = mask(src, geoms, crop=True, nodata=0)
        cropped_meta = src.meta.copy()
    cropped_meta.update(
        {
            "height": cropped_data.shape[1],
            "width": cropped_data.shape[2],
            "transform": cropped_transform,
        }
    )
    return cropped_data, cropped_meta


def apply_labels(df: pd.DataFrame, label_dict: dict) -> pd.DataFrame:
    df_new = df.copy()
    df_new.index = [label_dict.get(i, f"{i}-empty") for i in df.index]
    df_new.columns = [label_dict.get(j, f"{j}-empty") for j in df.columns]
    return df_new


def apply_reclass_labels(df: pd.DataFrame, label_dict: dict) -> pd.DataFrame:
    df_new = df.copy()
    df_new.index = [label_dict.get(i, f"{i}-empty") for i in df.index]
    df_new.columns = [label_dict.get(j, f"{j}-empty") for j in df.columns]
    return df_new


def reclassify(arr: np.ndarray, mapping: dict) -> np.ndarray:
    out = np.copy(arr)
    for k, v in mapping.items():
        out[arr == k] = v
    return out


def normalize_and_rank(
    transition_matrix: pd.DataFrame,
    label: str,
    use_nlcd_labels: bool = False,
    use_reclass_labels: bool = False,
):
    tm = transition_matrix.copy()
    np.fill_diagonal(tm.values, 0)
    total_changed = tm.sum().sum()
    if total_changed == 0:
        return None, None

    change_pct = ((tm / total_changed) * 100).round(2)
    from_colname = "From"
    change_pct = change_pct.rename_axis(from_colname)
    flat = change_pct.reset_index().melt(
        id_vars=from_colname, var_name="To", value_name="Percent"
    )
    flat = flat[flat["Percent"] > 0].sort_values("Percent", ascending=False)
    flat["Change_Class"] = pd.cut(
        flat["Percent"],
        bins=[0, 1, 10, 25, 100],
        labels=["Very Low", "Low", "Moderate", "High"],
    )

    norm_labeled = change_pct.copy()
    if use_nlcd_labels:
        norm_labeled.index = [
            NLCD_LABELS.get(int(x), "0-empty") for x in change_pct.index
        ]
        norm_labeled.columns = [
            NLCD_LABELS.get(int(x), "0-empty") for x in change_pct.columns
        ]
    if use_reclass_labels:
        norm_labeled.index = [
            RECLASS_LABELS.get(int(x), "0-empty") for x in change_pct.index
        ]
        norm_labeled.columns = [
            RECLASS_LABELS.get(int(x), "0-empty") for x in change_pct.columns
        ]

    if use_nlcd_labels:
        flat["From_description"] = flat[from_colname].apply(
            lambda x: NLCD_LABELS.get(int(x), "0-empty")
        )
        flat["To_description"] = flat["To"].apply(
            lambda x: NLCD_LABELS.get(int(x), "0-empty")
        )
    if use_reclass_labels:
        flat["From_description"] = flat[from_colname].apply(
            lambda x: RECLASS_LABELS.get(int(x), "0-empty")
        )
        flat["To_description"] = flat["To"].apply(
            lambda x: RECLASS_LABELS.get(int(x), "0-empty")
        )

    if use_nlcd_labels or use_reclass_labels:
        flat["Label"] = flat.apply(
            lambda r: f"{r['From_description']} to {r['To_description']}", axis=1
        )

    return norm_labeled, flat


def chi_square_summary(
    tm: pd.DataFrame, use_nlcd_labels: bool = False, use_reclass_labels: bool = False
):
    chi2, p, dof, exp = chi2_contingency(tm.values)
    exp_df = pd.DataFrame(exp, index=tm.index, columns=tm.columns).round(2)

    if use_nlcd_labels:
        exp_df.index = [NLCD_LABELS.get(int(i), f"{i}-unknown") for i in exp_df.index]
        exp_df.columns = [
            NLCD_LABELS.get(int(j), f"{j}-unknown") for j in exp_df.columns
        ]
    if use_reclass_labels:
        exp_df.index = [
            RECLASS_LABELS.get(int(i), f"{i}-unknown") for i in exp_df.index
        ]
        exp_df.columns = [
            RECLASS_LABELS.get(int(j), f"{j}-unknown") for j in exp_df.columns
        ]

    row_labels = list(tm.index)
    col_labels = list(tm.columns)
    summary_rows = []

    for i in tm.index:
        for j in tm.columns:
            i_pos = row_labels.index(i)
            j_pos = col_labels.index(j)
            expected_val = exp[i_pos][j_pos]

            if use_nlcd_labels:
                f_label = NLCD_LABELS.get(int(i), f"{i}-unknown")
                t_label = NLCD_LABELS.get(int(j), f"{j}-unknown")
            elif use_reclass_labels:
                f_label = RECLASS_LABELS.get(int(i), f"{i}-unknown")
                t_label = RECLASS_LABELS.get(int(j), f"{j}-unknown")
            else:
                f_label = str(i)
                t_label = str(j)

            std_resid = (
                (tm.loc[i, j] - expected_val) / np.sqrt(expected_val)
                if expected_val > 0
                else 0
            )
            summary_rows.append(
                {
                    "From": int(i),
                    "To": int(j),
                    "From_description": f_label,
                    "To_description": t_label,
                    "Label": f"{f_label} to {t_label}",
                    "Observed": round(tm.loc[i, j], 2),
                    "Expected": round(expected_val, 2),
                    "StdResid": round(std_resid, 2),
                    "Significance": "Significant" if abs(std_resid) > 2 else "Not",
                }
            )

    return {
        "chi2": round(chi2, 4),
        "p": round(p, 6),
        "summary": pd.DataFrame(summary_rows),
        "expected": exp_df,
    }


def land_change_intensity(tm: pd.DataFrame):
    M = tm.copy()
    np.fill_diagonal(M.values, 0)
    total = tm.values.sum()
    changed = M.values.sum()
    n = len(M)
    uniform = round((changed / n) / total * 100, 2) if total > 0 else 0

    gain = (M.sum(axis=0) / total * 100).round(2) if total > 0 else M.sum(axis=0) * 0
    loss = (M.sum(axis=1) / total * 100).round(2) if total > 0 else M.sum(axis=1) * 0

    gain_df = pd.DataFrame(
        {
            "Class": gain.index,
            "Gain(%)": gain.values,
            "Uniform(%)": uniform,
            "Status": np.where(gain > uniform, "Active Gain", "Dormant Gain"),
        }
    ).round(2)
    loss_df = pd.DataFrame(
        {
            "Class": loss.index,
            "Loss(%)": loss.values,
            "Uniform(%)": uniform,
            "Status": np.where(loss > uniform, "Active Loss", "Dormant Loss"),
        }
    ).round(2)

    trans = (M / total * 100).round(2) if total > 0 else M * 0
    trans_flat = trans.reset_index().melt(
        id_vars=trans.index.name or "index", var_name="To", value_name="Intensity(%)"
    )
    trans_flat = trans_flat.rename(columns={trans.index.name or "index": "From"})
    trans_flat = (
        trans_flat[trans_flat["Intensity(%)"] > 0]
        .sort_values("Intensity(%)", ascending=False)
        .reset_index(drop=True)
    )

    return gain_df, loss_df, trans_flat


def write_excel_with_title(
    writer, df, sheet_name, title_text, keep_index=False, description_text=None
):
    df.to_excel(writer, sheet_name=sheet_name, startrow=2, index=keep_index)
    worksheet = writer.sheets[sheet_name]
    workbook = writer.book
    last_col = max(df.shape[1] - 1 + (1 if keep_index else 0), 0)  # Fix for empty dfs

    title_format = workbook.add_format(
        {"bold": True, "align": "center", "valign": "vcenter", "font_size": 14}
    )
    desc_format = workbook.add_format(
        {"text_wrap": True, "italic": True, "align": "left", "valign": "top"}
    )

    worksheet.merge_range(0, 0, 0, last_col, title_text, title_format)
    if description_text:
        desc_row = 2 + len(df) + 2
        worksheet.merge_range(
            desc_row, 0, desc_row, last_col, description_text, desc_format
        )


def safe_label(map_dict, code):
    code_str = str(code)
    return map_dict.get(code_str, f"{code_str}-empty")


# ============================================================
# === FRAGSTATS LOGIC ========================================
# ============================================================


def run_fragstats_routine(tif_path_1, tif_path_2, results_dir):
    """
    Executes the R-based Fragstats analysis.
    """
    if not HAS_RPY2:
        print("Skipping Fragstats: rpy2 not available.")
        return

    print("Initializing R for Fragstats analysis...")

    # Activate Pandas conversion
    try:
        # pandas2ri.activate()
        landscapemetrics = importr("landscapemetrics")
        raster_pkg = importr("raster")
        base = importr("base")

        # Helper for reclass matrix
        r_matrix = ro.r["matrix"]
        calculate_lsm = landscapemetrics.calculate_lsm
        reclassify_r = raster_pkg.reclassify

    except Exception as e:
        print(f"Error loading R packages: {e}")
        return

    try:
        # Load Rasters
        print("Loading rasters into R...")
        r2010 = raster_pkg.raster(tif_path_1)
        r2024 = raster_pkg.raster(tif_path_2)

        # Metrics Definitions
        class_metrics = StrVector(
            [
                "lsm_c_ca",
                "lsm_c_pland",
                "lsm_c_pd",
                "lsm_c_lpi",
                "lsm_c_ed",
                "lsm_c_shape_mn",
                "lsm_c_ai",
                "lsm_c_cohesion",
            ]
        )

        landscape_metrics = StrVector(
            [
                "lsm_l_np",
                "lsm_l_pd",
                "lsm_l_shdi",
                "lsm_l_siei",
                "lsm_l_contag",
                "lsm_l_split",
                "lsm_l_iji",
                "lsm_l_ai",
                "lsm_l_pr",
            ]
        )

        # --- 1. Original Metrics ---
        print("Calculating Original Metrics...")
        class2010_r = calculate_lsm(r2010, what=class_metrics)
        class2024_r = calculate_lsm(r2024, what=class_metrics)
        land2010_r = calculate_lsm(r2010, what=landscape_metrics)
        land2024_r = calculate_lsm(r2024, what=landscape_metrics)

        # Convert to Pandas
        class2010 = pandas2ri.rpy2py(class2010_r)
        class2024 = pandas2ri.rpy2py(class2024_r)
        land2010 = pandas2ri.rpy2py(land2010_r)
        land2024 = pandas2ri.rpy2py(land2024_r)

        # Merge & Diff (Class Original)
        class2024_ren = class2024.rename(columns={"value": "value_year2"})
        class2010_ren = class2010.rename(columns={"value": "value_year1"})
        compare_class_orig = class2024_ren.merge(
            class2010_ren,
            on=["level", "class", "id", "metric"],
            how="inner",
            suffixes=("_year2", "_year1"),
        )
        compare_class_orig["change"] = (
            compare_class_orig["value_year2"] - compare_class_orig["value_year1"]
        )

        # Merge & Diff (Landscape Original)
        land2024_ren = land2024.rename(columns={"value": "value_year2"})
        land2010_ren = land2010.rename(columns={"value": "value_year1"})
        compare_land_orig = land2024_ren.merge(
            land2010_ren,
            on=["level", "id", "metric"],
            how="inner",
            suffixes=("_year2", "_year1"),
        )
        compare_land_orig["change"] = (
            compare_land_orig["value_year2"] - compare_land_orig["value_year1"]
        )

        # --- 2. Reclassification ---
        print("Reclassifying Rasters in R...")
        reclass_values = [
            11,
            1,
            12,
            1,
            21,
            2,
            22,
            2,
            23,
            2,
            24,
            2,
            41,
            3,
            42,
            3,
            43,
            3,
            51,
            4,
            52,
            4,
            71,
            5,
            72,
            5,
            81,
            5,
            82,
            5,
            90,
            5,
            95,
            5,
            73,
            6,
            74,
            6,
            31,
            7,
        ]
        reclass_mat = r_matrix(IntVector(reclass_values), ncol=2, byrow=True)

        r2010_re = reclassify_r(r2010, reclass_mat)
        r2024_re = reclassify_r(r2024, reclass_mat)

        # --- 3. Reclass Metrics ---
        print("Calculating Reclassified Metrics...")
        class2010_re_r = calculate_lsm(r2010_re, what=class_metrics)
        class2024_re_r = calculate_lsm(r2024_re, what=class_metrics)
        land2010_re_r = calculate_lsm(r2010_re, what=landscape_metrics)
        land2024_re_r = calculate_lsm(r2024_re, what=landscape_metrics)

        class2010_re = pandas2ri.rpy2py(class2010_re_r)
        class2024_re = pandas2ri.rpy2py(class2024_re_r)
        land2010_re = pandas2ri.rpy2py(land2010_re_r)
        land2024_re = pandas2ri.rpy2py(land2024_re_r)

        # Merge & Diff (Class Reclass)
        class2024_re_ren = class2024_re.rename(columns={"value": "value_year2"})
        class2010_re_ren = class2010_re.rename(columns={"value": "value_year1"})
        compare_class_re = class2024_re_ren.merge(
            class2010_re_ren,
            on=["level", "class", "id", "metric"],
            how="inner",
            suffixes=("_year2", "_year1"),
        )
        compare_class_re["change"] = (
            compare_class_re["value_year2"] - compare_class_re["value_year1"]
        )

        # Map Labels
        class_label_map = {
            "1": "Water",
            "2": "Developed",
            "3": "Forest",
            "4": "Shrub",
            "5": "Herbaceous",
            "6": "Nonvascular",
            "7": "Sparse vegetation",
        }
        compare_class_re["class_label"] = (
            compare_class_re["class"].astype(str).map(class_label_map)
        )
        compare_class_re = compare_class_re[compare_class_re["class"].isin(range(1, 8))]

        # Merge & Diff (Landscape Reclass)
        land2024_re_ren = land2024_re.rename(columns={"value": "value_year2"})
        land2010_re_ren = land2010_re.rename(columns={"value": "value_year1"})
        compare_land_re = land2024_re_ren.merge(
            land2010_re_ren,
            on=["level", "id", "metric"],
            how="inner",
            suffixes=("_year2", "_year1"),
        )
        compare_land_re["change"] = (
            compare_land_re["value_year2"] - compare_land_re["value_year1"]
        )

        # --- 4. EXPORTING ---
        print("Exporting Fragstats results...")

        # Define paths
        class_excel = os.path.join(results_dir, "FRAGSTATS_ClassLevel.xlsx")
        land_excel = os.path.join(results_dir, "FRAGSTATS_LandscapeLevel.xlsx")

        # Texts
        title_class = "Fragstats results at the Class level"
        title_land = "Fragstats results at the Landscape level"
        desc_text = "It shows the fragstats results for two years and changes."

        # SAVE EXCEL: Class Level
        with pd.ExcelWriter(class_excel, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer, compare_class_orig, "Original", title_class, False, desc_text
            )
            write_excel_with_title(
                writer, compare_class_re, "Reclassified", title_class, False, desc_text
            )

        # SAVE EXCEL: Landscape Level
        with pd.ExcelWriter(land_excel, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer, compare_land_orig, "Original", title_land, False, desc_text
            )
            write_excel_with_title(
                writer, compare_land_re, "Reclassified", title_land, False, desc_text
            )

        # SAVE CSVs (User Request)
        compare_class_orig.to_csv(
            os.path.join(results_dir, "FRAGSTATS_Class_Original.csv"), index=False
        )
        compare_class_re.to_csv(
            os.path.join(results_dir, "FRAGSTATS_Class_Reclassified.csv"), index=False
        )
        compare_land_orig.to_csv(
            os.path.join(results_dir, "FRAGSTATS_Landscape_Original.csv"), index=False
        )
        compare_land_re.to_csv(
            os.path.join(results_dir, "FRAGSTATS_Landscape_Reclassified.csv"),
            index=False,
        )

        print("Fragstats analysis completed successfully.")

    except Exception as e:
        print(f"Error during Fragstats execution: {e}")
        import traceback

        traceback.print_exc()


# ============================================================
# === MAIN ENDPOINT ==========================================
# ============================================================


@app.post("/api/analyze")
async def analyze(request: AnalysisRequest):
    try:
        output_dir = tempfile.mkdtemp(prefix="nlcd_analysis_")
        results_dir = os.path.join(output_dir, "results")
        os.makedirs(results_dir, exist_ok=True)

        geojson_data = request.geojson
        year1 = request.year1
        year2 = request.year2
        print(f"Starting analysis for years {year1} to {year2}")

        # --- LOAD GEOMETRY ---
        if geojson_data.get("type") == "Feature":
            gdf = gpd.GeoDataFrame.from_features([geojson_data])
        elif geojson_data.get("type") == "FeatureCollection":
            gdf = gpd.GeoDataFrame.from_features(geojson_data.get("features", []))
        elif geojson_data.get("type") in ["Polygon", "MultiPolygon"]:
            from shapely.geometry import shape

            gdf = gpd.GeoDataFrame(geometry=[shape(geojson_data)])
        else:
            raise HTTPException(status_code=400, detail="Invalid GeoJSON format")

        if gdf.empty:
            raise HTTPException(
                status_code=400, detail="GeoJSON contains no valid geometries"
            )

        try:
            tif_path_year1 = get_tif_path(year1)
            tif_path_year2 = get_tif_path(year2)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

        with rasterio.open(tif_path_year2) as src_temp:
            raster_crs = src_temp.crs

        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")
        if gdf.crs != raster_crs:
            gdf = gdf.to_crs(raster_crs)

        geoms = [geom for geom in gdf.geometry if geom is not None]
        if not geoms:
            raise HTTPException(status_code=400, detail="No valid geometries found")

        # --- CROP RASTERS ---
        year1_data, meta_year1 = crop_raster_in_memory(tif_path_year1, geoms)
        year2_data, meta_year2 = crop_raster_in_memory(tif_path_year2, geoms)

        out_tif_year1 = os.path.join(results_dir, f"crop_year1_{year1}.tif")
        out_tif_year2 = os.path.join(results_dir, f"crop_year2_{year2}.tif")

        meta_y1 = meta_year1.copy()
        meta_y1.update({"driver": "GTiff", "count": 1})
        with rasterio.open(out_tif_year1, "w", **meta_y1) as dst:
            dst.write(year1_data[0], 1)

        meta_y2 = meta_year2.copy()
        meta_y2.update({"driver": "GTiff", "count": 1})
        with rasterio.open(out_tif_year2, "w", **meta_y2) as dst:
            dst.write(year2_data[0], 1)

        year1_band = year1_data[0]
        year2_band = year2_data[0]

        # ============================================================
        # === FRAGSTATS STEP (INTEGRATED) ============================
        # ============================================================

        # We pass the paths to the cropped TIFs we just saved
        run_fragstats_routine(out_tif_year1, out_tif_year2, results_dir)

        # ============================================================
        # === TRANSITION MATRIX STEP =================================
        # ============================================================

        year1_flat = year1_band.flatten()
        year2_flat = year2_band.flatten()
        mask_valid = (~np.isnan(year1_flat)) & (~np.isnan(year2_flat))
        year1_flat = year1_flat[mask_valid].astype(int)
        year2_flat = year2_flat[mask_valid].astype(int)
        df = pd.DataFrame({"year1": year1_flat, "year2": year2_flat})

        transition_matrix = pd.crosstab(df["year1"], df["year2"]).round(2)
        transition_percent = (
            transition_matrix.div(transition_matrix.sum(axis=1), axis=0) * 100
        ).round(2)

        transition_matrix_lbl = apply_labels(transition_matrix, NLCD_LABELS)
        transition_percent_lbl = apply_labels(transition_percent, NLCD_LABELS)

        year1_re = reclassify(year1_band, RECLASS_DICT)
        year2_re = reclassify(year2_band, RECLASS_DICT)
        df_re = pd.DataFrame(
            {"year1_reclass": year1_re.flatten(), "year2_reclass": year2_re.flatten()}
        )

        transition_matrix_reclass = pd.crosstab(
            df_re["year1_reclass"], df_re["year2_reclass"]
        ).round(2)
        transition_percent_reclass = (
            transition_matrix_reclass.div(transition_matrix_reclass.sum(axis=1), axis=0)
            * 100
        ).round(2)

        transition_matrix_reclass_lbl = apply_reclass_labels(
            transition_matrix_reclass, RECLASS_LABELS
        )
        transition_percent_reclass_lbl = apply_reclass_labels(
            transition_percent_reclass, RECLASS_LABELS
        )

        # Long table logic
        records = []
        total_pix = df_re.shape[0]
        for i in range(0, 8):
            for j in range(0, 8):
                count = (
                    transition_matrix_reclass.loc[i, j]
                    if (
                        i in transition_matrix_reclass.index
                        and j in transition_matrix_reclass.columns
                    )
                    else 0
                )
                pct = (count / total_pix) * 100 if total_pix > 0 else 0
                label_simple = f"{RECLASS_NAMES.get(i)} to {RECLASS_NAMES.get(j)}"
                from_desc = RECLASS_LABELS.get(i, f"{i}-empty")
                to_desc = RECLASS_LABELS.get(j, f"{j}-empty")
                label_full = f"{from_desc} to {to_desc}"
                records.append(
                    [
                        i,
                        j,
                        label_simple,
                        from_desc,
                        to_desc,
                        label_full,
                        count,
                        round(pct, 4),
                    ]
                )

        df_reclass_long = pd.DataFrame(
            records,
            columns=[
                "From",
                "To",
                "Label",
                "From_description",
                "To_description",
                "Label_full",
                "Count",
                "Percent",
            ],
        )

        # Save Transition Results
        transition_path = os.path.join(results_dir, "NLCD_Transition_Tables.xlsx")
        transition_matrix_lbl.to_csv(
            os.path.join(results_dir, "NLCD_Transition_Tables_Original_Counts.csv"),
            index=True,
        )
        transition_percent_lbl.to_csv(
            os.path.join(results_dir, "NLCD_Transition_Tables_Original_Percent.csv"),
            index=True,
        )
        transition_matrix_reclass_lbl.to_csv(
            os.path.join(results_dir, "NLCD_Transition_Tables_Reclass_Counts.csv"),
            index=True,
        )
        transition_percent_reclass_lbl.to_csv(
            os.path.join(results_dir, "NLCD_Transition_Tables_Reclass_Percent.csv"),
            index=True,
        )
        df_reclass_long.to_csv(
            os.path.join(results_dir, "NLCD_Transition_Tables_Reclass_Transitions.csv"),
            index=False,
        )

        with pd.ExcelWriter(transition_path, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer,
                transition_matrix_lbl,
                "Original_Counts",
                "Original NLCD Land Cover Change Transition in Counts",
                keep_index=True,
            )
            write_excel_with_title(
                writer,
                transition_percent_lbl,
                "Original_Percent",
                "Original NLCD Land Cover Change Transition in Percent",
                keep_index=True,
            )
            write_excel_with_title(
                writer,
                transition_matrix_reclass_lbl,
                "Reclass_Counts",
                "Reclassified Land Cover Change Transition in Counts",
                keep_index=True,
            )
            write_excel_with_title(
                writer,
                transition_percent_reclass_lbl,
                "Reclass_Percent",
                "Reclassified Land Cover Change Transition in Percent",
                keep_index=True,
            )
            write_excel_with_title(
                writer,
                df_reclass_long,
                "Reclass_Transitions",
                "Full Reclassified Land Cover Change Transition Table",
                keep_index=False,
            )

        # ============================================================
        # === NORM & RANK / CHI-SQUARE / INTENSITY ===================
        # ============================================================
        # (Standard processing as per original script)

        # Norm/Rank
        norm_orig, rank_orig = normalize_and_rank(
            transition_matrix, label="Original", use_nlcd_labels=True
        )
        norm_re, rank_re = normalize_and_rank(
            transition_matrix_reclass, label="Reclassified", use_reclass_labels=True
        )

        norm_path = os.path.join(results_dir, "NLCD_Normalized_Ranked.xlsx")
        with pd.ExcelWriter(norm_path, engine="xlsxwriter") as writer:
            if norm_orig is not None:
                norm_orig.to_csv(
                    os.path.join(
                        results_dir, "NLCD_Normalized_Ranked_Norm_Original.csv"
                    ),
                    index=True,
                )
                rank_orig.to_csv(
                    os.path.join(
                        results_dir, "NLCD_Normalized_Ranked_Rank_Original.csv"
                    ),
                    index=False,
                )
                write_excel_with_title(
                    writer,
                    norm_orig,
                    "Norm_Original",
                    "Normalized Change Percentages (Original)",
                    keep_index=True,
                )
                write_excel_with_title(
                    writer,
                    rank_orig,
                    "Rank_Original",
                    "Ranked Change Intensities (Original)",
                    keep_index=False,
                )
            if norm_re is not None:
                norm_re.to_csv(
                    os.path.join(
                        results_dir, "NLCD_Normalized_Ranked_Norm_Reclass.csv"
                    ),
                    index=True,
                )
                rank_re.to_csv(
                    os.path.join(
                        results_dir, "NLCD_Normalized_Ranked_Rank_Reclass.csv"
                    ),
                    index=False,
                )
                write_excel_with_title(
                    writer,
                    norm_re,
                    "Norm_Reclass",
                    "Normalized Change Percentages (Reclassified)",
                    keep_index=True,
                )
                write_excel_with_title(
                    writer,
                    rank_re,
                    "Rank_Reclass",
                    "Ranked Change Intensities (Reclassified)",
                    keep_index=False,
                )

        # Chi-Square
        chi_orig = chi_square_summary(transition_matrix, use_nlcd_labels=True)
        chi_re = chi_square_summary(transition_matrix_reclass, use_reclass_labels=True)
        summary_re2 = chi_re["summary"].copy()
        summary_re2["ChiSquare"] = chi_re["chi2"]
        summary_re2 = summary_re2[
            [
                "From",
                "To",
                "From_description",
                "To_description",
                "Label",
                "ChiSquare",
                "Observed",
                "Expected",
                "StdResid",
                "Significance",
            ]
        ]

        chi_path = os.path.join(results_dir, "NLCD_ChiSquare_Results.xlsx")
        chi_orig["expected"].to_csv(
            os.path.join(results_dir, "NLCD_ChiSquare_Results_Expected_Original.csv"),
            index=True,
        )
        chi_orig["summary"].to_csv(
            os.path.join(results_dir, "NLCD_ChiSquare_Results_Summary_Original.csv"),
            index=False,
        )
        chi_re["expected"].to_csv(
            os.path.join(results_dir, "NLCD_ChiSquare_Results_Expected_Reclass.csv"),
            index=True,
        )
        chi_re["summary"].to_csv(
            os.path.join(results_dir, "NLCD_ChiSquare_Results_Summary_Reclass.csv"),
            index=False,
        )
        summary_re2.to_csv(
            os.path.join(results_dir, "NLCD_ChiSquare_Results_Summary_Reclass_2.csv"),
            index=False,
        )

        with pd.ExcelWriter(chi_path, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer,
                chi_orig["expected"],
                "Expected_Original",
                "Expected Transition Matrix (Original)",
                keep_index=True,
            )
            write_excel_with_title(
                writer,
                chi_orig["summary"],
                "Summary_Original",
                "Chi-square Summary (Original)",
                keep_index=False,
            )
            write_excel_with_title(
                writer,
                chi_re["expected"],
                "Expected_Reclass",
                "Expected Transition Matrix (Reclass)",
                keep_index=True,
            )
            write_excel_with_title(
                writer,
                chi_re["summary"],
                "Summary_Reclass",
                "Chi-square Summary (Reclass)",
                keep_index=False,
            )
            write_excel_with_title(
                writer,
                summary_re2,
                "Summary_Reclass_2",
                "Chi-square Summary with Global Statistic",
                keep_index=False,
            )

        # Intensity
        gain_o, loss_o, trans_o = land_change_intensity(transition_matrix)
        gain_r, loss_r, trans_r = land_change_intensity(transition_matrix_reclass)

        nlcd_label_map_full = {str(k): v for k, v in NLCD_LABELS.items()}
        reclass_label_map_full = {str(k): v for k, v in RECLASS_LABELS.items()}

        # Helper to apply labels quickly for Intensity tables
        for df_temp, map_ref in [
            (gain_o, nlcd_label_map_full),
            (loss_o, nlcd_label_map_full),
            (gain_r, reclass_label_map_full),
            (loss_r, reclass_label_map_full),
        ]:
            df_temp["Class_Label"] = (
                df_temp["Class"].astype(str).apply(lambda v: safe_label(map_ref, v))
            )

        trans_o["From_description"] = (
            trans_o["From"]
            .astype(str)
            .apply(lambda v: safe_label(nlcd_label_map_full, v))
        )
        trans_o["To_description"] = (
            trans_o["To"]
            .astype(str)
            .apply(lambda v: safe_label(nlcd_label_map_full, v))
        )
        trans_o["Transition_Label"] = trans_o.apply(
            lambda r: f"{r['From_description']} to {r['To_description']}", axis=1
        )

        trans_r["From_description"] = (
            trans_r["From"]
            .astype(str)
            .apply(lambda v: safe_label(reclass_label_map_full, v))
        )
        trans_r["To_description"] = (
            trans_r["To"]
            .astype(str)
            .apply(lambda v: safe_label(reclass_label_map_full, v))
        )
        trans_r["Transition_Label"] = trans_r.apply(
            lambda r: f"{r['From_description']} to {r['To_description']}", axis=1
        )

        intensity_path = os.path.join(results_dir, "NLCD_Intensity_Analysis.xlsx")
        gain_o.to_csv(
            os.path.join(results_dir, "NLCD_Intensity_Analysis_Gain_Original.csv"),
            index=False,
        )
        loss_o.to_csv(
            os.path.join(results_dir, "NLCD_Intensity_Analysis_Loss_Original.csv"),
            index=False,
        )
        trans_o.to_csv(
            os.path.join(
                results_dir, "NLCD_Intensity_Analysis_Transition_Original.csv"
            ),
            index=False,
        )
        gain_r.to_csv(
            os.path.join(results_dir, "NLCD_Intensity_Analysis_Gain_Reclass.csv"),
            index=False,
        )
        loss_r.to_csv(
            os.path.join(results_dir, "NLCD_Intensity_Analysis_Loss_Reclass.csv"),
            index=False,
        )
        trans_r.to_csv(
            os.path.join(results_dir, "NLCD_Intensity_Analysis_Transition_Reclass.csv"),
            index=False,
        )

        with pd.ExcelWriter(intensity_path, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer,
                gain_o,
                "Gain_Original",
                "Gain Intensity (Original)",
                keep_index=False,
            )
            write_excel_with_title(
                writer,
                loss_o,
                "Loss_Original",
                "Loss Intensity (Original)",
                keep_index=False,
            )
            write_excel_with_title(
                writer,
                trans_o,
                "Transition_Original",
                "Transition Intensity (Original)",
                keep_index=False,
            )
            write_excel_with_title(
                writer,
                gain_r,
                "Gain_Reclass",
                "Gain Intensity (Reclass)",
                keep_index=False,
            )
            write_excel_with_title(
                writer,
                loss_r,
                "Loss_Reclass",
                "Loss Intensity (Reclass)",
                keep_index=False,
            )
            write_excel_with_title(
                writer,
                trans_r,
                "Transition_Reclass",
                "Transition Intensity (Reclass)",
                keep_index=False,
            )

        # ============================================================
        # === VISUALIZATION (WITH REPROJECTION & BASEMAP) ============
        # ============================================================
        if HAS_MATPLOTLIB and year1_re.shape == year2_re.shape:
            try:
                # 1. Calculate basic change array
                landuse_change = (year1_re.astype(int) * 10) + year2_re.astype(int)
                from_class = landuse_change // 10
                to_class = landuse_change % 10
                from_class = np.where(
                    (from_class >= 1) & (from_class <= 7), from_class, 0
                )
                to_class = np.where((to_class >= 1) & (to_class <= 7), to_class, 0)

                # 2. Prepare colormap
                cmap_list = [(0, 0, 0, 0)]
                for i in range(1, 8):
                    cmap_list.append(mcolors.to_rgba(CLASS_COLORS[i]))
                cmap = mcolors.ListedColormap(cmap_list)
                norm = mcolors.BoundaryNorm(range(0, 9), cmap.N)

                # 3. Loop through classes to generate plots
                for target in range(1, 8):
                    mask_target = (to_class == target) & (from_class != target)
                    if np.count_nonzero(mask_target) == 0:
                        continue

                    # Create specific mask for this transition
                    out_arr = np.where(mask_target, from_class, 0).astype(
                        "uint8"
                    )  # Ensure type

                    # --- REPROJECTION LOGIC (To align with Contextily/Web Mercator) ---
                    src_crs = meta_year1["crs"]
                    src_transform = meta_year1["transform"]
                    src_height = meta_year1["height"]
                    src_width = meta_year1["width"]
                    # Calculate bounds of the source
                    src_bounds = array_bounds(src_height, src_width, src_transform)

                    # Destination: Web Mercator
                    dst_crs = "EPSG:3857"

                    # Calculate transform for destination
                    (
                        dst_transform,
                        dst_width,
                        dst_height,
                    ) = rasterio.warp.calculate_default_transform(
                        src_crs, dst_crs, src_width, src_height, *src_bounds
                    )

                    # Create destination array
                    arr_3857 = np.zeros((dst_height, dst_width), dtype=out_arr.dtype)

                    # Reproject
                    rasterio.warp.reproject(
                        source=out_arr,
                        destination=arr_3857,
                        src_transform=src_transform,
                        src_crs=src_crs,
                        dst_transform=dst_transform,
                        dst_crs=dst_crs,
                        resampling=rasterio.warp.Resampling.nearest,
                    )

                    # Calculate Extent for Plotting
                    left = dst_transform.c
                    right = left + dst_transform.a * dst_width
                    top = dst_transform.f
                    bottom = top + dst_transform.e * dst_height

                    # --- PLOTTING ---
                    fig, ax = plt.subplots(figsize=(10, 10))

                    # Set limits
                    ax.set_xlim(left, right)
                    ax.set_ylim(bottom, top)

                    # Add Basemap (OpenStreetMap via Contextily)
                    if HAS_CONTEXTILY:
                        try:
                            ctx.add_basemap(
                                ax,
                                crs=dst_crs,
                                source=ctx.providers.OpenStreetMap.Mapnik,
                            )
                        except Exception as ctx_err:
                            print(f"Contextily error: {ctx_err}")

                    # Plot the reprojected raster
                    ax.imshow(
                        arr_3857,
                        cmap=cmap,
                        norm=norm,
                        extent=[left, right, bottom, top],
                        interpolation="nearest",
                        alpha=0.8,  # Slight alpha to see map underneath if needed
                    )

                    # Legends & Titles
                    unique_vals = sorted([v for v in set(arr_3857.flatten()) if v != 0])
                    legend_handles = [
                        plt.Rectangle((0, 0), 1, 1, color=CLASS_COLORS.get(v, "gray"))
                        for v in unique_vals
                    ]
                    if legend_handles:
                        ax.legend(
                            legend_handles,
                            [LC_NAMES.get(v, str(v)) for v in unique_vals],
                            title="Land Class Before Transition",
                            loc="lower left",
                            bbox_to_anchor=(1.02, 0.1),
                        )

                    ax.set_title(
                        f"Land Cover Type Transition from Various Types to Land Use Type -  {LC_NAMES[target]} ({year1}–{year2})",
                        fontsize=16,
                    )

                    ax.axis("off")

                    plt.tight_layout()
                    plt.savefig(
                        os.path.join(
                            results_dir,
                            f"what_to_{LC_NAMES[target].replace(' ', '_')}.png",
                        ),
                        dpi=300,
                        bbox_inches="tight",
                    )
                    plt.close()

            except Exception as e:
                print(f"Viz error: {e}")
                import traceback

                traceback.print_exc()

        # Metadata
        metadata = {
            "analysis_date": datetime.now().isoformat(),
            "year1": year1,
            "year2": year2,
            "total_pixels": int(total_pix),
            "chi_square_original": chi_orig["chi2"],
            "chi_square_p_value_original": chi_orig["p"],
            "fragstats_status": "Success" if HAS_RPY2 else "Skipped (rpy2 missing)",
        }
        with open(os.path.join(results_dir, "analysis_metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)

        with open(os.path.join(results_dir, "input_polygon.geojson"), "w") as f:
            json.dump(geojson_data, f, indent=2)

        # ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(results_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    zf.write(file_path, os.path.relpath(file_path, results_dir))
        zip_buffer.seek(0)
        shutil.rmtree(output_dir, ignore_errors=True)

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=analysis_{year1}_{year2}.zip"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Analysis error: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "rpy2_installed": HAS_RPY2}


@app.get("/")
async def root():
    return {"name": "Land Cover Analysis API", "version": "1.1.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
