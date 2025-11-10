"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminCreateUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"VISITOR" | "OWNER" | "EDITOR" | "ADMIN">("VISITOR");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setSuccess(true);
      setEmail("");
      setName("");
      setPassword("");
      setRole("VISITOR");
      
      // Redirect to users page after a short delay
      setTimeout(() => {
        router.push("/admin/users");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-2xl p-6 sm:p-10">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">
            Create New User
          </h1>
          <p className="text-sm text-emerald-900/70">
            Create a user account without email verification. The user will be automatically verified.
          </p>
        </header>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-950 px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-3 mb-4 text-sm">
            User created successfully! Redirecting...
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 shadow-sm space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-emerald-950">
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-emerald-950">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-emerald-950">
              Password *
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm text-emerald-950/70 hover:bg-emerald-50"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-emerald-900/60">
              Minimum 8 characters
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-sm font-medium text-emerald-950">
              Role *
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 focus:border-emerald-600/40 focus:ring"
            >
              <option value="VISITOR">Visitor</option>
              <option value="OWNER">Owner</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-3 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/users")}
              className="rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-sm hover:bg-emerald-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}