import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issuePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (user && !user.deletedAt) {
    const token = await issuePasswordResetToken(user.email);
    await sendPasswordResetEmail(user.email, token);
    await logActivity({ userId: user.id, action: "AUTH_RESET_REQUEST" });
  }
  // Always respond ok to avoid leakage
  return NextResponse.json({ ok: true });
}
