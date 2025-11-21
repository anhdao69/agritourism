"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, ChevronRight, Loader, AlertCircle } from "lucide-react";

type Row = Record<string, string>;

function parseCSVorTSV(text: string): Row[] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = first.includes("\t") ? "\t" : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(delim).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(delim);
    const obj: Row = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
}

export default function SelectProjectForAnalysisPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Row | null>(null);
  const [hi, setHi] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // load /public/data/projects.csv
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/data/projects.csv", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = await res.text();
        if (!alive) return;
        setRows(parseCSVorTSV(txt));
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load projects.csv");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Columns - using ombilSiteId as primary identifier
  const idKey = "ombilSiteId";
  const nameKey = useMemo(() => {
    const sample = rows[0] ?? {};
    return (
      (("projectName" in sample) && "projectName") ||
      (("featureName" in sample) && "featureName") ||
      (("foundationalName" in sample) && "foundationalName") ||
      Object.keys(sample).find((k) => /name/i.test(k)) ||
      Object.keys(sample).find((k) => !/id|code|uid|objectid/i.test(k)) ||
      "projectName"
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows.slice(0, 50);
    return rows
      .filter(
        (r) =>
          String(r[nameKey] ?? "").toLowerCase().includes(s) ||
          String(r[idKey] ?? "").toLowerCase().includes(s)
      )
      .slice(0, 50);
  }, [rows, q, nameKey, idKey]);

  const apply = (r: Row) => {
    setSel(r);
    setQ(r[nameKey] || r[idKey] || "");
    setOpen(false);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, filtered.length - 1));
      listRef.current?.children[Math.min(hi + 1, filtered.length - 1)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
      listRef.current?.children[Math.max(hi - 1, 0)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[hi];
      if (pick) apply(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const goNext = () => {
    const ombilSiteId = String(sel?.[idKey] ?? "").trim();
    if (!ombilSiteId) {
      alert("Please select a project with a valid ombilSiteId.");
      return;
    }
    // Navigate to analysis page with the ombilSiteId as a query parameter
    router.push(`/analysis?ombilSiteId=${encodeURIComponent(ombilSiteId)}`);
  };

  return (
    <main className="min-h-screen bg-white relative">
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-6 bg-white border border-emerald-100 rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-emerald-950">
                Land Cover Change Analysis
              </h1>
              <p className="text-sm text-emerald-900/70">
                Select a project to analyze
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h2 className="font-medium text-emerald-900 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Step 1: Select Your Project
            </h2>
            <p className="text-sm text-emerald-800">
              Search for your project by name or <code className="px-1.5 py-0.5 rounded bg-white text-emerald-700 text-xs">ombilSiteId</code>.
              The corresponding land cover data will be loaded on the map.
            </p>
          </div>

          {/* Search Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-emerald-900">
              Search Projects
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {loading ? (
                  <Loader className="h-5 w-5 text-emerald-400 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-emerald-400" />
                )}
              </div>
              <input
                className="w-full border-2 border-emerald-300 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                placeholder={loading ? "Loading projects..." : "Type to search by name or ID..."}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(null);
                  setOpen(true);
                  setHi(0);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                onKeyDown={onKeyDown}
                aria-autocomplete="list"
                aria-expanded={open}
                role="combobox"
                disabled={loading}
              />

              {open && !loading && (
                <ul
                  ref={listRef}
                  className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-emerald-200 bg-white shadow-lg"
                  role="listbox"
                >
                  {filtered.length === 0 && (
                    <li className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No matches found
                    </li>
                  )}
                  {filtered.map((r, i) => {
                    const active = i === hi;
                    return (
                      <li
                        key={`${r[idKey]}-${i}`}
                        className={`px-4 py-3 cursor-pointer transition ${
                          active ? "bg-emerald-50" : "hover:bg-emerald-50/50"
                        }`}
                        onMouseEnter={() => setHi(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          apply(r);
                        }}
                        role="option"
                        aria-selected={active}
                      >
                        <div className="font-medium text-emerald-900">
                          {r[nameKey] || "(unnamed)"}
                        </div>
                        <div className="text-xs text-emerald-600 mt-0.5">
                          ID: <span className="font-mono font-medium">{r[idKey] || "—"}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Error Message */}
          {err && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-900">Error loading projects</p>
                <p className="text-sm text-rose-700 mt-1">{err}</p>
              </div>
            </div>
          )}

          {/* Selected Project Display */}
          {sel && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-900">Selected Project:</p>
                  <p className="text-lg font-semibold text-emerald-950 mt-1">
                    {sel[nameKey] || "(unnamed)"}
                  </p>
                  <p className="text-sm text-emerald-700 mt-1 font-mono">
                    ID: {sel[idKey]}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <p className="text-xs text-emerald-700">
                  TIF overlay: <code className="px-1.5 py-0.5 rounded bg-white">/tif_data/{sel[idKey]}_2024.tif</code>
                </p>
              </div>
            </div>
          )}

          {/* Next Button */}
          <button
            className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 bg-emerald-600 text-white font-semibold shadow-lg hover:bg-emerald-700 hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={goNext}
            disabled={!sel}
          >
            Continue to Analysis
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Help Text */}
          <p className="text-xs text-emerald-600 text-center">
            After selecting a project, you'll be able to draw a polygon on the map
            and run land cover change analysis between two years.
          </p>
        </div>
      </div>
    </main>
  );
}