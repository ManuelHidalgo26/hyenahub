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
            avatar:    user.avatar ?? undefined,
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
        token.avatar    = (user as { avatar?: string }).avatar;
      }
      if (trigger === "update" && session?.avatar !== undefined) {
        token.avatar = session.avatar;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id        = token.id        as string;
        session.user.role      = token.role      as Role;
        session.user.profileId = token.profileId as string;
        session.user.avatar    = token.avatar    as string | undefined;
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

  secret: process.env.NEXTAUTH_SECRET,
};
