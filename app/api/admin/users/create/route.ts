// app/api/admin/users/create/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (!hasRole((session.user as any).role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, name, password, role } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalized = String(email).toLowerCase().trim();
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with VERIFIED status and emailVerified set
    const user = await prisma.user.create({
      data: {
        email: normalized,
        name: name || null,
        passwordHash,
        role: role || "VISITOR",
        status: "VERIFIED",
        emailVerified: new Date(), // Admin-created users are automatically verified
      },
    });

    await logActivity({
      userId: (session.user as any).id,
      action: "ADMIN_CREATE_USER",
      details: `Created user ${user.email} with role ${user.role}`,
    });

    return NextResponse.json({ 
      ok: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      }
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}