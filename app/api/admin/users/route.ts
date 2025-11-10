import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";
import { issueInviteToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/mail";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole((session.user as any).role, "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, emailVerified: true, deletedAt: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole((session.user as any).role, "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, role } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const token = await issueInviteToken(String(email).toLowerCase().trim(), role || "VISITOR");
  await sendInviteEmail(email, token);
  await logActivity({ userId: (session.user as any).id, action: "ADMIN_INVITE_USER", details: email });

  return NextResponse.json({ ok: true });
}
