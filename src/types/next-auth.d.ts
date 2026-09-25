// src/types/next-auth.d.ts

import { DefaultSession, DefaultUser, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      sessionVersion?: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string;
    id?: string;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    id?: string;
    sessionVersion?: number;
    revoked?: boolean;
  }
}
