/**
 * GET /api/health — Endpoint de salud para monitoreo externo.
 *
 * Verifica que el servidor responde y la base de datos es accesible.
 * Retorna HTTP 200 si todo está bien, HTTP 503 si la DB está caída.
 *
 * Para usar con Uptime monitoring (UptimeRobot, Better Uptime, Checkly, etc.)
 * o con orquestadores (Docker, Kubernetes liveness probe).
 *
 * EJEMPLO de respuesta OK:
 *   { "status": "ok", "db": "connected", "ts": "2026-04-11T10:00:00.000Z" }
 *
 * EJEMPLO de respuesta degradada (DB down):
 *   { "status": "error", "db": "disconnected", "error": "Connection refused" }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();

  try {
    // Ping a la base de datos — query mínima
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        latencyMs: Date.now() - start,
        ts: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
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
}
