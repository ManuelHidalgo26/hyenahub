import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
// El access token dura 1h; renovamos cuando queden menos de 5 minutos
const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

function parseJwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return (payload.exp ?? 0) * 1000; // en ms
  } catch {
    return 0;
  }
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) return null;
  return json.data as { token: string; refreshToken: string };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) return null;
          const { user, token, refreshToken } = json.data;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as Role,
            accessToken: token,
            refreshToken,
            profileId: json.data.profileId || user.id,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Primer login: guardar datos del backend
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.accessToken = (user as { accessToken: string }).accessToken;
        token.refreshToken = (user as { refreshToken: string }).refreshToken;
        token.profileId = (user as { profileId: string }).profileId;
        token.avatar = (user as { avatar?: string }).avatar;
        return token;
      }

      // Actualización manual (ej: cambio de avatar)
      if (trigger === "update" && session?.avatar !== undefined) {
        token.avatar = session.avatar;
      }

      // Auto-refresh: si el access token vence en menos de 5min, renovarlo
      const accessToken = token.accessToken as string;
      const expiresAt = parseJwtExpiry(accessToken);
      if (expiresAt - Date.now() > ACCESS_TOKEN_REFRESH_THRESHOLD_MS) {
        return token; // todavía es válido
      }

      const refreshToken = token.refreshToken as string | undefined;
      if (!refreshToken) return token;

      const refreshed = await refreshAccessToken(refreshToken);
      if (!refreshed) {
        // refresh token expirado — forzar re-login
        return { ...token, error: "RefreshTokenExpired" };
      }

      return {
        ...token,
        accessToken: refreshed.token,
        refreshToken: refreshed.refreshToken,
      };
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.accessToken = token.accessToken as string;
        session.user.profileId = token.profileId as string;
        session.user.avatar = token.avatar as string | undefined;
        session.error = token.error as string | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días (controlado por refresh token)
  },

  secret: process.env.NEXTAUTH_SECRET,
};
