import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEditListing } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET(_req: Request, context: unknown) {
  const { params } = context as { params: { id: string } };

  const row = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!row || row.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ listing: row });
}

export async function PATCH(req: Request, context: unknown) {
  const { params } = context as { params: { id: string } };

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!row || row.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEditListing(session.user as any, row)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));

  // action=submit sets status -> PENDING
  if (body?.action === "submit") {
    const updated = await prisma.listing.update({
      where: { id: row.id },
      data: { status: "PENDING" },
    });
    await logActivity({
      userId: (session.user as any).id,
      action: "LISTING_SUBMIT_REVIEW",
      details: row.id,
    });
    return NextResponse.json({ listing: updated });
  }

  // Admin/editor moderation
  if (
    body?.action === "moderate" &&
    ((session.user as any).role === "ADMIN" || (session.user as any).role === "EDITOR")
  ) {
    const nextStatus = String(body.status || "").toUpperCase();
    if (!["PUBLISHED", "REJECTED", "PENDING"].includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const updated = await prisma.listing.update({
      where: { id: row.id },
      data: { status: nextStatus as any },
    });
    await logActivity({
      userId: (session.user as any).id,
      action: "LISTING_MODERATE",
      details: `${row.id}:${nextStatus}`,
    });
    return NextResponse.json({ listing: updated });
  }

  // Update basics
  const updated = await prisma.listing.update({
    where: { id: row.id },
    data: {
      name: body.name ?? row.name,
      shortIntro: body.shortIntro ?? row.shortIntro,
      address1: body.address1 ?? row.address1,
      city: body.city ?? row.city,
      region: body.region ?? row.region,
      postalCode: body.postalCode ?? row.postalCode,
      country: body.country ?? row.country,
      phone: body.phone ?? row.phone,
      website: body.website ?? row.website,
      amenities: body.amenities ?? row.amenities,
      activities: body.activities ?? row.activities,
      hours: body.hours ?? row.hours,
    },
  });
  await logActivity({
    userId: (session.user as any).id,
    action: "LISTING_UPDATE",
    details: row.id,
  });
  return NextResponse.json({ listing: updated });
}

export async function DELETE(_req: Request, context: unknown) {
  const { params } = context as { params: { id: string } };

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!row || row.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditListing(session.user as any, row)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.listing.update({
    where: { id: row.id },
    data: { deletedAt: new Date() },
  });
  await logActivity({
    userId: (session.user as any).id,
    action: "LISTING_DELETE",
    details: row.id,
  });
  return NextResponse.json({ ok: true, listing: updated });
}
