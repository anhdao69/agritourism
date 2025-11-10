// src/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";
import { logActivity } from "./lib/activity";
import { getServerSession } from "next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Using App Router pages, so no custom `pages` mapping necessary
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");

        if (!email || !password) {
          throw new Error("CredentialsSignin");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || user.deletedAt) {
          throw new Error("CredentialsSignin");
        }
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) throw new Error("CredentialsSignin");

        // NextAuth requires an object with an `id` field and now also `role` for credentials.
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role, // Add the missing role property
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Ensure our custom fields always exist with safe defaults
      // (helpful if your module augmentation marks them as non-optional)
      if (token.id === undefined) token.id = "";
      if (token.role === undefined) token.role = "VISITOR";
      if (token.deletedAt === undefined) token.deletedAt = null;

      // On initial sign-in, `user` is present. Sync with DB to get role/deletedAt.
      if (user) {
        const db = await prisma.user.findUnique({
          where: { id: String((user as any).id) },
          select: { id: true, role: true, deletedAt: true },
        });

        if (db) {
          token.id = db.id; // string
          token.role = db.role; // your Role enum
          token.deletedAt = db.deletedAt ? db.deletedAt.toISOString() : null;
        } else {
          // Fallbacks if somehow user not found right after sign-in
          token.id = token.id || String((user as any).id || "");
          token.role = token.role || (user as any).role || "VISITOR";
          token.deletedAt = token.deletedAt ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Only add fields if a user object exists
      if (session.user) {
        // These are safe because we set defaults in the JWT callback above
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).deletedAt = token.deletedAt;
      }
      return session;
    },
    async signIn({ user }) {
      // Best-effort: log if we have an id (string). Ignore otherwise.
      const uid = (user as any)?.id ? String((user as any).id) : null;
      await logActivity({ userId: uid, action: "AUTH_SIGN_IN" });
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      const uid =
        token && (token as any).id ? String((token as any).id) : null;
      await logActivity({ userId: uid, action: "AUTH_SIGN_OUT" });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function auth() {
  return getServerSession(authOptions);
}