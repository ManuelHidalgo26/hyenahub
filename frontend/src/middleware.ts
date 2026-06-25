import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NextAuth usa distintos nombres de cookie según el entorno (HTTP vs HTTPS) y
// además parte la cookie en fragmentos (.0, .1, …) cuando supera ~4 KB.
// Cubrimos todas las variantes para poder leerlas y, sobre todo, limpiarlas.
const BASE_COOKIE_NAMES = [
  "__Secure-next-auth.session-token", // HTTPS (producción)
  "next-auth.session-token",          // HTTP (desarrollo) o detrás de proxy
];
const COOKIE_VARIANTS = (base: string) => [base, `${base}.0`, `${base}.1`, `${base}.2`];

// Una cookie de sesión mayor a ~4 KB suele contener datos viejos (p. ej. un
// avatar en base64 de versiones anteriores) y provoca el error 494
// REQUEST_HEADER_TOO_LARGE. La detectamos y forzamos un re-login limpio.
const MAX_COOKIE_BYTES = 4000;

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Respuesta que limpia TODAS las variantes de la cookie de sesión (nombre base
 * + fragmentos .0/.1/…) y redirige al login. Así un cliente con una cookie
 * vieja, sobredimensionada o corrupta no queda atrapado viendo un error: se le
 * pide iniciar sesión de nuevo y queda con una sesión sana.
 */
function forceReLogin(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  for (const base of BASE_COOKIE_NAMES) {
    for (const name of COOKIE_VARIANTS(base)) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Cookie de sesión sobredimensionada → re-login limpio.
  for (const base of BASE_COOKIE_NAMES) {
    for (const name of COOKIE_VARIANTS(base)) {
      const cookie = req.cookies.get(name);
      if (cookie && cookie.value.length > MAX_COOKIE_BYTES) {
        return forceReLogin(req);
      }
    }
  }

  // 2) Validar el JWT. Fijamos `secureCookie` según el entorno para que el
  //    middleware lea SIEMPRE la misma cookie que escribió NextAuth, sin
  //    depender de que NEXTAUTH_URL empiece por "https://" (una causa típica
  //    de que el token "no se encuentre" en producción detrás de un proxy).
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: IS_PROD,
  });

  // Sin token, o token viejo/corrupto sin rol → re-login limpio (NO un 403).
  // Antes, un token sin `role` (por sesiones viejas de antes de los cambios de
  // auth) caía en la verificación de rol de abajo y terminaba en /unauthorized,
  // dejando al cliente con un "403" sin salida. Ahora simplemente re-autentica.
  if (!token || !token.role) {
    return forceReLogin(req);
  }

  const role = token.role as string;

  // 3) Protección por rol. Solo aquí mostramos 403, y únicamente cuando un
  //    usuario CON un rol válido intenta entrar al área de otro rol.
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
