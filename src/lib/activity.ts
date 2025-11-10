import { headers } from "next/headers";
import { prisma } from "./prisma";

export async function logActivity(opts: {
  userId?: string | null;
  action: string;
  details?: string | null;
}) {
  try {
    // Next 15: headers() must be awaited; on older Next, await is a no-op.
    const h = await headers();

    const forwarded = h.get("x-forwarded-for") || "";
    const real = h.get("x-real-ip") || "";
    const ip = (forwarded || real).split(",")[0]?.trim() || null;
    const ua = h.get("user-agent") || null;

    await prisma.activityLog.create({
      data: {
        userId: opts.userId ?? null,
        action: opts.action,
        details: opts.details ?? null,
        ip: ip ?? undefined,
        userAgent: ua ?? undefined,
      },
    });
  } catch {
    // Never throw from logging
  }
}
