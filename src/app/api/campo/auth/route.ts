import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signCampoToken, verifyCampoToken, CAMPO_COOKIE, CAMPO_MAX_AGE } from "@/lib/campo-session";
import bcrypt from "bcryptjs";

// ─── GET: estado de sesión ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.cookies.get(CAMPO_COOKIE)?.value;
  if (!token) return NextResponse.json({ autenticado: false });
  const payload = await verifyCampoToken(token);
  if (!payload) return NextResponse.json({ autenticado: false });
  return NextResponse.json({ autenticado: true, ...payload });
}

// ─── POST: autenticar con PIN ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { proyectoId?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const { proyectoId, pin } = body;

  if (!proyectoId || !pin) {
    return NextResponse.json({ error: "proyectoId y pin son requeridos" }, { status: 400 });
  }

  // Validar formato del PIN (solo dígitos, 4–6 caracteres)
  if (!/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN inválido" }, { status: 400 });
  }

  // Verificar que el proyecto existe
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true },
  });
  if (!proyecto) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  // Buscar accesos de campo activos para este proyecto
  const accesos = await prisma.campoAcceso.findMany({
    where: { proyectoId, activo: true },
    select: { id: true, nombre: true, apellido: true, pinHash: true },
  });

  // Verificar el PIN contra cada acceso (timing-safe con bcrypt)
  let accesoAutenticado: { id: string; nombre: string; apellido: string } | null = null;
  for (const a of accesos) {
    if (await bcrypt.compare(pin, a.pinHash)) {
      accesoAutenticado = { id: a.id, nombre: a.nombre, apellido: a.apellido };
      break;
    }
  }

  if (!accesoAutenticado) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  // Generar token
  const token = await signCampoToken({
    usuarioId: accesoAutenticado.id,
    nombre: `${accesoAutenticado.nombre} ${accesoAutenticado.apellido}`.trim(),
    proyectoId,
  });

  const response = NextResponse.json({
    ok: true,
    nombre: `${accesoAutenticado.nombre} ${accesoAutenticado.apellido}`.trim(),
    proyectoId,
  });

  response.cookies.set(CAMPO_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CAMPO_MAX_AGE,
  });

  return response;
}

// ─── DELETE: cerrar sesión de campo ──────────────────────────────────────────

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(CAMPO_COOKIE);
  return response;
}
