// =============================================================
// app/(auth)/reset-request/page.tsx — request password reset email
// =============================================================
"use client";
import React, { useState } from "react";
import Link from "next/link";
import { BgDecor, BrandAside, Alert, Spinner } from "../components/auth/ui";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setMsg(null);
    setErr(null);

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Unable to send reset email.");
      setMsg("If that email exists, we just sent a reset link. Check your inbox.");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white relative">
      <BgDecor />
      <BrandAside />

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-600/5 px-3 py-1 text-xs font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Reset password
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">Send reset link</h1>
            <p className="mt-2 text-sm text-emerald-900/70">We’ll email you a secure link to set a new password.</p>
          </div>

          {msg && <Alert type="success" message={msg} />}
          {err && <Alert type="error" message={err} />}

          <form onSubmit={onSubmit} className="rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm backdrop-blur p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-emerald-950">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white font-medium shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? <Spinner label="Sending" /> : <span>Send reset link</span>}
            </button>

            <p className="text-center text-sm text-emerald-900/70">
              Remembered it? <Link href="/login" className="text-emerald-800 hover:underline">Back to sign in</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
