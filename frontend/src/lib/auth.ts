import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { trainer: true, client: true },
          });
          if (!user) return null;
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) return null;

          const profileId =
            user.role === "TRAINER" ? user.trainer?.id ?? user.id :
            user.role === "CLIENT"  ? user.client?.id  ?? user.id :
            user.id;

          return {
            id:        user.id,
            email:     user.email,
            name:      user.name,
            role:      user.role as Role,
            profileId,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id        = user.id;
        token.role      = (user as { role: Role }).role;
        token.profileId = (user as { profileId: string }).profileId;
        // avatar is NOT stored in JWT — base64 images make the cookie too large (Vercel 494 error)
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id        = token.id        as string;
        session.user.role      = token.role      as Role;
        session.user.profileId = token.profileId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  // Cookie renamed to v2 — forces all users with old oversized cookies (494 error)
  // to re-authenticate and receive a clean, lightweight JWT without base64 avatars.
  cookies: {
    sessionToken: {
      name: "next-auth.session-token-v2",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
