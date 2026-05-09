import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@/types";
import { prisma } from "@/lib/prisma";

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

          if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
            return null;
          }

          const profileId =
            user.role === "TRAINER"
              ? user.trainer?.id ?? ""
              : user.role === "CLIENT"
              ? user.client?.id ?? ""
              : user.id;

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
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id;
        token.role      = user.role;
        token.profileId = user.profileId;
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

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
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

  secret: process.env.NEXTAUTH_SECRET,
};
