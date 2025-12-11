// app/llm-analysis/page.tsx
"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

function LlmAnalysisContent() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get("ombilSiteId") || "Unknown Site";
  const year1 = searchParams.get("year1") || "2010";
  const year2 = searchParams.get("year2") || "2024";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        
        {/* Header */}
        <header className="mb-8">
          <Link 
            href={`/form-veget?ombilSiteId=${siteId}&year1=${year1}&year2=${year2}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Form
          </Link>
          
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">AI Land Analysis</h1>
              <p className="text-slate-600 mt-1">
                Generating insights for <span className="font-mono font-semibold text-indigo-700">{siteId}</span> 
                {' '}between <span className="font-semibold">{year1}</span> and <span className="font-semibold">{year2}</span>.
              </p>
            </div>
          </div>
        </header>

        {/* Placeholder for Analysis Content */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Ready to Analyze</h2>
            <p className="text-slate-500 mb-6">
              This page is ready to connect to the LLM using the provided CSV data prompts.
            </p>
            <button className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-md">
              Run Full Analysis
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}

export default function LlmAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading analysis...</div>}>
      <LlmAnalysisContent />
    </Suspense>
  );
}