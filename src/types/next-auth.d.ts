// import NextAuth, { DefaultSession } from "next-auth";
// import { Role } from "@prisma/client";

// declare module "next-auth" {
//   interface Session {
//     user: DefaultSession["user"] & {
//       id: string;
//       role: Role;
//       deletedAt?: string | null;
//     };
//   }
//   interface User {
//     role: Role;
//   }
// }

// declare module "next-auth/jwt" {
//   interface JWT {
//     id?: string;
//     role?: Role;
//     deletedAt?: string | null;
//   }
// }


// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "VISITOR" | "OWNER" | "EDITOR" | "ADMIN";
    };
  }
  interface User {
    id: string;
    role: "VISITOR" | "OWNER" | "EDITOR" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "VISITOR" | "OWNER" | "EDITOR" | "ADMIN";
  }
}
