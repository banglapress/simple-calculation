import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { securityLog } from "@/lib/security-log";

const useSecureCookies = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = String(credentials.email).trim().toLowerCase();

        // Rate limit login attempts per email (10 / 15 min)
        const limited = rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
        if (!limited.success) {
          securityLog("login_rate_limited", { email });
          throw new Error("Too many login attempts. Try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          securityLog("login_failed", { email, reason: "user_not_found" });
          throw new Error("Invalid credentials");
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          securityLog("login_failed", { email, reason: "bad_password" });
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.sessionVersion = token.sessionVersion;
      return session;
    },
  },

  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
