import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NextAuth default cookie names (varies by environment)
const SESSION_COOKIES = [
  "__Secure-next-auth.session-token", // HTTPS (production)
  "next-auth.session-token",          // HTTP (dev) or custom
];

// If the session cookie is larger than ~4KB it contains old data (e.g. base64 avatar)
// and will cause Vercel's 494 REQUEST_HEADER_TOO_LARGE error.
// We detect it here and clear it so the user is redirected to login cleanly.
const MAX_COOKIE_BYTES = 4000;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for oversized session cookie — auto-clear it
  for (const name of SESSION_COOKIES) {
    const cookie = req.cookies.get(name);
    if (cookie && cookie.value.length > MAX_COOKIE_BYTES) {
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete(name);
      return res;
    }
  }

  // Verify JWT token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string;

  // Role-based route protection
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/trainer") && role !== "TRAINER") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/client") && role !== "CLIENT") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/trainer/:path*", "/client/:path*"],
};
