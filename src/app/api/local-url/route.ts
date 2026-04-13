import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import os from "os";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/local-url
 * Devuelve la/s IP(s) locales del servidor para que las demás PCs de la
 * misma red WiFi puedan conectarse a la aplicación.
 * Solo accesible para usuarios autenticados.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const port = process.env.PORT ?? "3000";
  const interfaces = os.networkInterfaces();

  const urls: string[] = [];

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      // Solo IPv4, no loopback (127.x)
      if (addr.family === "IPv4" && !addr.internal) {
        urls.push(`http://${addr.address}:${port}`);
      }
    }
  }

  return NextResponse.json({ urls });
}
