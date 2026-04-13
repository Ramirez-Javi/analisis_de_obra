import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const CAMPO_COOKIE = "campo_token";
const CAMPO_MAX_AGE = 8 * 60 * 60; // 8 horas

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET ?? "campo-dev-secret-change-in-production";
  return new TextEncoder().encode(`campo|${raw}`);
}

export interface CampoPayload {
  usuarioId: string;
  nombre: string;
  proyectoId: string;
}

export async function signCampoToken(payload: CampoPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyCampoToken(token: string): Promise<CampoPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as CampoPayload;
  } catch {
    return null;
  }
}

/** Lee el payload del cookie de sesión de campo. Devuelve null si no existe o expiró. */
export async function getCampoSession(): Promise<CampoPayload | null> {
  const jar = await cookies();
  const token = jar.get(CAMPO_COOKIE)?.value;
  if (!token) return null;
  return verifyCampoToken(token);
}

export { CAMPO_MAX_AGE };
