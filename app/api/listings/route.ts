import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { logActivity } from "@/lib/activity";
import { hasRole } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";

  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (all && hasRole((session.user as any).role, "EDITOR")) {
    const rows = await prisma.listing.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ listings: rows });
  }

  const rows = await prisma.listing.findMany({
    where: { ownerId: (session.user as any).id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ listings: rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, shortIntro } = await req.json().catch(() => ({}));
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const base = slugify(name);
  let slug = base;
  let i = 1;
  while (await prisma.listing.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${base}-${i}`;
  }

  const row = await prisma.listing.create({
    data: {
      name,
      slug,
      shortIntro: shortIntro || null,
      ownerId: (session.user as any).id,
      // 👇 *** THIS IS THE FIX ***
      // We change "DRAFT" to "PENDING"
      status: "PENDING",
    },
  });

  // We can log this as a submission now, not just a create
  await logActivity({ userId: (session.user as any).id, action: "LISTING_CREATE_AND_SUBMIT", details: row.id });
  return NextResponse.json({ listing: row });
}