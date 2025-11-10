// app/admin/submissions/page.tsx
import { auth } from "@/auth";
import { headers, cookies } from "next/headers";
import type { ReactNode } from "react";

async function apiFetch(path: string, init: RequestInit = {}) {
  const h = await headers();
  const c = await cookies();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("Missing host header");
  const base = `${proto}://${host}`;
  return fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...(init.headers || {}), cookie: c.toString(), "content-type": "application/json" },
  });
}

function FormDataDisplay({ data }: { data: any }) {
  const renderValue = (value: any, key?: string): ReactNode => {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return <span className="text-slate-400 italic">empty</span>;
    }

    // Handle booleans
    if (typeof value === "boolean") {
      return (
        <span className={value ? "text-emerald-600 font-medium" : "text-slate-500"}>
          {value ? "Yes" : "No"}
        </span>
      );
    }

    // Handle numbers (including timestamps)
    if (typeof value === "number") {
      // Check if it looks like a timestamp (10 or 13 digits)
      if (value > 1_000_000_000 && value < 10_000_000_000_000) {
        const date = new Date(value > 10_000_000_000 ? value : value * 1000);
        return (
          <span className="text-slate-700">
            {value}
            <span className="ml-2 text-xs text-slate-500">({date.toLocaleString()})</span>
          </span>
        );
      }

      // Check if it's a coordinate
      if (
        key &&
        (key.toLowerCase().includes("lat") ||
          key.toLowerCase().includes("lng") ||
          key.toLowerCase().includes("lon") ||
          key.toLowerCase().includes("coord"))
      ) {
        return <span className="text-blue-600 font-mono text-sm">{value.toFixed(6)}°</span>;
      }

      return <span className="text-slate-700 font-mono">{value}</span>;
    }

    // Handle strings
    if (typeof value === "string") {
      // URL?
      if (value.match(/^https?:\/\//)) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline break-all"
          >
            {value}
          </a>
        );
      }

      // Long text?
      if (value.length > 100) {
        return <span className="text-slate-700 break-words leading-relaxed">{value}</span>;
      }

      return <span className="text-slate-700">{value}</span>;
    }

    // Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-slate-400 italic">empty list</span>;
      }
      return (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div key={idx} className="flex gap-2 pl-4 border-l-2 border-emerald-200">
              <span className="text-slate-500 text-xs mt-0.5">{idx + 1}.</span>
              <div className="flex-1">{renderValue(item)}</div>
            </div>
          ))}
        </div>
      );
    }

    // Objects
    if (typeof value === "object") {
      return (
        <div className="space-y-2 pl-4 border-l-2 border-slate-200">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="space-y-1">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                {k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
              </div>
              <div className="pl-2">{renderValue(v, k)}</div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-slate-700">{String(value)}</span>;
  };

  if (!data || Object.keys(data).length === 0) {
    return <div className="text-slate-400 italic text-sm">No data available</div>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="group/item">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
            </span>
          </div>
          <div className="pl-3">{renderValue(value, key)}</div>
        </div>
      ))}
    </div>
  );
}

async function getAll() {
  const res = await apiFetch("/api/submissions?all=1");
  if (!res.ok) return { submissions: [] as any[] };
  return res.json();
}

export default async function AdminSubmissionsPage() {
  const session = await auth();
  const me = session?.user as any;
  if (!me || !["ADMIN", "EDITOR"].includes(me.role)) return null;

  const { submissions } = await getAll();

  async function setStatus(id: string, status: "APPROVED" | "REJECTED" | "PENDING") {
    "use server";
    await apiFetch("/api/submissions", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
  }

  return (
    <main className="min-h-screen bg-white relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-7xl p-6 sm:p-10">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Admin · Submissions</h1>
          <p className="text-sm text-emerald-900/70">Review and approve user-submitted JSON.</p>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-emerald-900/10">
                <th className="p-3">ID</th>
                <th className="p-3">User</th>
                <th className="p-3">Form</th>
                <th className="p-3">Request time</th>
                <th className="p-3">Actions</th>
                <th className="p-3">Action time</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s: any) => (
                <tr key={s.id} className="border-t border-emerald-900/10 align-top">
                  <td className="p-3 text-xs">{s.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{s.userName || "—"}</div>
                    <div className="text-xs text-emerald-900/60">{s.userEmail}</div>
                  </td>
                  <td className="p-3">
                    <details className="group">
                      <summary className="cursor-pointer font-medium text-emerald-950 hover:text-emerald-700 transition-colors">
                        {s.formName}
                        <span className="ml-2 text-emerald-600 text-xs group-open:hidden">▼ View details</span>
                        <span className="ml-2 text-emerald-600 text-xs hidden group-open:inline">▲ Hide details</span>
                      </summary>
                      <div className="mt-3 max-w-[640px] rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 border border-slate-200 shadow-sm">
                        <FormDataDisplay data={s.data} />
                      </div>
                    </details>
                  </td>
                  <td className="p-3">{new Date(s.submittedAt).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs border ${
                          s.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : s.status === "REJECTED"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {s.status}
                      </span>
                      <form action={setStatus.bind(null, s.id, "APPROVED")}>
                        <button className="rounded-lg bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-700">
                          Approve
                        </button>
                      </form>
                      <form action={setStatus.bind(null, s.id, "REJECTED")}>
                        <button className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">
                          Reject
                        </button>
                      </form>
                      <form action={setStatus.bind(null, s.id, "PENDING")}>
                        <button className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">
                          Pend
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="p-3">{s.actionTime ? new Date(s.actionTime).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td className="p-4 text-emerald-900/70" colSpan={6}>
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
