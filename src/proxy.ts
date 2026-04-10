import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Mapa de segmentos de ruta → módulo requerido (solo aplica a USUARIO, no ADMIN)
const MODULO_POR_RUTA: Array<{ pattern: RegExp; modulo: string }> = [
  { pattern: /\/ficha(\/|$)/, modulo: "PROYECTO" },
  { pattern: /\/presupuesto(\/|$)/, modulo: "PRESUPUESTO" },
  { pattern: /\/cronograma(\/|$)/, modulo: "CRONOGRAMA" },
  { pattern: /\/mano-obra(\/|$)/, modulo: "MANO_OBRA" },
  { pattern: /\/logistica(\/|$)/, modulo: "LOGISTICA" },
  { pattern: /\/reportes(\/|$)/, modulo: "REPORTES" },
  { pattern: /\/financiero(\/|$)/, modulo: "FINANCIERO" },
  { pattern: /\/compras(\/|$)/, modulo: "COMPRAS" },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas — sin autenticación
  const publicPaths = ["/login", "/registro", "/sin-acceso", "/api/debug-auth"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verificar JWT
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rutas de administración — solo ADMIN
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/sin-acceso", req.url));
  }

  // Control de permisos por módulo — solo aplica a USUARIO (ADMIN tiene acceso total)
  if (token.role !== "ADMIN") {
    const permisos = (token.permisos as string[]) ?? [];
    for (const { pattern, modulo } of MODULO_POR_RUTA) {
      if (pattern.test(pathname) && !permisos.includes(modulo)) {
        return NextResponse.redirect(new URL("/sin-acceso", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
