"use client";

import React, { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Download, Loader, MapPin, AlertCircle, Check, Trash2, ArrowLeft, Info } from "lucide-react";

// Dynamically import the map component to avoid SSR issues
const DynamicOpenLayersField = dynamic(
  () => import("../components/DynamicOpenLayersField"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] flex items-center justify-center bg-emerald-50 rounded-lg text-emerald-700">
        <Loader className="w-5 h-5 animate-spin mr-2" /> Loading Map...
      </div>
    ),
  }
);

type AnalysisStatus = "idle" | "processing" | "success" | "error";

interface AnalysisState {
  status: AnalysisStatus;
  message: string;
  downloadUrl: string | null;
}

function AnalysisPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get project ID from URL
  const ombilSiteId = searchParams.get("ombilSiteId");
  
  // Build TIF URL based on project ID
  const tifUrl = ombilSiteId 
    ? `/tif_data/${ombilSiteId}_2024.tif`
    : "/map_4326.tif"; // Default fallback

  const [geojson, setGeojson] = useState<object | null>(null);
  const [year1, setYear1] = useState<string>("2010");
  const [year2, setYear2] = useState<string>("2024");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: "idle",
    message: "",
    downloadUrl: null,
  });

  // Available years for analysis
  const availableYears = [
    "2001", "2004", "2006", "2008", "2010", "2011", "2012",
    "2013", "2014", "2015", "2016", "2017", "2018", "2019",
    "2020", "2021", "2022", "2023", "2024"
  ];

  const handleGeoJSONChange = useCallback((value: object | null) => {
    setGeojson(value);
    // Reset analysis state when polygon changes
    if (analysisState.status !== "idle") {
      setAnalysisState({ status: "idle", message: "", downloadUrl: null });
    }
  }, [analysisState.status]);

  const handleClear = () => {
    setGeojson(null);
    setAnalysisState({ status: "idle", message: "", downloadUrl: null });
  };

    const goToVegetationForm = () => {
    // Build querystring so the vegetation form knows which project/years
    const params = new URLSearchParams();
    if (ombilSiteId) params.set("ombilSiteId", ombilSiteId);
    if (year1) params.set("year1", year1);
    if (year2) params.set("year2", year2);

    const qs = params.toString();
    router.push(`/form-veget${qs ? `?${qs}` : ""}`);
  };


  const handleSubmit = async () => {
    if (!geojson) {
      setAnalysisState({
        status: "error",
        message: "Please draw a polygon on the map first.",
        downloadUrl: null,
      });
      return;
    }

    if (year1 === year2) {
      setAnalysisState({
        status: "error",
        message: "Please select different years for comparison.",
        downloadUrl: null,
      });
      return;
    }

    setAnalysisState({
      status: "processing",
      message: "Processing your analysis request... This may take a few minutes.",
      downloadUrl: null,
    });

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          geojson,
          year1: parseInt(year1),
          year2: parseInt(year2),
          ombilSiteId: ombilSiteId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      setAnalysisState({
        status: "success",
        message: "Analysis complete! Click the button below to download your results.",
        downloadUrl,
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      setAnalysisState({
        status: "error",
        message: error.message || "An error occurred during analysis. Please try again.",
        downloadUrl: null,
      });
    }
  };

  const handleDownload = () => {
    if (analysisState.downloadUrl) {
      const a = document.createElement("a");
      a.href = analysisState.downloadUrl;
      a.download = `land_cover_analysis_${year1}_${year2}${ombilSiteId ? `_${ombilSiteId}` : ""}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const goBack = () => {
    router.push("/select-project");
  };

  return (
    <main className="min-h-screen bg-white relative">
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl p-6 sm:p-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">
                Land Cover Change Analysis
              </h1>
              <p className="text-sm text-emerald-900/70">
                Draw a polygon to analyze land cover changes between two years
              </p>
            </div>
          </div>
        </header>

        {/* Project Info Banner */}
        {ombilSiteId && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900">
                Analyzing Project: <span className="font-mono">{ombilSiteId}</span>
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                TIF overlay loaded from: <code className="px-1.5 py-0.5 rounded bg-white">{tifUrl}</code>
              </p>
            </div>
          </div>
        )}

        {/* Instructions Card */}
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h2 className="font-semibold text-emerald-900 mb-2">How to use:</h2>
          <ol className="list-decimal list-inside text-sm text-emerald-800 space-y-1">
            <li>Use the polygon tool (◇) on the map to draw around your area of interest</li>
            <li>Select the start and end years for comparison below</li>
            <li>Click "Run Analysis" to process the data</li>
            <li>Download your results as a ZIP file containing Excel reports and visualizations</li>
          </ol>
        </div>

        {/* Year Selection */}
        <div className="mb-6 rounded-2xl border border-emerald-900/10 bg-white/70 p-6 shadow-sm">
          <h2 className="font-semibold text-emerald-950 mb-4">Select Analysis Years</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-emerald-900 mb-2">
                Start Year (Before)
              </label>
              <select
                value={year1}
                onChange={(e) => setYear1(e.target.value)}
                className="w-full px-4 py-3 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-900 mb-2">
                End Year (After)
              </label>
              <select
                value={year2}
                onChange={(e) => setYear2(e.target.value)}
                className="w-full px-4 py-3 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {year1 === year2 && (
            <p className="mt-2 text-sm text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Please select different years for comparison
            </p>
          )}
        </div>

        {/* Map Component */}
        <div className="mb-6 rounded-2xl border border-emerald-900/10 bg-white/70 p-6 shadow-sm">
          <DynamicOpenLayersField
            field={{
              label: "Draw Analysis Area",
              required: true,
              defaultCenter: [-83.8926, 34.3056],
              defaultZoom: 8,
            }}
            value={geojson}
            onChange={handleGeoJSONChange}
            disabled={analysisState.status === "processing"}
            tifUrl={tifUrl}
          />
        </div>

        {/* GeoJSON Preview */}
        {geojson && (
          <div className="mb-6 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-emerald-950">Selected Area (GeoJSON)</h3>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
            <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto max-h-32 text-slate-700">
              {JSON.stringify(geojson, null, 2)}
            </pre>
          </div>
        )}

        {/* Status Messages */}
        {analysisState.status !== "idle" && (
          <div
            className={`mb-6 rounded-2xl border p-4 ${
              analysisState.status === "processing"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : analysisState.status === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {analysisState.status === "processing" && (
                <Loader className="w-5 h-5 animate-spin flex-shrink-0 mt-0.5" />
              )}
              {analysisState.status === "success" && (
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              {analysisState.status === "error" && (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm">{analysisState.message}</p>
                {analysisState.status === "processing" && (
                  <p className="text-xs mt-2 opacity-75">
                    Please don't close this page while processing...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSubmit}
            disabled={!geojson || analysisState.status === "processing" || year1 === year2}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg transition ${
              !geojson || analysisState.status === "processing" || year1 === year2
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl"
            }`}
          >
            {analysisState.status === "processing" ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Run Analysis
              </>
            )}
          </button>

          {analysisState.downloadUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition"
            >
              <Download className="w-5 h-5" />
              Download Results (ZIP)
            </button>
          )}

          {/* NEW: Next button to vegetation form */}
          <button
            type="button"
            onClick={goToVegetationForm}
            disabled={analysisState.status !== "success"}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg transition ${
              analysisState.status !== "success"
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-xl"
            }`}
          >
            Next: Vegetation Form
          </button>
        </div>


        {/* Output Description */}
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h2 className="font-semibold text-emerald-900 mb-2">Analysis Output Includes:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <ul className="list-disc list-inside text-sm text-emerald-800 space-y-1">
              <li>Cropped raster files for both years</li>
              <li>NLCD Transition Tables (Excel)</li>
              <li>Normalized and ranked change analysis</li>
              <li>Chi-square statistical analysis</li>
            </ul>
            <ul className="list-disc list-inside text-sm text-emerald-800 space-y-1">
              <li>Land change intensity analysis</li>
              <li>Visualization PNG images</li>
              <li>Input polygon (GeoJSON)</li>
              <li>Analysis metadata (JSON)</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="flex items-center gap-2 text-emerald-700">
          <Loader className="w-5 h-5 animate-spin" />
          Loading...
        </div>
      </div>
    }>
      <AnalysisPageContent />
    </Suspense>
  );
}