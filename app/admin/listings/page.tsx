import { auth } from "@/auth";
import { headers, cookies } from "next/headers";

// 👇 *** HELPER FUNCTION ***
// This function forwards the admin's session cookies to the API
async function apiFetch(path: string, init: RequestInit = {}) {
  const h = headers();
  const c = cookies();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) throw new Error("Missing host header");

  const base = `${proto}://${host}`;

  return fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.headers || {}),
      cookie: c.toString(),
      "content-type":
        (init.headers as any)?.["content-type"] ?? "application/json",
    },
  });
}

async function getListings() {
  // 👇 Use `apiFetch` to ensure the admin's session is sent
  const res = await apiFetch("/api/listings?all=1");
  if (!res.ok) return { listings: [] as any[] };
  return res.json();
}

export default async function AdminListingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { listings } = await getListings();

  async function moderate(
    id: string,
    status: "PUBLISHED" | "REJECTED" | "PENDING",
  ) {
    "use server";
    // 👇 Use `apiFetch` to send the moderation command as an admin
    await apiFetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "moderate", status }),
    });
  }

  return (
    <main className="min-h-screen bg-white relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl p-6 sm:p-10">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">
            Admin · Listings
          </h1>
          <p className="text-sm text-emerald-900/70">
            Moderate submissions and keep the directory tidy.
          </p>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-emerald-900/10">
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l: any) => (
                <tr key={l.id} className="border-t border-emerald-900/10">
                  <td className="p-3">{l.name}</td>
                  <td className="p-3">
                    {/* 👇 Added styling for status */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                        l.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : l.status === "REJECTED"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : l.status === "PENDING"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-50 text-slate-800 border-slate-200"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3">{l.ownerId || "—"}</td>
                  <td className="p-3">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <form action={moderate.bind(null, l.id, "PUBLISHED")}>
                        <button className="rounded-lg bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-700">
                          Publish
                        </button>
                      </form>
                      <form action={moderate.bind(null, l.id, "REJECTED")}>
                        <button className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">
                          Reject
                        </button>
                      </form>
                      <form action={moderate.bind(null, l.id, "PENDING")}>
                        <button className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">
                          Pend
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr>
                  <td
                    className="p-4 text-emerald-900/70"
                    colSpan={5}
                  >
                    No listings found.
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
