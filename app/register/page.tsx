// =============================================================
// app/register/page.tsx
// =============================================================
"use client";
import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BgDecor, BrandAside, Alert, Spinner } from "../components/auth/ui";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = useMemo(() => params.get("callbackUrl") ?? "/dashboard", [params]);

  // ---- NEW: invite/as-owner flags + invited info ----
  const invite = params.get("invite") || null;
  const asOwner = params.get("as") === "owner";
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [invitedRole, setInvitedRole] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ---- NEW: inspect invite token on mount ----
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      if (!invite) return;
      const r = await fetch(`/api/invite/inspect?token=${encodeURIComponent(invite)}`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!ignore) {
        if (d?.valid) {
          setInvitedEmail(d.email);
          setEmail(d.email);
          setInvitedRole(d.role);
        } else {
          setErr("Invite link is invalid or expired.");
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [invite]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setMsg(null);
    setErr(null);

    if (!agree) return setErr("Please accept the Terms to continue.");
    if (password !== password2) return setErr("Passwords do not match.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");

    setSubmitting(true);
    try {
      // ---- NEW: send invite/as flag to API ----
      const body: any = { name, email, password };
      if (invite) body.invite = invite;
      else if (asOwner) body.as = "owner";

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create your account.");

      setMsg("Account created. Check your email to verify before signing in.");
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
              Create your account
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">Join the Agritourism Directory</h1>
            <p className="mt-2 text-sm text-emerald-900/70">Owners & editors manage listings. Visitors can browse without an account.</p>
          </div>

          {msg && <Alert type="success" message={msg} />}
          {err && <Alert type="error" message={err} />}

          <form onSubmit={onSubmit} className="rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm backdrop-blur p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-emerald-950">Name (optional)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                placeholder="Jane Farmer"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-emerald-950">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!invitedEmail}
                className={`w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring ${invitedEmail ? "opacity-70 cursor-not-allowed" : ""}`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {invitedRole && (
                <p className="text-xs text-emerald-900/60 mt-1">
                  Invited as <span className="font-medium">{invitedRole}</span>.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-emerald-950">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring pr-12"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm text-emerald-950/70 hover:bg-emerald-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-emerald-900/60">Use at least 8 characters. Consider a mix of letters, numbers, and symbols.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password2" className="block text-sm font-medium text-emerald-950">Confirm password</label>
              <input
                id="password2"
                type={showPassword ? "text" : "password"}
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-900/20 text-emerald-600 focus:ring-emerald-600"
              />
              <span className="text-emerald-900/80">
                I agree to the <Link href="/terms" className="text-emerald-800 underline">Terms</Link> and <Link href="/privacy" className="text-emerald-800 underline">Privacy Policy</Link>.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white font-medium shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? <Spinner label="Creating account" /> : <span>Create account</span>}
            </button>

            <p className="text-center text-sm text-emerald-900/70">
              Already have an account? <Link href="/login" className="text-emerald-800 hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function RegisterFallback() {
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}