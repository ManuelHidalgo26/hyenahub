import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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
          const res = await fetch(`${process.env.BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          if (!res.ok) return null;
          const { data } = await res.json();
          return {
            id:           data.user.id,
            email:        data.user.email,
            name:         data.user.name,
            role:         data.user.role as Role,
            profileId:    data.user.profileId ?? data.user.id,
            backendToken: data.accessToken,
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
        token.id           = user.id;
        token.role         = (user as { role: Role }).role;
        token.profileId    = (user as { profileId: string }).profileId;
        token.backendToken = (user as { backendToken: string }).backendToken;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id           = token.id           as string;
        session.user.role         = token.role         as Role;
        session.user.profileId    = token.profileId    as string;
        session.user.backendToken = token.backendToken as string;
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
