// types/next-auth.d.ts
import { type DefaultSession } from "next-auth";
import { type JWT as DefaultJWT } from "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: Role;
      deletedAt?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: Role;
    deletedAt?: string | null;
  }
}
