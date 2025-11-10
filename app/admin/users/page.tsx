import { auth } from "@/auth";
import { headers, cookies } from "next/headers";
import Link from "next/link";

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
    headers: {
      ...(init.headers || {}),
      cookie: c.toString(),
      "content-type": (init.headers as any)?.["content-type"] ?? "application/json",
    },
  });
}

async function getUsers() {
  const res = await apiFetch(`/api/admin/users`);
  if (!res.ok) return { users: [] as any[] };
  return res.json();
}

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { users } = await getUsers();

  async function softDelete(id: string) {
    "use server";
    await apiFetch(`/api/admin/users/${id}/soft-delete`, { method: "POST" });
  }

  async function hardDelete(id: string) {
    "use server";
    await apiFetch(`/api/admin/users/${id}/hard-delete`, { method: "POST" });
  }

  async function updateStatus(id: string, status: string) {
    "use server";
    await apiFetch(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async function invite(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const role = String(formData.get("role") || "VISITOR");
    await apiFetch(`/api/admin/users`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
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
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Admin · Users</h1>
            <p className="text-sm text-emerald-900/70">Invite, manage, soft-delete, or permanently remove users.</p>
          </div>
          <Link
            href="/admin/users/create"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-emerald-700"
          >
            + Create User
          </Link>
        </header>

        <form action={invite} className="rounded-2xl border border-emerald-900/10 bg-white/70 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-end mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-emerald-950">Invite email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-2 shadow-inner outline-none focus:border-emerald-600/40 focus:ring-1 focus:ring-emerald-600/20" placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-950">Role</label>
            <select name="role" defaultValue="VISITOR" className="mt-1 rounded-xl border border-emerald-900/15 bg-white px-3 py-2 shadow-inner outline-none">
              <option value="VISITOR">Visitor</option>
              <option value="OWNER">Owner</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="submit" className="rounded-xl bg-emerald-600 text-white px-4 py-2 shadow-sm hover:bg-emerald-700">Send invite</button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-emerald-900/10">
                <th className="p-3">Email</th>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Verified</th>
                <th className="p-3">Deleted</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-emerald-900/10">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.name || "—"}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${
                        u.status === "VERIFIED" || u.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : u.status === "PENDING"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : u.status === "SUSPENDED"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-slate-50 text-slate-800 border-slate-200"
                      }`}
                    >
                      {u.status || "PENDING"}
                    </span>
                  </td>
                  <td className="p-3">{u.emailVerified ? "Yes" : "No"}</td>
                  <td className="p-3">{u.deletedAt ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Status change buttons */}
                      <form action={updateStatus.bind(null, u.id, "VERIFIED")}>
                        <button className="rounded-lg border border-emerald-900/15 px-2 py-1 text-xs hover:bg-emerald-50">
                          Verify
                        </button>
                      </form>
                      <form action={updateStatus.bind(null, u.id, "ACTIVE")}>
                        <button className="rounded-lg border border-emerald-900/15 px-2 py-1 text-xs hover:bg-emerald-50">
                          Active
                        </button>
                      </form>
                      <form action={updateStatus.bind(null, u.id, "SUSPENDED")}>
                        <button className="rounded-lg border border-amber-900/15 px-2 py-1 text-xs hover:bg-amber-50">
                          Suspend
                        </button>
                      </form>
                      
                      {/* Existing actions */}
                      <form action={softDelete.bind(null, u.id)}>
                        <button className="rounded-lg border border-emerald-900/15 px-2 py-1 text-xs hover:bg-emerald-50">Soft delete</button>
                      </form>
                      <form action={hardDelete.bind(null, u.id)}>
                        <button className="rounded-lg bg-rose-600 text-white px-2 py-1 text-xs hover:bg-rose-700">Hard delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="p-4 text-emerald-900/70" colSpan={7}>No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}