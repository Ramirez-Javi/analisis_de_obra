/**
 * env.ts — Validación de variables de entorno críticas.
 *
 * Importar donde se necesite una variable de entorno para obtener
 * un error descriptivo y temprano en lugar de un crash silencioso.
 *
 * USO:
 *   import { requireEnv } from "@/lib/env";
 *   const dbUrl = requireEnv("DATABASE_URL");
 *
 * Compatible con Edge y Node.js runtimes.
 */

/**
 * Devuelve el valor de una variable de entorno.
 * Lanza un error descriptivo si no está definida.
 */
export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `[env] Variable de entorno requerida no encontrada: "${name}"\n` +
      "→ Verificá tu archivo .env.local y los secrets del servidor (GitHub Actions, Vercel, etc.)"
    );
  }
  return val;
}

/**
 * Devuelve el valor de una variable de entorno o undefined si no está definida.
 * Para variables opcionales.
 */
export function optionalEnv(name: string): string | undefined {
  return process.env[name] ?? undefined;
}

/**
 * Variables de entorno críticas pre-validadas.
 * Las que lanzan error inmediatamente si no están presentes:
 */
export const ENV = {
  /** URL de conexión a PostgreSQL */
  get DATABASE_URL() { return requireEnv("DATABASE_URL"); },
  /** Secreto para firmar tokens JWT de NextAuth v5 (AUTH_SECRET) */
  get AUTH_SECRET() { return requireEnv("AUTH_SECRET"); },
  /** Clave de cifrado TOTP — 64 hex chars (32 bytes AES-256). OPCIONAL: si no está, TOTP se almacena sin cifrar. */
  get TOTP_ENCRYPTION_KEY() { return optionalEnv("TOTP_ENCRYPTION_KEY"); },
  /** Ambiente actual */
  get NODE_ENV() { return process.env.NODE_ENV ?? "development"; },
  get isProduction() { return process.env.NODE_ENV === "production"; },
} as const;
