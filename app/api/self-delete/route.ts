import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: (session.user as any).id }, data: { deletedAt: new Date() } });
  await logActivity({ userId: (session.user as any).id, action: "ACCOUNT_SELF_DELETE" });
  return NextResponse.json({ ok: true });
}
