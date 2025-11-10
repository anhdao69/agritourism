// src/lib/mail.ts
import nodemailer from "nodemailer";

/**
 * SMTP → AWS SES (mirrors your Python example)
 * Works great on Vercel/Node with STARTTLS (587).
 */

const APP_NAME = process.env.APP_NAME || "Agritourism Directory";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();

const FROM_EMAIL = (process.env.SES_FROM_EMAIL || "").trim();
const FROM_NAME = (process.env.SES_FROM_NAME || APP_NAME).trim();

const SMTP_HOST = (process.env.AWS_SMTP_HOST || "email-smtp.us-east-1.amazonaws.com").trim();
const SMTP_PORT = Number(process.env.AWS_SMTP_PORT || 587);
const SMTP_USER = (process.env.AWS_SMTP_USER || "").trim();
const SMTP_PASS = (process.env.AWS_SMTP_PASS || "").trim();

if (!FROM_EMAIL) throw new Error("SES_FROM_EMAIL missing in env");
if (!SMTP_USER || !SMTP_PASS) throw new Error("AWS_SMTP_USER / AWS_SMTP_PASS missing in env");

export const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // STARTTLS
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { minVersion: "TLSv1.2" }, // good hygiene
});

function fromHeader() {
  return `${FROM_NAME} <${FROM_EMAIL}>`;
}

/** Light HTML→text fallback so links remain visible in plain text */
function htmlToText(html: string) {
  return html
    .replace(/<a[^>]*href="([^"]+)"[^>]*>.*?<\/a>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function send(to: string, subject: string, html: string, text?: string) {
  await mailer.sendMail({
    to,
    from: fromHeader(),
    subject,
    html,
    text: text || htmlToText(html),
    replyTo: FROM_EMAIL,
  });
}

/* ───────────────── Templates (match your Python) ───────────────── */

function shell(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f5f7fb; padding:24px; margin:0;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:24px; border-radius:8px;">
      <h2 style="margin:0 0 12px; color:#111827;">${title}</h2>
      ${bodyHtml}
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
      <p style="margin:0; color:#9CA3AF;">— ${APP_NAME} Team</p>
    </div>
  </body>
</html>`;
}

function resetBlock(resetLink: string) {
  return `\
<p style="margin:0 0 16px; color:#374151;">
  We received a request to reset your password for <strong>${APP_NAME}</strong>.
  Click the button below to set a new one:
</p>
<p style="text-align:center; margin:24px 0;">
  <a href="${resetLink}"
     style="background:#2563EB; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; display:inline-block; font-weight:600;">
    Reset Password
  </a>
</p>
<p style="margin:0 0 8px; color:#6B7280;">If the button doesn’t work, paste this link into your browser:</p>
<p style="word-break:break-all; color:#2563EB; margin:0 0 16px;">
  <a href="${resetLink}" style="color:#2563EB; text-decoration:none;">${resetLink}</a>
</p>
<p style="margin:0; color:#9CA3AF;">If you didn’t request this, you can safely ignore this email.</p>`;
}

function verifyBlock(verifyLink: string) {
  return `\
<p style="margin:0 0 16px; color:#374151;">
  Welcome to <strong>${APP_NAME}</strong>! Please confirm your email to finish setting up your account:
</p>
<p style="text-align:center; margin:24px 0;">
  <a href="${verifyLink}"
     style="background:#2563EB; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; display:inline-block; font-weight:600;">
    Verify Email
  </a>
</p>
<p style="margin:0 0 8px; color:#6B7280;">If the button doesn’t work, paste this link into your browser:</p>
<p style="word-break:break-all; color:#2563EB; margin:0 0 16px;">
  <a href="${verifyLink}" style="color:#2563EB; text-decoration:none;">${verifyLink}</a>
</p>`;
}

function inviteBlock(inviteLink: string) {
  return `\
<p style="margin:0 0 16px; color:#374151;">
  You’ve been invited to join <strong>${APP_NAME}</strong>. Click below to accept and complete your account:
</p>
<p style="text-align:center; margin:24px 0;">
  <a href="${inviteLink}"
     style="background:#2563EB; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; display:inline-block; font-weight:600;">
    Accept Invite
  </a>
</p>
<p style="margin:0 0 8px; color:#6B7280;">If the button doesn’t work, paste this link into your browser:</p>
<p style="word-break:break-all; color:#2563EB; margin:0 0 16px;">
  <a href="${inviteLink}" style="color:#2563EB; text-decoration:none;">${inviteLink}</a>
</p>`;
}

function passwordSetBlock(loginLink: string) {
  return `\
<p style="margin:0 0 16px; color:#374151;">
  Your password has been updated for <strong>${APP_NAME}</strong>. You can now log in:
</p>
<p style="text-align:center; margin:24px 0;">
  <a href="${loginLink}"
     style="background:#10B981; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; display:inline-block; font-weight:600;">
    Go to Login
  </a>
</p>
<p style="margin:0 0 8px; color:#6B7280;">Or paste this link into your browser:</p>
<p style="word-break:break-all; color:#2563EB; margin:0;">
  <a href="${loginLink}" style="color:#2563EB; text-decoration:none;">${loginLink}</a>
</p>`;
}

/* ───────────────── Public API used by your routes ───────────────── */

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${APP_URL}/reset?token=${encodeURIComponent(token)}`;
  const html = shell("Password Reset Request", resetBlock(link));
  await send(email, "Reset Your Password", html);
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/verify?token=${encodeURIComponent(token)}`;
  const html = shell("Verify your email", verifyBlock(link));
  await send(email, "Verify your email", html);
}

export async function sendInviteEmail(email: string, token: string) {
  const link = `${APP_URL}/register?invite=${encodeURIComponent(token)}`;
  const html = shell("You’re invited", inviteBlock(link));
  await send(email, "You’re invited to join", html);
}

export async function sendPasswordUpdatedEmail(email: string) {
  const link = `${APP_URL}/login`;
  const html = shell("Password Updated Successfully", passwordSetBlock(link));
  await send(email, "Your Password Has Been Updated", html);
}

/** Back-compat with older code paths */
export async function sendMail(to: string, subject: string, html: string, text?: string) {
  await send(to, subject, html, text);
}
