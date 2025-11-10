// =============================================================
// app/reset/page.tsx — set a new password (token in URL)
// =============================================================
"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BgDecor, BrandAside, Alert, Spinner } from "../components/auth/ui";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setMsg(null);
    setErr(null);

    if (!token) return setErr("Reset link missing or invalid.");
    if (password !== password2) return setErr("Passwords do not match.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Unable to reset password.");

      setMsg("Password updated. You can sign in now.");
      setTimeout(() => router.push("/login"), 800);
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
              Choose a new password
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">Reset your password</h1>
            <p className="mt-2 text-sm text-emerald-900/70">Your reset link is tied to this device and expires for security.</p>
          </div>

          {msg && <Alert type="success" message={msg} />}
          {err && <Alert type="error" message={err} />}

          <form onSubmit={onSubmit} className="rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm backdrop-blur p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-emerald-950">New password</label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring pr-12"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm text-emerald-950/70 hover:bg-emerald-50"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password2" className="block text-sm font-medium text-emerald-950">Confirm new password</label>
              <input
                id="password2"
                type={show ? "text" : "password"}
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white font-medium shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? <Spinner label="Updating" /> : <span>Update password</span>}
            </button>

            <p className="text-center text-sm text-emerald-900/70">
              All set? <Link href="/login" className="text-emerald-800 hover:underline">Back to sign in</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function ResetFallback() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white relative">
      <BgDecor />
      <BrandAside />
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">Loading...</h1>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetForm />
    </Suspense>
  );
}