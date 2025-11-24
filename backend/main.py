"""
FastAPI Backend for Land Cover Change Analysis

To run:
    pip install fastapi uvicorn rasterio geopandas numpy pandas scipy xlsxwriter matplotlib contextily
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import io
import json
import shutil
import tempfile
import zipfile
from datetime import datetime
from typing import Any, Dict

import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
from rasterio.mask import mask
from scipy.stats import chi2_contingency
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Optional imports for visualization
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
    import rasterio.warp

    HAS_CONTEXTILY = True
except ImportError:
    HAS_CONTEXTILY = False

try:
    from osgeo import gdal

    HAS_GDAL = True
except ImportError:
    HAS_GDAL = False

# Create FastAPI app
app = FastAPI(
    title="Land Cover Analysis API",
    description="Analyze NLCD land cover changes between two years",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# === HARDCODED PATHS (as per original code) =================
# ============================================================
BASE_PATH = "/Users/hoanganh692004/Desktop/geojson"

# ============================================================
# === NLCD LABEL DICTIONARIES ================================
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


# ============================================================
# === REQUEST MODEL ==========================================
# ============================================================


class AnalysisRequest(BaseModel):
    geojson: Dict[str, Any]
    year1: int
    year2: int


# ============================================================
# === HELPER FUNCTIONS =======================================
# ============================================================


def get_tif_path(year: int) -> str:
    """Get the path to the NLCD TIF file for a given year."""
    # Hardcoded path pattern matching original code
    path = os.path.join(
        BASE_PATH,
        f"Annual_NLCD_LndCov_{year}_CU_C1V1",
        f"Annual_NLCD_LndCov_{year}_CU_C1V1.tif",
    )

    if not os.path.exists(path):
        raise FileNotFoundError(f"NLCD TIF file not found: {path}")

    return path


def crop_raster_in_memory(raster_path: str, geoms: list):
    """Crop a raster to the given geometries."""
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
    """Apply labels to a transition matrix DataFrame."""
    df_new = df.copy()
    df_new.index = [label_dict.get(i, f"{i}-empty") for i in df.index]
    df_new.columns = [label_dict.get(j, f"{j}-empty") for j in df.columns]
    return df_new


def apply_reclass_labels(df: pd.DataFrame, label_dict: dict) -> pd.DataFrame:
    """Apply reclass labels to a transition matrix DataFrame."""
    df_new = df.copy()
    df_new.index = [label_dict.get(i, f"{i}-empty") for i in df.index]
    df_new.columns = [label_dict.get(j, f"{j}-empty") for j in df.columns]
    return df_new


def reclassify(arr: np.ndarray, mapping: dict) -> np.ndarray:
    """Reclassify array values according to mapping."""
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
    """Normalize transition matrix and create ranked table."""
    tm = transition_matrix.copy()
    np.fill_diagonal(tm.values, 0)

    total_changed = tm.sum().sum()
    if total_changed == 0:
        return None, None

    # (1) numeric percent matrix
    change_pct = ((tm / total_changed) * 100).round(2)

    # (2) melt BEFORE adding labels
    from_colname = "From"
    change_pct = change_pct.rename_axis(from_colname)

    flat = change_pct.reset_index().melt(
        id_vars=from_colname, var_name="To", value_name="Percent"
    )

    # Only numeric Percent
    flat = flat[flat["Percent"] > 0].sort_values("Percent", ascending=False)

    flat["Change_Class"] = pd.cut(
        flat["Percent"],
        bins=[0, 1, 10, 25, 100],
        labels=["Very Low", "Low", "Moderate", "High"],
    )

    # (3) NOW apply labels to Norm table
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

    # (4) Apply labels to Rank table
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

    # Final combined label
    if use_nlcd_labels or use_reclass_labels:
        flat["Label"] = flat.apply(
            lambda r: f"{r['From_description']} to {r['To_description']}", axis=1
        )

    return norm_labeled, flat


def chi_square_summary(
    tm: pd.DataFrame, use_nlcd_labels: bool = False, use_reclass_labels: bool = False
):
    """Run chi-square test and produce fully labeled expected and summary tables."""
    # Run chi-square using numeric matrix
    chi2, p, dof, exp = chi2_contingency(tm.values)

    # Build expected DF numerically first
    exp_df = pd.DataFrame(exp, index=tm.index, columns=tm.columns).round(2)

    # APPLY LABELS TO EXPECTED TABLE
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

    # Summary table (numeric indexing for exp array)
    row_labels = list(tm.index)
    col_labels = list(tm.columns)
    summary_rows = []

    for i in tm.index:
        for j in tm.columns:
            # Convert category to positional index
            i_pos = row_labels.index(i)
            j_pos = col_labels.index(j)
            expected_val = exp[i_pos][j_pos]

            # Pick correct labeling dictionary
            if use_nlcd_labels:
                f_label = NLCD_LABELS.get(int(i), f"{i}-unknown")
                t_label = NLCD_LABELS.get(int(j), f"{j}-unknown")
            elif use_reclass_labels:
                f_label = RECLASS_LABELS.get(int(i), f"{i}-unknown")
                t_label = RECLASS_LABELS.get(int(j), f"{j}-unknown")
            else:
                f_label = str(i)
                t_label = str(j)

            # Calculate standardized residual
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
    """Calculate land change intensity metrics."""
    M = tm.copy()
    np.fill_diagonal(M.values, 0)
    total = tm.values.sum()
    changed = M.values.sum()
    n = len(M)
    uniform = round((changed / n) / total * 100, 2) if total > 0 else 0

    # Gain & Loss
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

    # Transition intensities
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
    """Write DataFrame to Excel with title and description."""
    # Write the data frame starting at row 2
    df.to_excel(writer, sheet_name=sheet_name, startrow=2, index=keep_index)

    worksheet = writer.sheets[sheet_name]
    workbook = writer.book
    last_col = df.shape[1] - 1

    # Title format
    title_format = workbook.add_format(
        {"bold": True, "align": "center", "valign": "vcenter", "font_size": 14}
    )

    # Description format
    desc_format = workbook.add_format(
        {"text_wrap": True, "italic": True, "align": "left", "valign": "top"}
    )

    # SHEET TITLE (MERGED)
    worksheet.merge_range(0, 0, 0, last_col, title_text, title_format)

    # DESCRIPTION SECTION
    if description_text:
        # First empty row after the table
        desc_row = 2 + len(df) + 2
        # MERGE the entire row for description
        worksheet.merge_range(
            desc_row, 0, desc_row, last_col, description_text, desc_format
        )


def safe_label(map_dict, code):
    """Return 'id-label' format or '0-empty'."""
    code_str = str(code)
    return map_dict.get(code_str, f"{code_str}-empty")


# ============================================================
# === MAIN ANALYSIS ENDPOINT =================================
# ============================================================


@app.post("/api/analyze")
async def analyze(request: AnalysisRequest):
    """
    Perform land cover change analysis.

    Accepts a GeoJSON polygon and two years, returns a ZIP file with analysis results.
    """
    try:
        # Create temporary directory for output
        output_dir = tempfile.mkdtemp(prefix="nlcd_analysis_")
        results_dir = os.path.join(output_dir, "results")
        os.makedirs(results_dir, exist_ok=True)

        # Parse request
        geojson_data = request.geojson
        year1 = request.year1
        year2 = request.year2

        print(f"Starting analysis for years {year1} to {year2}")

        # ============================================================
        # === Load Polygon (GeoJSON) =================================
        # ============================================================

        # Create GeoDataFrame from GeoJSON
        if geojson_data.get("type") == "Feature":
            gdf = gpd.GeoDataFrame.from_features([geojson_data])
        elif geojson_data.get("type") == "FeatureCollection":
            gdf = gpd.GeoDataFrame.from_features(geojson_data.get("features", []))
        elif (
            geojson_data.get("type") == "Polygon"
            or geojson_data.get("type") == "MultiPolygon"
        ):
            # It's a geometry directly
            from shapely.geometry import shape

            gdf = gpd.GeoDataFrame(geometry=[shape(geojson_data)])
        else:
            raise HTTPException(status_code=400, detail="Invalid GeoJSON format")

        if gdf.empty:
            raise HTTPException(
                status_code=400, detail="GeoJSON contains no valid geometries"
            )

        # Get TIF paths
        try:
            tif_path_year1 = get_tif_path(year1)
            tif_path_year2 = get_tif_path(year2)
            print(f"TIF Year 1: {tif_path_year1}")
            print(f"TIF Year 2: {tif_path_year2}")
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

        # Match CRS with raster
        with rasterio.open(tif_path_year2) as src_temp:
            raster_crs = src_temp.crs

        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")

        if gdf.crs != raster_crs:
            print(f"Reprojecting GeoJSON from {gdf.crs} to {raster_crs}")
            gdf = gdf.to_crs(raster_crs)

        # Ensure valid geometry list
        geoms = [geom for geom in gdf.geometry if geom is not None]

        if len(geoms) == 0:
            raise HTTPException(
                status_code=400, detail="No valid geometries found in GeoJSON"
            )

        # ============================================================
        # === Crop Both Rasters ======================================
        # ============================================================

        print("Cropping Year 1 raster...")
        year1_data, meta_year1 = crop_raster_in_memory(tif_path_year1, geoms)

        print("Cropping Year 2 raster...")
        year2_data, meta_year2 = crop_raster_in_memory(tif_path_year2, geoms)

        print("Cropping finished. Arrays ready for analysis.")

        # Save cropped TIFFs
        out_tif_year1 = os.path.join(results_dir, f"crop_year1_{year1}.tif")
        out_tif_year2 = os.path.join(results_dir, f"crop_year2_{year2}.tif")

        print("Saving cropped rasters as GeoTIFF...")

        meta_y1 = meta_year1.copy()
        meta_y1.update({"driver": "GTiff", "count": 1})
        with rasterio.open(out_tif_year1, "w", **meta_y1) as dst:
            dst.write(year1_data[0], 1)

        meta_y2 = meta_year2.copy()
        meta_y2.update({"driver": "GTiff", "count": 1})
        with rasterio.open(out_tif_year2, "w", **meta_y2) as dst:
            dst.write(year2_data[0], 1)

        print(f"Cropped GeoTIFFs exported: {out_tif_year1}, {out_tif_year2}")

        # Extract bands for analysis
        year1_band = year1_data[0]
        year2_band = year2_data[0]

        print(f"Loaded rasters: {year1_band.shape}, {year2_band.shape}")

        # ============================================================
        # === Original Transition Matrix =============================
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

        # Apply NLCD Labels
        transition_matrix_lbl = apply_labels(transition_matrix, NLCD_LABELS)
        transition_percent_lbl = apply_labels(transition_percent, NLCD_LABELS)

        # ============================================================
        # === Reclassification =======================================
        # ============================================================

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

        # Apply Reclass Labels
        transition_matrix_reclass_lbl = apply_reclass_labels(
            transition_matrix_reclass, RECLASS_LABELS
        )
        transition_percent_reclass_lbl = apply_reclass_labels(
            transition_percent_reclass, RECLASS_LABELS
        )

        # ============================================================
        # === LONG TABLE WITH DESCRIPTIONS ===========================
        # ============================================================

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

        # ============================================================
        # === SAVE TO EXCEL WITH TITLES & SAVE TO CSV ================
        # ============================================================

        transition_path = os.path.join(results_dir, "NLCD_Transition_Tables.xlsx")
        print(f"Saving transition tables to {transition_path} and CSVs")

        # Save to CSVs with "ExcelName_SheetName.csv" convention
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

        # Save to Excel
        with pd.ExcelWriter(transition_path, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer,
                transition_matrix_lbl,
                "Original_Counts",
                "Original NLCD Land Cover Change Transition in Counts",
                keep_index=True,
                description_text="This matrix shows the absolute pixel transitions from each NLCD class (row) to another class (column) between Year 1 and Year 2.",
            )
            write_excel_with_title(
                writer,
                transition_percent_lbl,
                "Original_Percent",
                "Original NLCD Land Cover Change Transition in Percent",
                keep_index=True,
                description_text="Each cell shows the percentage of pixels that transitioned from the class in the row to the class in the column. Row values sum to 100 percent.",
            )
            write_excel_with_title(
                writer,
                transition_matrix_reclass_lbl,
                "Reclass_Counts",
                "Reclassified Land Cover Change Transition in Counts (1–7 Classes)",
                keep_index=True,
                description_text="Pixel transition counts after aggregating detailed NLCD classes into seven simplified land cover categories.",
            )
            write_excel_with_title(
                writer,
                transition_percent_reclass_lbl,
                "Reclass_Percent",
                "Reclassified Land Cover Change Transition in Percent (1–7 Classes)",
                keep_index=True,
                description_text="Percentage transitions for reclassified land cover categories, normalized by row totals, providing a comparative view of land cover shifts.",
            )
            write_excel_with_title(
                writer,
                df_reclass_long,
                "Reclass_Transitions",
                "Full Reclassified Land Cover Change Transition Table (Long Format)",
                keep_index=False,
                description_text="This table lists all reclassified land cover transitions, including pixel counts and percent of total pixels.",
            )

        # ============================================================
        # === NORMALIZED & RANKED ====================================
        # ============================================================

        # ORIGINAL (NLCD labels)
        norm_orig, rank_orig = normalize_and_rank(
            transition_matrix,
            label="Original",
            use_nlcd_labels=True,
            use_reclass_labels=False,
        )

        # RECLASS (1-water, 2-developed, etc.)
        norm_re, rank_re = normalize_and_rank(
            transition_matrix_reclass,
            label="Reclassified",
            use_nlcd_labels=False,
            use_reclass_labels=True,
        )

        norm_path = os.path.join(results_dir, "NLCD_Normalized_Ranked.xlsx")
        print(f"Saving normalized/ranked results to {norm_path} and CSVs")

        with pd.ExcelWriter(norm_path, engine="xlsxwriter") as writer:
            if norm_orig is not None:
                # CSV
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
                # Excel
                write_excel_with_title(
                    writer,
                    norm_orig,
                    "Norm_Original",
                    "Normalized Change Percentages (Original NLCD Classification)",
                    keep_index=True,
                    description_text="Each cell represents the percent of total changed pixels transitioning from the NLCD class listed in the row to the class in the column.",
                )
                write_excel_with_title(
                    writer,
                    rank_orig,
                    "Rank_Original",
                    "Ranked Change Intensities (Original NLCD Classification)",
                    keep_index=False,
                    description_text="This long-format table ranks all non-zero transitions by percent, grouped into Very Low, Low, Moderate, and High intensity categories.",
                )

            if norm_re is not None:
                # CSV
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
                # Excel
                write_excel_with_title(
                    writer,
                    norm_re,
                    "Norm_Reclass",
                    "Normalized Change Percentages (Reclassified)",
                    keep_index=True,
                    description_text="Normalized percent transitions between seven aggregated land cover categories, with rows summing to 100 percent.",
                )
                write_excel_with_title(
                    writer,
                    rank_re,
                    "Rank_Reclass",
                    "Ranked Change Intensities (Reclassified)",
                    keep_index=False,
                    description_text="Ranked list of all observed reclassified land cover transitions, including percent intensity and assigned intensity class.",
                )

        # ============================================================
        # === CHI-SQUARE ANALYSIS ====================================
        # ============================================================

        # ORIGINAL (NLCD labels)
        chi_orig = chi_square_summary(
            transition_matrix, use_nlcd_labels=True, use_reclass_labels=False
        )

        # RECLASSIFIED (1-water, etc.)
        chi_re = chi_square_summary(
            transition_matrix_reclass, use_nlcd_labels=False, use_reclass_labels=True
        )

        # Build Labeled Summary_Reclass_2
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
        print(f"Saving chi-square results to {chi_path} and CSVs")

        # Save to CSVs
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

        # Save to Excel
        with pd.ExcelWriter(chi_path, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer,
                chi_orig["expected"],
                "Expected_Original",
                "Expected Transition Matrix (Original NLCD Classification)",
                keep_index=True,
                description_text="The expected transition matrix shows the theoretical frequency of transitions between NLCD land cover classes under the null hypothesis of independence. Expected values are derived from row and column totals.",
            )
            write_excel_with_title(
                writer,
                chi_orig["summary"],
                "Summary_Original",
                "Chi-square Summary (Original NLCD Classification)",
                keep_index=False,
                description_text="This table lists all observed transitions alongside their expected values, standardized residuals, and significance classification. Cells with |StdResid| > 2 are considered significantly over- or under-represented transitions.",
            )
            write_excel_with_title(
                writer,
                chi_re["expected"],
                "Expected_Reclass",
                "Expected Transition Matrix (Reclassified)",
                keep_index=True,
                description_text="Expected transition counts for the reclassified land cover categories (1–7), computed under the assumption of independence. Row and column marginals determine the expected transition frequencies.",
            )
            write_excel_with_title(
                writer,
                chi_re["summary"],
                "Summary_Reclass",
                "Chi-square Summary (Reclassified)",
                keep_index=False,
                description_text="Summary of observed versus expected transitions for the reclassified land cover system, including standardized residuals and test-based significance for each pairwise transition.",
            )
            write_excel_with_title(
                writer,
                summary_re2,
                "Summary_Reclass_2",
                "Chi-square Summary with Global Statistic (Reclassified)",
                keep_index=False,
                description_text="This enhanced summary includes both pairwise transition statistics and the global chi-square statistic for the reclassified transition matrix, providing a comprehensive view of divergence from expected patterns under independence.",
            )

        # ============================================================
        # === LAND CHANGE INTENSITY ANALYSIS =========================
        # ============================================================

        gain_o, loss_o, trans_o = land_change_intensity(transition_matrix)
        gain_r, loss_r, trans_r = land_change_intensity(transition_matrix_reclass)

        # Apply labels
        nlcd_label_map_full = {str(k): v for k, v in NLCD_LABELS.items()}
        reclass_label_map_full = {str(k): v for k, v in RECLASS_LABELS.items()}

        # Original labels
        gain_o["Class_Label"] = (
            gain_o["Class"]
            .astype(str)
            .apply(lambda v: safe_label(nlcd_label_map_full, v))
        )
        gain_o = gain_o[["Class", "Class_Label", "Gain(%)", "Uniform(%)", "Status"]]

        loss_o["Class_Label"] = (
            loss_o["Class"]
            .astype(str)
            .apply(lambda v: safe_label(nlcd_label_map_full, v))
        )
        loss_o = loss_o[["Class", "Class_Label", "Loss(%)", "Uniform(%)", "Status"]]

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
            lambda row: f"{row['From_description']} to {row['To_description']}", axis=1
        )
        trans_o = trans_o[
            [
                "From",
                "To",
                "From_description",
                "To_description",
                "Transition_Label",
                "Intensity(%)",
            ]
        ]

        # Reclass labels
        gain_r["Class_Label"] = (
            gain_r["Class"]
            .astype(str)
            .apply(lambda v: safe_label(reclass_label_map_full, v))
        )
        gain_r = gain_r[["Class", "Class_Label", "Gain(%)", "Uniform(%)", "Status"]]

        loss_r["Class_Label"] = (
            loss_r["Class"]
            .astype(str)
            .apply(lambda v: safe_label(reclass_label_map_full, v))
        )
        loss_r = loss_r[["Class", "Class_Label", "Loss(%)", "Uniform(%)", "Status"]]

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
            lambda row: f"{row['From_description']} to {row['To_description']}", axis=1
        )
        trans_r = trans_r[
            [
                "From",
                "To",
                "From_description",
                "To_description",
                "Transition_Label",
                "Intensity(%)",
            ]
        ]

        intensity_path = os.path.join(results_dir, "NLCD_Intensity_Analysis.xlsx")
        print(f"Saving intensity analysis to {intensity_path} and CSVs")

        # Save to CSVs
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

        # Save to Excel
        with pd.ExcelWriter(intensity_path, engine="xlsxwriter") as writer:
            write_excel_with_title(
                writer,
                gain_o,
                "Gain_Original",
                "Gain Intensity (Original NLCD Classification)",
                keep_index=False,
                description_text="Gain intensity shows how strongly each NLCD class gains area relative to a uniform rate. Classes with Gain(%) > Uniform(%) are considered Active Gain categories.",
            )
            write_excel_with_title(
                writer,
                loss_o,
                "Loss_Original",
                "Loss Intensity (Original NLCD Classification)",
                keep_index=False,
                description_text="Loss intensity quantifies systematic loss for each NLCD land cover type. Classes with Loss(%) > Uniform(%) are Active Loss categories.",
            )
            write_excel_with_title(
                writer,
                trans_o,
                "Transition_Original",
                "Transition Intensity (Original NLCD Classification)",
                keep_index=False,
                description_text="Transition intensity shows percent-based flow from one NLCD class to another. Higher values indicate stronger directional change patterns between land cover categories.",
            )
            write_excel_with_title(
                writer,
                gain_r,
                "Gain_Reclass",
                "Gain Intensity (Reclassified)",
                keep_index=False,
                description_text="Gain intensity for the seven reclassified land cover categories. This helps identify which categories actively gained area beyond a uniform expectation.",
            )
            write_excel_with_title(
                writer,
                loss_r,
                "Loss_Reclass",
                "Loss Intensity (Reclassified)",
                keep_index=False,
                description_text="Loss intensity quantifies the degree to which reclassified land cover categories experienced systematic area reductions.",
            )
            write_excel_with_title(
                writer,
                trans_r,
                "Transition_Reclass",
                "Transition Intensity (Reclassified)",
                keep_index=False,
                description_text="Transition intensity summarizes directional land cover change among the seven aggregated categories, highlighting dominant land conversions.",
            )

        # ============================================================
        # === CREATE VISUALIZATIONS ==================================
        # ============================================================

        if HAS_MATPLOTLIB and year1_re.shape == year2_re.shape:
            print("Creating visualizations...")

            try:
                # Create Aggregated Land Use Change Raster
                landuse_change = (year1_re.astype(int) * 10) + year2_re.astype(int)

                change_arr = landuse_change
                from_class = change_arr // 10
                to_class = change_arr % 10

                # Clean invalid values
                from_class = np.where(
                    (from_class >= 1) & (from_class <= 7), from_class, 0
                )
                to_class = np.where((to_class >= 1) & (to_class <= 7), to_class, 0)

                # Create colormap
                cmap_list = [(0, 0, 0, 0)]  # Transparent for 0
                for i in range(1, 8):
                    cmap_list.append(mcolors.to_rgba(CLASS_COLORS[i]))
                cmap = mcolors.ListedColormap(cmap_list)
                norm = mcolors.BoundaryNorm(range(0, 9), cmap.N)

                # Create "what to target class" visualizations
                for target in range(1, 8):
                    # Identify pixels transitioning TO this target class
                    mask_target = (to_class == target) & (from_class != target)

                    # Skip if no transitions into this class
                    if np.count_nonzero(mask_target) == 0:
                        print(f"No transitions INTO {LC_NAMES[target]}, skipping PNG.")
                        continue

                    # Build raster
                    out_arr = np.where(mask_target, from_class, 0)

                    # Create figure
                    fig, ax = plt.subplots(figsize=(10, 8))
                    ax.imshow(out_arr, cmap=cmap, norm=norm, interpolation="nearest")

                    # Create legend
                    unique_vals = sorted([v for v in set(out_arr.flatten()) if v != 0])
                    legend_labels = [LC_NAMES.get(v, str(v)) for v in unique_vals]
                    legend_handles = [
                        plt.Rectangle((0, 0), 1, 1, color=CLASS_COLORS.get(v, "gray"))
                        for v in unique_vals
                    ]

                    if legend_handles:
                        ax.legend(
                            legend_handles,
                            legend_labels,
                            title="Land Class Before Transition",
                            loc="lower left",
                            bbox_to_anchor=(1.02, 0.1),
                        )

                    ax.set_title(
                        f"Land Cover Type Transition from Various Types to {LC_NAMES[target]} ({year1}–{year2})",
                        fontsize=14,
                    )
                    ax.axis("off")

                    plt.tight_layout()
                    png_path = os.path.join(
                        results_dir, f"what_to_{LC_NAMES[target].replace(' ', '_')}.png"
                    )
                    plt.savefig(png_path, dpi=300, bbox_inches="tight")
                    plt.close()

                    print(f"PNG created: {png_path}")

                print("All non-empty transitions processed successfully.")

            except Exception as e:
                print(f"Visualization error: {e}")
                import traceback

                traceback.print_exc()

        # ============================================================
        # === SAVE METADATA ==========================================
        # ============================================================

        metadata = {
            "analysis_date": datetime.now().isoformat(),
            "year1": year1,
            "year2": year2,
            "total_pixels": int(total_pix),
            "chi_square_original": chi_orig["chi2"],
            "chi_square_p_value_original": chi_orig["p"],
            "chi_square_reclass": chi_re["chi2"],
            "chi_square_p_value_reclass": chi_re["p"],
        }

        metadata_path = os.path.join(results_dir, "analysis_metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        # Save input GeoJSON
        geojson_path = os.path.join(results_dir, "input_polygon.geojson")
        with open(geojson_path, "w") as f:
            json.dump(geojson_data, f, indent=2)

        # ============================================================
        # === CREATE ZIP FILE ========================================
        # ============================================================

        print("Creating ZIP file...")
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(results_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_name = os.path.relpath(file_path, results_dir)
                    zf.write(file_path, arc_name)

        zip_buffer.seek(0)

        # Clean up temporary directory
        shutil.rmtree(output_dir, ignore_errors=True)

        print("Analysis complete!")

        # Return ZIP file
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
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Land Cover Analysis API",
        "version": "1.0.0",
        "base_path": BASE_PATH,
        "endpoints": {
            "POST /api/analyze": "Perform land cover change analysis",
            "GET /health": "Health check",
        },
    }


if __name__ == "__main__":
    import uvicorn

    print(f"Starting server with BASE_PATH: {BASE_PATH}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
