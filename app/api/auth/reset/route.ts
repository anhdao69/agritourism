import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/tokens";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity";
import { sendPasswordUpdatedEmail } from "@/lib/mail";


export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password) return NextResponse.json({ error: "Missing token or password" }, { status: 400 });

  const email = await consumePasswordResetToken(token);
  if (!email) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) return NextResponse.json({ error: "Account not available" }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  await logActivity({ userId: user.id, action: "AUTH_PASSWORD_RESET" });


  // after updating the password hash:
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  // NEW (optional): let user know their password changed
  try { await sendPasswordUpdatedEmail(user.email); } catch (e) { console.error("notify reset:", e); }

  await logActivity({ userId: user.id, action: "AUTH_PASSWORD_RESET" });


  return NextResponse.json({ ok: true });
}
