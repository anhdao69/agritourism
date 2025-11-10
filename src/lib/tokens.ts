import crypto from "crypto";
import { prisma } from "./prisma";

function makeToken() {
  return crypto.randomBytes(32).toString("hex"); // URL-safe enough
}

export async function issueEmailVerificationToken(email: string) {
  const token = makeToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await prisma.emailVerificationToken.create({ data: { email, token, expires } });
  return token;
}

export async function consumeEmailVerificationToken(token: string) {
  const row = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) return null;
  await prisma.emailVerificationToken.delete({ where: { token } });
  return row.email;
}

export async function issuePasswordResetToken(email: string) {
  const token = makeToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 1); // 1h
  await prisma.passwordResetToken.create({ data: { email, token, expires } });
  return token;
}

export async function consumePasswordResetToken(token: string) {
  const row = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) return null;
  await prisma.passwordResetToken.delete({ where: { token } });
  return row.email;
}

export async function issueInviteToken(email: string, role: "VISITOR" | "OWNER" | "EDITOR" | "ADMIN") {
  const token = makeToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7d
  await prisma.inviteToken.create({ data: { email, role, token, expires } });
  return token;
}
