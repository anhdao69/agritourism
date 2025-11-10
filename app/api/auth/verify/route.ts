import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeEmailVerificationToken } from "@/lib/tokens";
import { logActivity } from "@/lib/activity";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const email = await consumeEmailVerificationToken(token);
  if (!email) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  const user = await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  await logActivity({ userId: user.id, action: "AUTH_EMAIL_VERIFIED" });

  return NextResponse.json({ ok: true });
}
