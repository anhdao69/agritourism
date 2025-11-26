// app/components/site/header.tsx
"use client";

import Link from "next/link";
import React from "react";
import { useSession, signOut } from "next-auth/react";

const Container = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

export default function SiteHeader() {
  const { data } = useSession();
  const user: any = data?.user;
  const isStaff = user && (user.role === "ADMIN" || user.role === "EDITOR");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-green-700 flex items-center justify-center text-white font-bold text-xs">
              LC
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              LandCover<span className="text-green-700">AI</span>
            </span>
          </div>
        </Link>

        {/* Right side: Nav & Auth */}
        <div className="flex items-center gap-4">
          {/* Primary Nav */}
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link 
              href="/select-project" 
              className="text-slate-600 hover:text-green-700 transition"
            >
              Analysis
            </Link>

            {isStaff && (
              <div className="relative group">
                <button className="flex items-center gap-1 text-slate-600 hover:text-green-700 transition">
                  Admin <span aria-hidden className="text-xs">▾</span>
                </button>
                <div className="invisible absolute right-0 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-lg group-hover:visible origin-top-right transition-all">
                  <Link href="/admin/users" className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50">Users</Link>
                  <Link href="/admin/listings" className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50">Listings</Link>
                  <Link href="/admin/submissions" className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50">Submissions</Link>
                </div>
              </div>
            )}
          </nav>

          <div className="h-4 w-px bg-slate-200" aria-hidden />

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {!user ? (
              <Link
                href="/login"
                className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-800"
              >
                Login
              </Link>
            ) : (
              <>
                <Link 
                  href="/dashboard" 
                  className="hidden sm:block text-xs font-medium text-slate-600 hover:text-green-700"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}