/**
 * GET /api/health — Endpoint de salud para monitoreo externo.
 *
 * Verifica que el servidor responde y la base de datos es accesible.
 * Retorna HTTP 200 si todo está bien, HTTP 503 si la DB está caída.
 *
 * Respuesta para visitantes no autenticados (monitoreo externo):
 *   { "status": "ok" } | { "status": "error" }
 *
 * Respuesta para usuarios autenticados (panel de admin):
 *   { "status": "ok", "db": "connected", "latencyMs": 12, "ts": "..." }
 *   { "status": "error", "db": "disconnected", "error": "...", "ts": "..." }
 *
 * La separación evita exponer mensajes de error de la DB a terceros (OWASP A05).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);
  const start = Date.now();

  try {
    // Ping a la base de datos — query mínima
    await prisma.$queryRaw`SELECT 1`;

    if (isAuthenticated) {
      return NextResponse.json(
        {
          status: "ok",
          db: "connected",
          latencyMs: Date.now() - start,
          ts: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    if (isAuthenticated) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      return NextResponse.json(
        {
          status: "error",
          db: "disconnected",
          error: message,
          ts: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
