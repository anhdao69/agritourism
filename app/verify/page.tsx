// =============================================================
// app/verify/page.tsx — email verification landing
// =============================================================
"use client";
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BgDecor, BrandAside, Alert, Spinner } from "../components/auth/ui";

function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Missing verification token.");
        return;
      }
      setStatus("loading");
      try {
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Verification failed.");
        setStatus("ok");
        setMessage("Your email is verified. You can sign in now.");
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Verification failed.");
      }
    }
    run();
  }, [token]);

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white relative">
      <BgDecor />
      <BrandAside />

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-600/5 px-3 py-1 text-xs font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Verify email
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">Checking your link…</h1>
            <p className="mt-2 text-sm text-emerald-900/70">Please wait while we confirm your account.</p>
          </div>

          {status === "loading" && (
            <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 sm:p-8 text-center">
              <Spinner label="Verifying" />
            </div>
          )}

          {status === "ok" && (
            <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 sm:p-8">
              <Alert type="success" message={message || "Verified"} />
              <Link href="/login?verified=true" className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-emerald-700">Go to sign in</Link>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 sm:p-8">
              <Alert type="error" message={message || "Verification failed"} />
              <div className="flex items-center gap-3 mt-2">
                <Link href="/register" className="text-emerald-800 hover:underline">Create account</Link>
                <span className="text-emerald-900/50">·</span>
                <Link href="/reset-request" className="text-emerald-800 hover:underline">Forgot password?</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function VerifyFallback() {
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

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyForm />
    </Suspense>
  );
}