// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        institution: true,
        personalLink: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, institution, personalLink, bio } = await req.json();

    const user = await prisma.user.update({
      where: { id: (session.user as any).id },
      data: {
        name: name !== undefined ? name : undefined,
        institution: institution !== undefined ? institution : undefined,
        personalLink: personalLink !== undefined ? personalLink : undefined,
        bio: bio !== undefined ? bio : undefined,
      },
    });

    await logActivity({
      userId: user.id,
      action: "PROFILE_UPDATE",
      details: "Updated profile information",
    });

    return NextResponse.json({ 
      ok: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        institution: user.institution,
        personalLink: user.personalLink,
        bio: user.bio,
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}