"use client";
import React from "react";
import Link from "next/link";

// Drop this at: components/auth/ui.tsx
// Then import in pages like: import { BgDecor, BrandAside, Alert, Spinner, ValueRow } from "../../components/auth/ui";
// If you use a route group like app/(auth)/register/page.tsx, use: import from "../../../components/auth/ui";

export function BgDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
    </div>
  );
}

export function BrandAside() {
  return (
    <aside className="hidden lg:flex flex-col justify-between p-10">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-semibold shadow-md">AG</div>
        <div>
          <p className="text-lg font-semibold text-emerald-900">Agritourism Directory</p>
          <p className="text-sm text-emerald-800/70">Find farms, orchards, vineyards & stays</p>
        </div>
      </header>
      <section className="space-y-6">
        <ValueRow title="Search what you love" desc="Pumpkin patches, wine tastings, farm-stays, u-pick." />
        <ValueRow title="Filter by season & amenities" desc="Open today, kid‑friendly, pet‑friendly, accessible." />
        <ValueRow title="Plan your route" desc="Pin places on the map and build a weekend trail." />
        <ValueRow title="For owners & editors" desc="Claim listings, post events, and keep info fresh." />
      </section>
      <footer className="text-sm text-emerald-900/70 flex gap-4">
        <Link href="/about" className="hover:underline">About</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:underline">Terms</Link>
      </footer>
    </aside>
  );
}

export function ValueRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
      <div>
        <p className="font-medium text-emerald-950">{title}</p>
        <p className="text-sm text-emerald-900/70">{desc}</p>
      </div>
    </div>
  );
}

export function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  const base = "rounded-xl px-4 py-3 mb-4 text-sm border";
  const t = type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-950";
  return <div role="status" className={`${base} ${t}`}>{message}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      {label && <span>{label}</span>}
    </span>
  );
}
