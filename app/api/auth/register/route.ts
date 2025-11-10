import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { issueEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { logActivity } from "@/lib/activity";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const { name, email, password, invite, as } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const normalized = String(email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

  let role: Role = "VISITOR";
  let status = "PENDING";
  
  if (invite) {
    const inv = await prisma.inviteToken.findUnique({ where: { token: String(invite) } });
    if (!inv || inv.expires < new Date() || inv.usedAt) {
      return NextResponse.json({ error: "Invite invalid or expired" }, { status: 400 });
    }
    if (inv.email !== normalized) {
      return NextResponse.json({ error: "Invite email mismatch" }, { status: 400 });
    }
    role = inv.role;
  } else if (String(as || "").toUpperCase() === "OWNER") {
    role = "OWNER";
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { 
      email: normalized, 
      name: name || null, 
      passwordHash, 
      role,
      status,
    },
  });

  if (invite) {
    await prisma.inviteToken.update({
      where: { token: invite },
      data: { usedAt: new Date() },
    });
  }

  try {
    const token = await issueEmailVerificationToken(user.email);
    await sendVerificationEmail(user.email, token);
    await logActivity({ userId: user.id, action: "AUTH_REGISTER", details: `${role} - PENDING verification` });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    await logActivity({ userId: user.id, action: "AUTH_REGISTER_EMAIL_FAILED", details: role });
  }

  return NextResponse.json({ ok: true });
}