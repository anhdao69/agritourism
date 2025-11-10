"use client";
import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Drop this file at: app/(auth)/login/page.tsx  (or app/login/page.tsx)
 * TailwindCSS recommended. If you don't use it yet, the page will still render basic styles,
 * but the look shines with Tailwind.
 */

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const verified = params.get("verified") === "true";
  const urlError = params.get("error"); // e.g., NextAuth error query
  const callbackUrl = useMemo(() => params.get("callbackUrl") ?? "/dashboard", [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    setSubmitting(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    if (!res) {
      setErr("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    if (res.error) {
      setErr(
        res.error === "EMAIL_NOT_VERIFIED"
          ? "Please verify your email first."
          : res.error === "CredentialsSignin"
          ? "Invalid email or password."
          : res.error
      );
      setSubmitting(false);
      return;
    }
    // success
    router.push(res.url ?? callbackUrl);
  }

  function onProvider(provider: string) {
    setErr(null);
    setSubmitting(true);
    signIn(provider, { callbackUrl });
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white relative">
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      {/* Left panel: brand + value props */}
      <aside className="hidden lg:flex flex-col justify-between p-10">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-semibold shadow-md">
            AG
          </div>
          <div className="">
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

      {/* Right panel: auth card */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-600/5 px-3 py-1 text-xs font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Welcome back
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">Sign in to your account</h1>
            <p className="mt-2 text-sm text-emerald-900/70">
              Visitors can browse without an account. Owners & editors sign in to manage listings.
            </p>
          </div>

          {/* Alerts */}
          {verified && (
            <Alert type="success" message="Email verified. You can sign in now." />
          )}
          {urlError && !err && (
            <Alert type="error" message={formatUrlError(urlError)} />
          )}
          {err && <Alert type="error" message={err} />}

          <form onSubmit={onSubmit} className="rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm backdrop-blur p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-emerald-950">Email</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-emerald-950">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm text-emerald-950/70 hover:bg-emerald-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 select-none">
                <input type="checkbox" className="h-4 w-4 rounded border-emerald-900/20 text-emerald-600 focus:ring-emerald-600" />
                <span className="text-emerald-900/80">Remember me</span>
              </label>
              <Link href="/reset-request" className="text-emerald-800 hover:underline">Forgot password?</Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white font-medium shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? (
                <Spinner label="Signing in" />
              ) : (
                <>
                  <span>Sign in</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-emerald-900/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-emerald-900/60">or</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => onProvider("google")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 font-medium shadow-sm hover:bg-emerald-50"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.2 3.31v2.75h3.56c2.08-1.92 3.28-4.75 3.28-8.07z"/>
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.33-2.73l-3.56-2.75c-.98.66-2.23 1.06-3.77 1.06-2.9 0-5.35-1.96-6.23-4.6H1.99v2.86C3.81 20.53 7.58 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.77 13.98c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V6.96H1.99A10.01 10.01 0 0 0 2 11.9c0 1.62.39 3.14 1.09 4.47l2.68-2.39z"/>
                  <path fill="#EA4335" d="M12 4.58c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.5 1.5 15 0.5 12 0.5 7.58 0.5 3.81 3 1.99 6.96l3.78 2.86C6.65 6.54 9.1 4.58 12 4.58z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <p className="text-center text-sm text-emerald-900/70">
              Don't have an account? <Link href="/register" className="text-emerald-800 hover:underline">Create one</Link>
            </p>
          </form>

          {/* Quick navigation for this app's personas */}
          <div className="mt-8 grid gap-3">
            <PersonaLink href="/explore" title="Browse as visitor" desc="Search farms, filter by season, and save favorites." />
            <PersonaLink href="/owner" title="Claim or manage a listing" desc="Update hours, add events, upload photos." />
            <PersonaLink href="/admin" title="Editor dashboard" desc="Review updates, manage tags & announcements." />
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white relative">
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <aside className="hidden lg:flex flex-col justify-between p-10">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-semibold shadow-md">
            AG
          </div>
          <div className="">
            <p className="text-lg font-semibold text-emerald-900">Agritourism Directory</p>
            <p className="text-sm text-emerald-800/70">Find farms, orchards, vineyards & stays</p>
          </div>
        </header>
      </aside>

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

function ValueRow({ title, desc }: { title: string; desc: string }) {
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

function PersonaLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-emerald-900/10 bg-white/60 p-4 shadow-sm backdrop-blur transition hover:border-emerald-600/30 hover:bg-white"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-emerald-950">{title}</p>
          <p className="text-sm text-emerald-900/70">{desc}</p>
        </div>
        <span className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-900/10 bg-white text-emerald-900/70 group-hover:border-emerald-600/30 group-hover:text-emerald-900">
          →
        </span>
      </div>
    </Link>
  );
}

function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  const base = "rounded-xl px-4 py-3 mb-4 text-sm border";
  const t =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : "bg-rose-50 border-rose-200 text-rose-950";
  return <div role="status" className={`${base} ${t}`}>{message}</div>;
}

function Spinner({ label }: { label?: string }) {
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

function formatUrlError(e: string) {
  switch (e) {
    case "AccessDenied":
      return "Access denied. Please use an authorized account.";
    case "Verification":
      return "Verification link invalid or expired. Request a new one.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Could not sign in with provider. Try again.";
    case "CredentialsSignin":
      return "Invalid email or password.";
    default:
      return e.replaceAll("_", " ");
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}