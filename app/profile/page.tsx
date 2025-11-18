// app/profile/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Alert, Spinner } from "../components/auth/ui"; // Assuming ui components are here

type UserProfile = {
  name: string;
  email: string;
  institution: string;
  personalLink: string;
  bio: string;
  role: string;
  status: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [personalLink, setPersonalLink] = useState("");
  const [bio, setBio] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch profile data on load
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch profile");
        }
        const { user } = await res.json();
        setUser(user);
        // Populate form fields
        setName(user.name || "");
        setInstitution(user.institution || "");
        setPersonalLink(user.personalLink || "");
        setBio(user.bio || "");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // Handle profile update
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, institution, personalLink, bio }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }
      
      setUser(data.user); 
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message);
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
            My Profile
          </h1>
          <p className="text-sm text-emerald-900/70">
            Update your personal information.
          </p>
        </header>

        {loading && (
          <div className="text-center p-10">
            <Spinner label="Loading profile..." />
          </div>
        )}

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {!loading && user && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 shadow-sm space-y-5"
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-emerald-950">
                Email
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={user.email}
                className="w-full rounded-xl border border-emerald-900/15 bg-slate-100 px-4 py-3 text-emerald-950 shadow-inner outline-none opacity-70"
              />
              <p className="text-xs text-emerald-900/60">
                Email address cannot be changed.
              </p>
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
              <label htmlFor="institution" className="block text-sm font-medium text-emerald-950">
                Institution or Farm
              </label>
              <input
                id="institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                placeholder="e.g., MSU Extension, Local Farm Co-op"
              />
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="personalLink" className="block text-sm font-medium text-emerald-950">
                Personal Link
              </label>
              <input
                id="personalLink"
                type="url"
                value={personalLink}
                onChange={(e) => setPersonalLink(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                placeholder="https://my-farm.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bio" className="block text-sm font-medium text-emerald-950">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
                placeholder="A short description of yourself or your work..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-3 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? <Spinner label="Saving..." /> : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}