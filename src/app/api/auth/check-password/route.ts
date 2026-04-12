/**
 * POST /api/auth/check-password
 * Verifica email + contraseña y devuelve si el usuario requiere TOTP.
 * Esto permite que el cliente muestre el campo 2FA antes de llamar a signIn().
 *
 * Respuesta: { valid: boolean; totpRequired: boolean }
 * - valid=false → credenciales incorrectas o usuario inactivo
 * - valid=true, totpRequired=true → debe ingresar código 2FA
 * - valid=true, totpRequired=false → puede llamar a signIn() directamente
 *
 * SEGURIDAD: también aplica rate limiting para prevenir enumeración.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ valid: false, totpRequired: false }, { status: 200 });
    }

    const { email, password } = parsed.data;

    // Rate limiting — misma clave que auth.ts para compartir contadores
    const rl = checkRateLimit(email);
    if (!rl.allowed) {
      return NextResponse.json({ valid: false, totpRequired: false }, { status: 429 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        password: true,
        activo: true,
        totpEnabled: true,
      },
    });

    if (!usuario || !usuario.activo) {
      // Timing-safe: always run bcrypt even on missing user
      await bcrypt.compare(password, "$2a$12$invalidhashplaceholder00000000000000000000000000000");
      return NextResponse.json({ valid: false, totpRequired: false }, { status: 200 });
    }

    const passwordMatch = await bcrypt.compare(password, usuario.password);
    if (!passwordMatch) {
      return NextResponse.json({ valid: false, totpRequired: false }, { status: 200 });
    }

    return NextResponse.json(
      { valid: true, totpRequired: usuario.totpEnabled },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ valid: false, totpRequired: false }, { status: 500 });
  }
}
