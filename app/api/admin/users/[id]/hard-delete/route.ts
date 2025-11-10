import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

export async function POST(_req: Request, context: unknown) {
  const { params } = context as { params: { id: string } };

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole((session.user as any).role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  await logActivity({
    userId: (session.user as any).id,
    action: "ADMIN_HARD_DELETE_USER",
    details: params.id,
  });

  return NextResponse.json({ ok: true });
}
