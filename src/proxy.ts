/**
 * proxy.ts — Edge Runtime (patrón oficial Next.js 16+ / NextAuth v5)
 *
 * Responsabilidades:
 * 1. Autenticación y autorización por módulo (RBAC)
 * 2. Generación de nonce para Content-Security-Policy
 * 3. Headers de seguridad dinámicos (CSP con nonce)
 * 4. CORS explícito para rutas /api/*
 */
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse, type NextRequest } from "next/server";

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

// Orígenes permitidos para CORS en rutas /api/*
const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "https://tekoinnova.com"];

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function handleCors(req: NextRequest, response: NextResponse): NextResponse {
  const origin = req.headers.get("origin") ?? "";
  const isPreflight = req.method === "OPTIONS";

  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set("Vary", "Origin");
  }

  if (isPreflight) {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const proxy = auth(function (req) {
  const { pathname } = req.nextUrl;

  // ── Generar nonce criptográfico (Edge Runtime compatible) ─────────────────
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // ── Rutas públicas ────────────────────────────────────────────────────────
  const publicPaths = ["/login", "/registro", "/sin-acceso", "/api/debug-auth", "/campo", "/api/campo"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next({
      request: { headers: new Headers({ ...Object.fromEntries(req.headers), "x-nonce": nonce }) },
    });
    res.headers.set("Content-Security-Policy", csp);
    return pathname.startsWith("/api") ? handleCors(req, res) : res;
  }

  // ── CORS para preflight /api/* ────────────────────────────────────────────
  if (pathname.startsWith("/api") && req.method === "OPTIONS") {
    const res = NextResponse.next();
    return handleCors(req, res);
  }

  // ── Verificar autenticación ───────────────────────────────────────────────
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = req.auth.user as { role?: string; permisos?: string[]; activo?: boolean };
  const role = user?.role;

  // ── Cuenta desactivada — forzar logout inmediatamente ────────────────────
  // token.activo se re-valida cada 5 min desde auth.ts (Node.js jwt callback)
  if (user.activo === false) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "cuenta-desactivada");
    return NextResponse.redirect(loginUrl);
  }

  // ── Rutas /admin — solo ADMIN ─────────────────────────────────────────────
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/sin-acceso", req.url));
  }

  // ── Verificar permisos por módulo para usuarios no-admin ──────────────────
  if (role !== "ADMIN") {
    const permisos = user?.permisos ?? [];
    for (const { pattern, modulo } of MODULO_POR_RUTA) {
      if (pattern.test(pathname) && !permisos.includes(modulo)) {
        return NextResponse.redirect(new URL("/sin-acceso", req.url));
      }
    }
  }

  // ── Propagar nonce y añadir CSP ───────────────────────────────────────────
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);

  return pathname.startsWith("/api") ? handleCors(req, res) : res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
