import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@/types";

const BACKEND = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:4000"
);

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
          const res = await fetch(`${BACKEND}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });

          if (!res.ok) return null;

          const { data } = await res.json();
          if (!data?.accessToken || !data?.user) return null;

          return {
            id:           data.user.id,
            email:        data.user.email,
            name:         data.user.name,
            role:         data.user.role as Role,
            profileId:    data.user.profileId,
            backendToken: data.accessToken,
            refreshToken: data.refreshToken ?? "",
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: store tokens and expiry
      if (user) {
        token.id                 = user.id;
        token.role               = user.role;
        token.profileId          = user.profileId;
        token.backendToken       = user.backendToken;
        token.refreshToken       = user.refreshToken;
        token.accessTokenExpires = Date.now() + 55 * 60 * 1000;
        return token;
      }

      // Token still valid
      if (Date.now() < token.accessTokenExpires) return token;

      // Access token expired — attempt silent refresh
      try {
        const res = await fetch(`${BACKEND}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: token.refreshToken }),
        });
        const json = await res.json();
        if (!res.ok || !json.data?.token) throw new Error("refresh failed");
        return {
          ...token,
          backendToken:        json.data.token,
          refreshToken:        json.data.refreshToken,
          accessTokenExpires:  Date.now() + 55 * 60 * 1000,
          error:               undefined,
        };
      } catch {
        // Refresh failed — keep expired token, signal error so client can sign out
        return { ...token, error: "RefreshTokenError" };
      }
    },

    async session({ session, token }) {
      if (token) {
        session.user.id        = token.id        as string;
        session.user.role      = token.role      as Role;
        session.user.profileId = token.profileId as string;
        session.backendToken   = token.backendToken as string;
        session.error          = token.error     as string | undefined;
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
