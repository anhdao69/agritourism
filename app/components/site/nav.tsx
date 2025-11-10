// app/components/site/nav.tsx
import React from "react";
import Link from "next/link";
import Logo from "./logo";

export default function SiteNav() {
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between rounded-2xl border border-emerald-900/10 bg-white/70 backdrop-blur px-4 shadow-sm">
          <Link href="/" aria-label="Home" className="shrink-0">
            <Logo />
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/explore" className="text-emerald-900/80 hover:text-emerald-900">Explore</Link>
            <Link href="/owner" className="text-emerald-900/80 hover:text-emerald-900">For Owners</Link>
            <Link href="/about" className="text-emerald-900/80 hover:text-emerald-900">About</Link>
            <Link href="/admin" className="text-emerald-900/80 hover:text-emerald-900">Admin</Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl border border-emerald-900/15 bg-white px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-50"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              Create account
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
