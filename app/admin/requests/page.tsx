import { auth } from "@/auth";

async function getAll() {
  const res = await fetch("/api/requests?all=1", { cache: "no-store" });
  if (!res.ok) return { requests: [] as any[] };
  return res.json();
}

export default async function AdminRequestsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return null;
  const isStaff = user.role === "ADMIN" || user.role === "EDITOR";
  if (!isStaff) return null;

  const { requests } = await getAll();

  async function moderate(id: string, action: "APPROVED" | "REJECTED" | "PENDING") {
    "use server";
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
      cache: "no-store",
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
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">Admin · Approvals</h1>
          <p className="text-sm text-emerald-900/70">Review user-submitted requests.</p>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-emerald-900/10">
                <th className="p-3">ID</th>
                <th className="p-3">User name</th>
                <th className="p-3">Task subject</th>
                <th className="p-3">Request time</th>
                <th className="p-3">Actions</th>
                <th className="p-3">Action time</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} className="border-t border-emerald-900/10 align-top">
                  <td className="p-3 text-xs">{r.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.userName || "—"}</div>
                    <div className="text-xs text-emerald-900/60">{r.userEmail || ""}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.subject}</div>
                    {r.payload ? (
                      <pre className="mt-1 max-w-[520px] overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    ) : null}
                  </td>
                  <td className="p-3">{new Date(r.requestTime).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs border ${
                        r.action === "APPROVED" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : r.action === "REJECTED" ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        {r.action || "PENDING"}
                      </span>
                      <form action={moderate.bind(null, r.id, "APPROVED")}><button className="rounded-lg bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-700">Approve</button></form>
                      <form action={moderate.bind(null, r.id, "REJECTED")}><button className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">Reject</button></form>
                      <form action={moderate.bind(null, r.id, "PENDING")}><button className="rounded-lg border border-emerald-900/15 px-3 py-1 hover:bg-emerald-50">Pend</button></form>
                    </div>
                  </td>
                  <td className="p-3">{r.actionTime ? new Date(r.actionTime).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td className="p-4 text-emerald-900/70" colSpan={6}>No requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
