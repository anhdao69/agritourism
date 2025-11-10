// app/components/landing/search-bar.tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingSearchBar() {
  const [q, setQ] = useState("");
  const [when, setWhen] = useState<"today" | "weekend" | "any">("any");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (when !== "any") params.set("when", when);
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-3xl rounded-2xl border border-emerald-900/10 bg-white/80 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Try "pumpkin patch", "vineyard with music"...'
            className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 pr-28 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-900/40 text-sm">
            Search
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:w-[280px]">
          <button
            type="button"
            onClick={() => setWhen("today")}
            className={`rounded-xl px-3 py-2 text-sm font-medium border ${
              when === "today"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-900 border-emerald-900/15 hover:bg-emerald-50"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWhen("weekend")}
            className={`rounded-xl px-3 py-2 text-sm font-medium border ${
              when === "weekend"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-900 border-emerald-900/15 hover:bg-emerald-50"
            }`}
          >
            Weekend
          </button>
          <button
            type="button"
            onClick={() => setWhen("any")}
            className={`rounded-xl px-3 py-2 text-sm font-medium border ${
              when === "any"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-900 border-emerald-900/15 hover:bg-emerald-50"
            }`}
          >
            Anytime
          </button>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-white font-medium shadow-sm hover:bg-emerald-700"
        >
          Find places
        </button>
      </div>

      {/* quick chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {["U-pick apples", "Farm-stay", "Hayrides", "Wine tasting"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setQ(t)}
            className="rounded-full border border-emerald-900/15 bg-white px-3 py-1.5 text-emerald-900/80 hover:bg-emerald-50"
          >
            {t}
          </button>
        ))}
        <span className="text-emerald-900/40">·</span>
        <button
          type="button"
          onClick={() => setQ((s) => (s ? `${s} near me` : "near me"))}
          className="rounded-full border border-emerald-900/15 bg-white px-3 py-1.5 text-emerald-900/80 hover:bg-emerald-50"
        >
          Use my location
        </button>
      </div>
    </form>
  );
}
