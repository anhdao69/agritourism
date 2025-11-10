// app/api/admin/users/[id]/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

export async function PATCH(req: Request, context: unknown) {
  const { params } = context as { params: { id: string } };
  
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (!hasRole((session.user as any).role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { status } = await req.json();
    
    const validStatuses = ["PENDING", "VERIFIED", "ACTIVE", "SUSPENDED", "DELETED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { status },
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "ADMIN_UPDATE_USER_STATUS",
      details: `Changed status of ${user.email} to ${status}`,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}