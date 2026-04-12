/**
 * totp.ts — Utilidades de autenticación de dos factores (TOTP / RFC 6238).
 * Node.js runtime únicamente — no Edge.
 *
 * Algoritmo: SHA-1, 6 dígitos, período 30 segundos.
 * Compatible con Google Authenticator, Authy, 1Password, Bitwarden, etc.
 */
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "TEKOINNOVA CMD";

/**
 * Genera un nuevo secreto TOTP aleatorio (base32, 160 bits).
 * Devuelve la representación base32 que se almacena en DB.
 */
export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 }); // 20 bytes = 160 bits
  return secret.base32;
}

/**
 * Construye la URI otpauth:// estándar para ser codificada como QR.
 * Esta URI puede abrirse directamente desde Google Authenticator.
 */
export function buildTotpUri(email: string, secretBase32: string): string {
  const secret = OTPAuth.Secret.fromBase32(secretBase32);
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return totp.toString();
}

/**
 * Genera un QR como data URL PNG listo para mostrar en un <img>.
 * Solo llamar en Server Actions (Node.js runtime).
 */
export async function generateTotpQR(email: string, secretBase32: string): Promise<string> {
  const uri = buildTotpUri(email, secretBase32);
  return QRCode.toDataURL(uri, {
    width: 240,
    margin: 2,
    color: { dark: "#0f172a", light: "#f8fafc" },
  });
}

/**
 * Verifica un código TOTP de 6 dígitos.
 * Tolera ±1 período (30 s) para compensar desfasajes de reloj.
 * Devuelve true si el código es válido.
 */
export function verifyTotpCode(secretBase32: string, token: string): boolean {
  if (!secretBase32 || !/^\d{6}$/.test(token.trim())) return false;
  try {
    const secret = OTPAuth.Secret.fromBase32(secretBase32);
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });
    const delta = totp.validate({ token: token.trim(), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}
