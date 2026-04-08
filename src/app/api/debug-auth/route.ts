import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const u = await prisma.usuario.findFirst({
      select: { id: true, email: true, activo: true, password: true },
    });
    if (!u) return NextResponse.json({ ok: false, error: "Usuario no encontrado" });

    const match = await bcrypt.compare("Admin1234!", u.password);
    return NextResponse.json({ ok: true, email: u.email, activo: u.activo, passwordMatch: match });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
