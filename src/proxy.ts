import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

/**
 * proxy.ts - Edge Runtime (patron oficial NextAuth v5)
 * Instancia sin Prisma para leer authjs.session-token correctamente.
 */
const { auth } = NextAuth(authConfig);

const MODULO_POR_RUTA: Array<{ pattern: RegExp; modulo: string }> = [
  { pattern: /\/ficha(\/|$)/, modulo: "PROYECTO" },
  { pattern: /\/presupuesto(\/|$)/, modulo: "PRESUPUESTO" },
  { pattern: /\/cronograma(\/|$)/, modulo: "CRONOGRAMA" },
  { pattern: /\/mano-obra(\/|$)/, modulo: "MANO_OBRA" },
  { pattern: /\/logistica(\/|$)/, modulo: "LOGISTICA" },
  { pattern: /\/reportes(\/|$)/, modulo: "REPORTES" },
  { pattern: /\/financiero(\/|$)/, modulo: "FINANCIERO" },
  { pattern: /\/compras(\/|$)/, modulo: "COMPRAS" },
  { pattern: /\/inventario(\/|$)/, modulo: "INVENTARIO" },
  { pattern: /\/bitacora(\/|$)/, modulo: "BITACORA" },
];

export const proxy = auth(function (req) {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/registro", "/sin-acceso", "/api/debug-auth"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = req.auth.user as { role?: string; permisos?: string[] };
  const role = user?.role;

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/sin-acceso", req.url));
  }

  if (role !== "ADMIN") {
    const permisos = user?.permisos ?? [];
    for (const { pattern, modulo } of MODULO_POR_RUTA) {
      if (pattern.test(pathname) && !permisos.includes(modulo)) {
        return NextResponse.redirect(new URL("/sin-acceso", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};