// app/dashboard/page.tsx
import { auth } from "@/auth";
import { headers, cookies } from "next/headers";
import Link from "next/link";

// Helper: same-origin fetch with cookies forwarded
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
      cookie: c.toString(), // forward session cookies
    },
  });
}

async function getMyListings() {
  const res = await apiFetch("/api/listings");
  if (!res.ok) return { listings: [] as any[] };
  return res.json();
}

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) return null;

  const { listings } = await getMyListings();
  const user = session.user as any;

  return (
    <main className="min-h-screen bg-white relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl p-6 sm:p-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-950">
              Welcome, {user.name || user.email}
            </h1>
            <p className="text-sm text-emerald-900/70">
              Role: <span className="font-medium">{user.role}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {(user.role === "ADMIN" || user.role === "EDITOR") && (
              <>
                <Link
                  href="/admin/users"
                  className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2 text-emerald-950 shadow-sm hover:bg-emerald-50"
                >
                  Admin · Users
                </Link>
                <Link
                  href="/admin/listings"
                  className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2 text-emerald-950 shadow-sm hover:bg-emerald-50"
                >
                  Admin · Listings
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card
            title="My listings"
            value={listings.length}
            hint="Create or edit your business pages"
            href="/owner"
          />
          <Card
            title="Account"
            value={user.email}
            hint="Update details or self-delete"
            href="/dashboard/profile"
          />
          <Card
            title="Explore"
            value="Directory"
            hint="See what visitors see"
            href="/explore"
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 shadow-sm">
            <h2 className="font-medium text-emerald-950">Owner quick actions</h2>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link className="text-emerald-800 hover:underline" href="/owner">
                  Create a listing
                </Link>
              </li>
              <li>
                <Link className="text-emerald-800 hover:underline" href="/owner">
                  Submit for review
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 shadow-sm">
            <h2 className="font-medium text-emerald-950">Account</h2>
            <p className="text-sm text-emerald-900/70 mt-1">Email: {user.email}</p>
            <form action="/api/self-delete" method="post" className="mt-4">
              <button className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm shadow-sm hover:bg-rose-700">
                Delete my account
              </button>
            </form>
          </div>
        </div>
        {(user.role === "ADMIN" || user.role === "EDITOR") && (
  <>
    <Link href="/admin/users" className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2 text-emerald-950 shadow-sm hover:bg-emerald-50">
      Admin · Users
    </Link>
    <Link href="/admin/listings" className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2 text-emerald-950 shadow-sm hover:bg-emerald-50">
      Admin · Listings
    </Link>
  </>
)}

      </section>
    </main>
  );
}

function Card({
  title,
  value,
  hint,
  href,
}: {
  title: string;
  value: React.ReactNode;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-emerald-900/10 bg-white/70 p-6 shadow-sm block hover:bg-white"
    >
      <p className="text-sm text-emerald-900/70">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-emerald-950">{value}</p>
      <p className="mt-1 text-xs text-emerald-900/60">{hint}</p>
    </Link>
  );
}
