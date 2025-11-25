"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Save, FileSpreadsheet, ArrowLeft, Loader } from "lucide-react";
import * as XLSX from "xlsx"; // npm install xlsx

/** —— Helpers & types —— */
type Category = "Landscape Context" | "Size" | "Vegetation" | "Soils/Substrate" | "Hydrology";

type Q = {
  id: string;               // e.g. "L1"
  category: Category;
  label: string;            // short question label
  help?: string;            // brief description under label
  required?: boolean;
  // Optional per-score guidance. Key is the numeric choice (1..5).
  guidance?: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
};

// numeric (1..5) → textual rating
function ratingFromScore(s: number) {
  if (s >= 4.5) return "Sustainable+ (A)";
  if (s >= 3.5) return "Sustainable (B)";
  if (s >= 2.5) return "Transitioning (C)";
  if (s >= 1.75) return "Degraded (D)";
  return "Very Degraded (E)";
}

const CAT_ORDER: Category[] = [
  "Landscape Context",
  "Size",
  "Vegetation",
  "Soils/Substrate",
  "Hydrology",
];

/** —— Questions —— */
const QUESTIONS: Q[] = [
  // LANDSCAPE CONTEXT
  {
    id: "L1",
    category: "Landscape Context",
    label: "L1. Landscape Connectivity",
    help: "Percent of unaltered habitat around the polygon (see area-of-analysis rules).",
    required: true,
    guidance: {
      5: "Intact: 90–100% natural habitat; connectivity is high.",
      4: "Variegated: 60–90% natural habitat; generally high connectivity.",
      3: "Fragmented: 20–60% natural habitat; connectivity generally low.",
      1: "Relictual: <20% natural habitat; connectivity absent.",
    },
  },
  {
    id: "L2",
    category: "Landscape Context",
    label: "L2. Surrounding Land Use (Index)",
    help: "Compute Land Use Index over the specified landscape area (see worksheet).",
    required: true,
    guidance: {
      5: "Index 0.95–1.0",
      4: "Index 0.80–0.94",
      3: "Index 0.40–0.79",
      1: "Index < 0.40",
    },
  },
  {
    id: "L3",
    category: "Landscape Context",
    label: "L3. Landscape Stressors Checklist",
    help: "Use LANDSCAPE CONTEXT checklist. Field value is [total (# significant)].",
    required: true,
    guidance: {
      5: "No stressors listed.",
      4: "1–3 stressors; none significant (<10% area).",
      3: "2–4 stressors; 1–2 significant (>10% area).",
      1: ">4 stressors; ≥2 significant (>10% area).",
    },
  },
  {
    id: "L4a",
    category: "Landscape Context",
    label: "L4a. Buffer Length (wetlands, optional)",
    help: "Percent of occurrence perimeter with buffer.",
    required: false,
    guidance: {
      5: ">75–100% perimeter buffered",
      4: "50–74%",
      3: "25–49%",
      1: "<25%",
    },
  },
  {
    id: "L4b",
    category: "Landscape Context",
    label: "L4b. Buffer Width (wetlands, optional)",
    help: "Average buffer width (m), slope-adjusted.",
    required: false,
    guidance: {
      5: ">200 m",
      4: "100–199 m",
      3: "50–99 m",
      2: "10–49 m",
      1: "<10 m",
    },
  },

  // SIZE
  {
    id: "Z1",
    category: "Size",
    label: "Z1. Patch Size",
    help: "Current size (ha) of contiguous patch for the NVC Class.",
    required: true,
    guidance: {
      5: ">1,000 ha",
      4: "100–999 ha",
      3: "10–99 ha",
      1: "<10 ha",
    },
  },
  {
    id: "Z2",
    category: "Size",
    label: "Z2. Patch Size Condition",
    help: "Naturalness of current overall vegetation patch extent vs. original.",
    required: true,
    guidance: {
      5: "At/minimally changed (<5%).",
      4: "Modestly changed (5–20%).",
      3: "Substantially changed (20–50%).",
      1: "Heavily changed (>50%).",
    },
  },

  // VEGETATION
  {
    id: "V1",
    category: "Vegetation",
    label: "V1. Vegetation Structure",
    help: "Overall structural complexity vs. reference (density, stem size, canopy).",
    required: true,
  },
  {
    id: "V2",
    category: "Vegetation",
    label: "V2. Invasive Exotic Plants",
    help: "Percent cover / mapped overlap / county presence of key invasive species.",
    required: true,
    guidance: {
      5: "No key invasives present (or county data shows none).",
      4: "1–2% cover (or 1 key invasive at county level).",
      3: "3–5% cover, or mapped overlap, or 2–3 county species.",
      2: "5–25% cover, or >10% mapped overlap, or 4–5 county species.",
      1: ">25% cover, or >25% mapped overlap, or >5 county species.",
    },
  },
  {
    id: "V3",
    category: "Vegetation",
    label: "V3. Vegetation Composition",
    help: "Species composition/diversity of dominant layer; diseases/mortality evidence.",
    required: true,
    guidance: {
      5: "At/close to reference; exotics low; some indicators may be absent.",
      3: "Differs from reference but largely native; exotics common, not dominant.",
      1: "Severely altered; exotics dominate / planted non-characteristic / indicators absent.",
    },
  },
  {
    id: "V4",
    category: "Vegetation",
    label: "V4. Relative % Cover of Native Plant Species (optional)",
    help: "Relative % cover of native species vs. total vegetation cover.",
    required: false,
    guidance: {
      5: ">95%",
      4: "80–94%",
      3: "50–79%",
      1: "<50%",
    },
  },
  {
    id: "V5",
    category: "Vegetation",
    label: "V5. Vegetation Stressors Checklist",
    help: "Use VEGETATION (BIOTIC CONDITION) checklist. Field value is [total (# significant)].",
    required: true,
    guidance: {
      5: "No stressors listed.",
      4: "1–3 stressors; none significant (<10%).",
      3: "2–4 stressors; 1–2 significant (>10%).",
      1: ">4 stressors; ≥2 significant (>10%).",
    },
  },

  // SOIL / SUBSTRATE
  {
    id: "S1",
    category: "Soils/Substrate",
    label: "S1. Soil/Substrate Condition",
    help: "Physical disturbances (filling, grading, plowing, pugging, vehicle use, dredging…).",
    required: true,
    guidance: {
      5: "No apparent soil surface modifications.",
      4: "Past but recovered OR recent minor.",
      3: "Recovering OR recent moderate.",
      1: "Recent severe modifications.",
    },
  },
  {
    id: "S2",
    category: "Soils/Substrate",
    label: "S2. On-Site Land Use (Index)",
    help: "Use Land Use Index worksheet.",
    required: true,
    guidance: {
      5: "Index 0.95–1.0",
      4: "Index 0.80–0.95",
      3: "Index 0.40–0.80",
      1: "Index < 0.40",
    },
  },
  {
    id: "S3",
    category: "Soils/Substrate",
    label: "S3. Soils/Substrate Stressors Checklist",
    help: "Use SOIL / SUBSTRATE checklist. Field value is [total (# significant)].",
    required: true,
    guidance: {
      5: "No stressors listed.",
      4: "1–3 stressors; none significant (<10%).",
      3: "2–4 stressors; 1–2 significant (>10%).",
      1: ">4 stressors; ≥2 significant (>10%).",
    },
  },

  // HYDROLOGY
  {
    id: "H1n",
    category: "Hydrology",
    label: "H1-n. Hydrologic Alterations (non-riparian)",
    help: "Dikes, diversions, ditches, flow additions, pugging, fill, wells, etc. within assessment area.",
    required: true,
    guidance: {
      5: "No alterations present.",
      4: "Low intensity (e.g., small ditches <1 ft, few wells, roads at grade).",
      3: "Moderate intensity (e.g., 1–3 ft ditches, low dikes, culverted roads).",
      1: "High intensity (e.g., >3 ft ditches/diversions, large fill, heavy pumping).",
    },
  },
  {
    id: "H1r",
    category: "Hydrology",
    label: "H1-r. Floodplain Interactions (riparian)",
    help: "Degree flooding interactions/geomorphic floodplain structure impacted.",
    required: true,
    guidance: {
      5: "Within natural range; no geomorphic modification.",
      4: "Few modifications; ≤20% streambanks affected.",
      3: "Highly disrupted; 20–50% streambanks affected.",
      1: "Complete modification; >50% streambanks affected.",
    },
  },
  {
    id: "H2r",
    category: "Hydrology",
    label: "H2-r. Upstream Surface Water Retention (riparian)",
    help: "Percent of contributing watershed draining to storage facilities.",
    required: true,
    guidance: {
      5: "<5% drains to storage",
      4: ">5–20%",
      3: ">20–50%",
      1: ">50%",
    },
  },
  {
    id: "H3r",
    category: "Hydrology",
    label: "H3-r. Upstream/On-Site Water Diversion (riparian)",
    help: "Number/impact of diversions/wells relative to watershed; onsite/downstream impacts.",
    required: true,
    guidance: {
      5: "No upstream/onsite/nearby downstream diversions or wells.",
      4: "Few/minor impacts relative to watershed size.",
      3: "Many/moderate impacts; major local effects.",
      1: "Numerous/high impacts; drastically altered local hydrology.",
    },
  },
  {
    id: "H4",
    category: "Hydrology",
    label: "H4. Hydrologic Stressors Checklist",
    help: "Use HYDROLOGY checklist. Field value is [total (# significant)].",
    required: true,
    guidance: {
      5: "No stressors listed.",
      4: "1–3 stressors; none significant (<10%).",
      3: "2–4 stressors; 1–2 significant (>10%).",
      1: ">4 stressors; ≥2 significant (>10%).",
    },
  },
];

/** —— Page —— */
export default function VegetFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ombilSiteId = searchParams.get("ombilSiteId") || "";

  // 1. Scoring State
  const [answers, setAnswers] = useState<Record<string, number | null>>(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, null]))
  );

  // 2. Metadata State (User Input)
  const [metadata, setMetadata] = useState({
    siteId: ombilSiteId,
    observerName: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // 3. UI State
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync URL ID to state if available
  useEffect(() => {
    if (ombilSiteId) {
      setMetadata((prev) => ({ ...prev, siteId: ombilSiteId }));
    }
  }, [ombilSiteId]);

  // Calculations
  const byCategory = useMemo(() => {
    const map = new Map<Category, Q[]>();
    CAT_ORDER.forEach((c) => map.set(c, []));
    QUESTIONS.forEach((q) => map.get(q.category)!.push(q));
    return map;
  }, []);

  const sectionStats = useMemo(() => {
    const res: Record<
      Category,
      { average: number | null; rating: string | null }
    > = {} as any;

    for (const cat of CAT_ORDER) {
      const qs = byCategory.get(cat)!;
      const vals = qs
        .map((q) => answers[q.id])
        .filter((v): v is number => Number.isFinite(v as number));
      if (vals.length === 0) {
        res[cat] = { average: null, rating: null };
      } else {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        res[cat] = { average: avg, rating: ratingFromScore(avg) };
      }
    }
    return res;
  }, [answers, byCategory]);

  const overall = useMemo(() => {
    const vals = Object.values(answers).filter(
      (v): v is number => Number.isFinite(v as number)
    );
    if (vals.length === 0) return { average: null, rating: null };
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { average: avg, rating: ratingFromScore(avg) };
  }, [answers]);

  function setAnswer(id: string, val: number) {
    setAnswers((s) => ({ ...s, [id]: val }));
  }

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMetadata({ ...metadata, [e.target.name]: e.target.value });
  };

  // --- SAVE LOGIC ---
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedMsg(null);
    setErrorMsg(null);

    // Validate Scores
    const missing = QUESTIONS.filter(
      (q) => q.required && !Number.isFinite(answers[q.id] as number)
    );
    if (missing.length) {
      setErrorMsg(
        `Please answer all required items: ${missing.map((m) => m.id).join(", ")}`
      );
      return;
    }

    setSubmitting(true);
    try {
      // Create a flat object combining everything for saving
      const payload = {
        ...metadata,
        ...answers,
        overallRating: overall.rating,
        overallScore: overall.average,
        // Add section averages for the record
        landscapeAvg: sectionStats["Landscape Context"].average,
        sizeAvg: sectionStats["Size"].average,
        vegAvg: sectionStats["Vegetation"].average,
        soilAvg: sectionStats["Soils/Substrate"].average,
        hydroAvg: sectionStats["Hydrology"].average,
      };

      const res = await fetch("/api/form-veget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to submit.");

      setSubmittedMsg(`Saved successfully! File: ${json.file}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- DOWNLOAD EXCEL LOGIC ---
  const handleDownloadExcel = () => {
    try {
      const flatData = {
        "Site ID": metadata.siteId,
        "Date": metadata.date,
        "Observer": metadata.observerName,
        "Notes": metadata.notes,
        "Overall Rating": overall.rating,
        "Overall Score": overall.average?.toFixed(2),
        ...answers, // Spreads L1: 5, L2: 3, etc.
      };

      const ws = XLSX.utils.json_to_sheet([flatData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ecological Data");
      
      const fileName = `Eco_Assessment_${metadata.siteId || "Unknown"}_${metadata.date}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error(e);
      alert("Error generating Excel file.");
    }
  };

  return (
    <main className="min-h-screen bg-[#eef6e6] text-slate-800 relative">
       {/* Background Decor */}
       <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-4 text-emerald-700 hover:text-emerald-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-900">
            Vegetation & Ecological Integrity Form
          </h1>
          <p className="text-sm text-emerald-900/70">
            Record ground truth data for the analyzed area.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-8">
          
          {/* --- NEW: Metadata Section --- */}
          <section className="rounded-2xl border border-emerald-900/15 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-emerald-950 mb-4 border-b border-emerald-100 pb-2">
              Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">Site / Project ID</label>
                <input 
                  name="siteId"
                  value={metadata.siteId}
                  onChange={handleMetadataChange}
                  className="w-full rounded-lg border border-emerald-200 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. OMB-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">Observer Name</label>
                <input 
                  name="observerName"
                  value={metadata.observerName}
                  onChange={handleMetadataChange}
                  className="w-full rounded-lg border border-emerald-200 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">Date</label>
                <input 
                  type="date"
                  name="date"
                  value={metadata.date}
                  onChange={handleMetadataChange}
                  className="w-full rounded-lg border border-emerald-200 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-emerald-900 mb-1">General Notes</label>
                <textarea 
                  name="notes"
                  rows={2}
                  value={metadata.notes}
                  onChange={handleMetadataChange}
                  className="w-full rounded-lg border border-emerald-200 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Weather conditions, access issues, general observations..."
                />
              </div>
            </div>
          </section>

          {/* --- Existing Questions Section --- */}
          {CAT_ORDER.map((cat) => {
            const qs = byCategory.get(cat)!;
            return (
              <section key={cat} className="rounded-2xl border border-emerald-900/15 bg-white/80 shadow-sm">
                <div className="border-b border-emerald-900/10 px-4 py-3 bg-emerald-50/50 rounded-t-2xl">
                  <h2 className="text-lg font-semibold text-emerald-950">{cat}</h2>
                  <div className="text-xs text-emerald-900/70">
                    {sectionStats[cat].average != null ? (
                      <>
                        Avg:{" "}
                        <b>{sectionStats[cat].average.toFixed(2)}</b> · Rating:{" "}
                        <b>{sectionStats[cat].rating}</b>
                      </>
                    ) : (
                      <>No responses yet.</>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-emerald-900/10">
                  {qs.map((q) => {
                    const val = answers[q.id];
                    return (
                      <div key={q.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <label className="block font-medium text-emerald-950">
                              {q.label}{" "}
                              {q.required && <span className="text-red-600">*</span>}
                            </label>
                            {q.help && (
                              <p className="mt-1 max-w-3xl text-sm text-emerald-900/75">
                                {q.help}
                              </p>
                            )}
                          </div>
                          {q.guidance && (
                            <details className="text-xs group">
                              <summary className="cursor-pointer text-emerald-700 hover:underline list-none flex items-center gap-1">
                                <span className="bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">i</span> 
                                Guidance
                              </summary>
                              <div className="mt-2 absolute z-10 bg-white border border-emerald-200 p-3 rounded-lg shadow-lg max-w-sm text-emerald-800">
                                {[5,4,3,2,1].map((k) =>
                                  q.guidance![k as 1|2|3|4|5] ? (
                                    <div key={k} className="mb-1 last:mb-0">
                                      <b className="text-emerald-600">{k}</b> – {q.guidance![k as 1|2|3|4|5]}
                                    </div>
                                  ) : null
                                )}
                              </div>
                            </details>
                          )}
                        </div>

                        {/* Radios 1..5 */}
                        <div className="mt-3 grid grid-cols-5 gap-2 sm:max-w-md">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <label
                              key={n}
                              className={`flex items-center justify-center rounded-xl border px-3 py-2 text-sm cursor-pointer transition shadow-sm ${
                                val === n
                                  ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200"
                                  : "bg-white text-emerald-900 border-emerald-900/20 hover:bg-emerald-50"
                              }`}
                              title={`Choose ${n}`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={n}
                                checked={val === n}
                                onChange={() => setAnswer(q.id, n)}
                                className="sr-only"
                              />
                              {n}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Overall summary */}
          <section className="rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-emerald-950">Overall Score</h3>
              <p className="text-sm text-emerald-900/70">
                {overall.average != null ? (
                  <>
                    Average: <b className="text-lg">{overall.average.toFixed(2)}</b> · Rating:{" "}
                    <b className="text-lg text-emerald-700">{overall.rating}</b>
                  </>
                ) : (
                  <>Answer items to calculate score.</>
                )}
              </p>
            </div>
          </section>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 font-medium">
              {errorMsg}
            </div>
          )}
          {submittedMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 font-medium">
              {submittedMsg}
            </div>
          )}

          <div className="sticky bottom-4 z-10 bg-white/90 backdrop-blur p-4 rounded-2xl border border-emerald-100 shadow-lg flex flex-wrap items-center justify-between gap-4">
             <div className="text-xs text-emerald-900/60 hidden sm:block">
              Legend: 5=A (Best) ... 1=E (Worst)
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAnswers(Object.fromEntries(QUESTIONS.map((q) => [q.id, null])))}
                className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-emerald-50 transition"
              >
                Clear Form
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 rounded-xl border border-emerald-600 text-emerald-700 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-emerald-50 transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Excel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {submitting ? "Saving..." : "Save Data"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}