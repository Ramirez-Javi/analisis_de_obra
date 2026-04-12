/**
 * crypto.ts — Cifrado simétrico AES-256-GCM para datos sensibles en DB.
 *
 * Uso principal: cifrar/descifrar secretos TOTP antes de persistirlos.
 *
 * CONFIGURACIÓN:
 *   TOTP_ENCRYPTION_KEY=<64 caracteres hexadecimales> en .env.local
 *
 * Generar una clave segura con:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * COMPATIBILIDAD HACIA ATRÁS:
 *   Si el valor almacenado NO contiene ':', se trata como texto plano (sin cifrar).
 *   Esto permite migración gradual sin romper registros existentes.
 *
 * Runtime: Node.js únicamente (no Edge).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;   // 96 bits recomendado para GCM
const TAG_BYTES = 16;  // 128 bits — máximo de seguridad

function getTotpKey(): Buffer | null {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex) return null; // cifrado deshabilitado (entorno sin configurar)
  if (hex.length !== 64) {
    throw new Error(
      "[crypto] TOTP_ENCRYPTION_KEY debe ser exactamente 64 caracteres hex (256 bits). " +
      "Generá una con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Cifra un secreto TOTP (base32) con AES-256-GCM.
 * Si TOTP_ENCRYPTION_KEY no está configurada, devuelve el texto sin cifrar
 * (compatibilidad con entornos de desarrollo que no tienen la clave configurada).
 *
 * Formato del resultado: "<iv_b64>:<tag_b64>:<ciphertext_b64>"
 */
export function encryptTotpSecret(plaintext: string): string {
  const key = getTotpKey();
  if (!key) return plaintext; // sin clave → sin cifrado

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Descifra un secreto TOTP previamente cifrado con encryptTotpSecret().
 * Si el valor no está en el formato cifrado (sin ':'), lo devuelve tal cual
 * para compatibilidad con registros creados antes de activar el cifrado.
 */
export function decryptTotpSecret(stored: string): string {
  // Formato sin cifrar (base32 normal) — no contiene ':'
  if (!stored.includes(":")) return stored;

  const key = getTotpKey();
  if (!key) {
    throw new Error(
      "[crypto] El secreto TOTP está cifrado pero TOTP_ENCRYPTION_KEY no está configurada. " +
      "Agregá la variable de entorno para descifrar."
    );
  }

  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("[crypto] Formato de secreto TOTP cifrado inválido.");
  }

  const [ivB64, tagB64, encB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/**
 * Indica si un secreto almacenado está cifrado (tiene el formato iv:tag:ciphertext).
 */
export function isTotpEncrypted(stored: string): boolean {
  return stored.includes(":") && stored.split(":").length === 3;
}
