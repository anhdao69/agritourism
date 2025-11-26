// app/page.tsx
"use client";
import React from "react";
import Link from "next/link";

/* ---------- Helper UI bits ---------- */
const Container = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

const Pill = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
    {children}
  </span>
);

/* ---------- Data ---------- */
const FEATURES = [
  {
    key: "urban",
    title: "Urban Expansion",
    stats: "98% Accuracy",
    blurb:
      "Monitor rapid urbanization and calculate impervious surface changes over time in metropolitan areas.",
    cta: "Analyze Urban",
    img: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1600&auto=format&fit=crop", 
  },
  {
    key: "vegetation",
    title: "Vegetation Health",
    stats: "NDVI/EVI",
    blurb:
      "Track deforestation and crop health using multi-temporal spectral indices and change detection.",
    cta: "Analyze Forests",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop", 
  },
  {
    key: "water",
    title: "Water Resources",
    stats: "Real-time",
    blurb: "Detect shrinking water bodies, wetland loss, and coastline shifts using SAR and optical data.",
    cta: "Analyze Water",
    img: "https://images.unsplash.com/photo-1468581264429-2548ef9eb732?q=80&w=1600&auto=format&fit=crop", 
  },
  {
    key: "agri",
    title: "Agricultural Land",
    stats: "Crop Type",
    blurb:
      "Classify crop types and detect seasonal land use changes for agricultural yield estimation.",
    cta: "Analyze Crops",
    img: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1600&auto=format&fit=crop", 
  },
];

/* ---------- Main ---------- */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#eef6e6] text-slate-800 font-sans">
       {/* Global Header is injected by app/layout.tsx, so we don't need Navbar here */}
       <Hero />
       <FeaturesGrid />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section id="hero" className="relative w-full border-b border-slate-200">
      {/* Background Images */}
      <div className="absolute inset-0 -z-10">
        <div className="grid h-[500px] w-full grid-cols-3 gap-0 overflow-hidden md:h-[600px]">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2400&auto=format&fit=crop)",
            }}
          >
            <div className="h-full w-full bg-slate-900/30" />
          </div>
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2400&auto=format&fit=crop)",
            }}
          >
            <div className="h-full w-full bg-slate-900/30" />
          </div>
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1534274988754-c6a60bf93c6c?q=80&w=2400&auto=format&fit=crop)",
            }}
          >
            <div className="h-full w-full bg-slate-900/30" />
          </div>
        </div>
      </div>

      <Container className="relative">
        <div className="pt-16 md:pt-24 lg:pt-28">
          
          {/* ✅ High Contrast Container */}
          <div className="max-w-3xl rounded-2xl bg-slate-900/70 backdrop-blur-md border border-white/10 p-6 md:p-10 shadow-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-lg">
              Land Cover <br className="hidden md:block" />
              <span className="text-green-400">Change Detection</span>
            </h1>
            
            <p className="mt-6 text-lg leading-relaxed text-slate-100 font-medium drop-shadow-md max-w-2xl">
              Advanced geospatial analysis for monitoring environmental changes, 
              urbanization, and vegetation health using satellite imagery.
            </p>

            {/* Operational Status Line */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-green-100">
              <span className="flex items-center gap-2 bg-green-900/50 px-3 py-1 rounded-full border border-green-500/30">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                System Operational
              </span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="text-slate-200">Supports Sentinel-2 & Landsat</span>
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <Link 
                href="/select-project"
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-8 py-3.5 text-base font-bold text-white shadow-lg hover:bg-green-500 hover:shadow-green-900/20 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Start Analysis Project
              </Link>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}

/* ---------- Features Grid ---------- */
function FeaturesGrid() {
  return (
    <section id="features" className="py-10 md:py-16">
      <Container>
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Analysis Capabilities</h2>
            <p className="text-slate-600">Explore our core detection models available for immediate deployment.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key: id, ...props }) => (
            <FeatureCard key={id} {...props} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function FeatureCard({
  title,
  stats,
  blurb,
  cta,
  img,
}: {
  title: string;
  stats: string;
  blurb: string;
  cta: string;
  img: string;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-green-700/20 bg-white shadow-sm transition hover:shadow-lg hover:border-green-600 flex flex-col h-full">
      <div className="relative h-36 w-full overflow-hidden bg-slate-100 shrink-0">
        <img src={img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute top-2 left-2">
          <Pill className="bg-green-600 text-white shadow-sm">{title}</Pill>
        </div>
      </div>
      <div className="flex flex-col space-y-3 p-4 text-sm flex-1">
        <div className="text-xs text-slate-500 flex justify-between items-center border-b border-slate-100 pb-2">
          <span>Model Performance</span>
          <span className="font-bold text-green-700">{stats}</span>
        </div>
        <p className="leading-relaxed text-slate-600 grow">{blurb}</p>
        <div className="mt-auto pt-2">
          <Link href="/select-project" className="block w-full rounded-lg border border-green-700 text-green-700 hover:bg-green-50 text-center py-2 font-medium transition">
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}