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
      <Container className="flex h-14 items-center gap-3">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-green-700" fill="currentColor" aria-hidden>
              <path d="M12 2a1 1 0 0 1 1 1v2.05c2.89.49 5.5 2.93 6.4 6.2.22.8-1.03 1.26-1.38.5-.98-2.04-2.86-3.74-5.02-4.13V21a1 1 0 1 1-2 0V7.62C8.38 8 6.5 9.7 5.62 11.75c-.33.76-1.6.31-1.38-.5.92-3.29 3.53-5.72 6.4-6.2V3a1 1 0 0 1 1-1Z" />
            </svg>
            <span className="text-sm font-semibold text-slate-900">Local Food Directories</span>
          </div>
        </Link>

        {/* Primary nav (visible on all sizes) */}
        <nav className="ml-3 flex items-center gap-4 text-xs">
          <Link href="/#directories" className="text-slate-600 hover:text-slate-900">Directories</Link>
          <Link href="/#data" className="text-slate-600 hover:text-slate-900">Data Sharing</Link>
          <Link href="/#contact" className="text-slate-600 hover:text-slate-900">Contact</Link>
          <Link href="/explore" className="text-slate-600 hover:text-slate-900">Explore</Link>
          <Link href="/owner" className="text-slate-600 hover:text-slate-900">Owner</Link>
          {isStaff && (
            <div className="relative group">
              <button className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">Admin <span aria-hidden>▾</span></button>
              <div className="invisible absolute left-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg group-hover:visible">
                <Link href="/admin/users" className="block rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50">Users</Link>
                <Link href="/admin/listings" className="block rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50">Listings</Link>
                <Link href="/admin/submissions" className="block rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-50">Submissions</Link>
              </div>
            </div>
          )}
        </nav>

        {/* Right side CTAs (never hidden) */}
        <div className="ml-auto flex items-center gap-2">
          {!user ? (
            <>
              <Link href="/login" className="rounded-lg border border-green-700 bg-white px-3 py-2 text-xs font-semibold text-green-800 shadow-sm transition hover:bg-green-50">
                Sign in
              </Link>
              <Link href="/register" className="rounded-lg border border-green-700 bg-green-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-800">
                Sign up
              </Link>
            </>
          ) : (
            <>
            <Link href="/profile" className="rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-50">
              Profile
            </Link>
              <Link href="/dashboard" className="rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-50">
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
