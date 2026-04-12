/**
 * rate-limit.ts — Limiter de intentos de login por clave (email o IP).
 * Node.js runtime únicamente (authorize callback de auth.ts).
 * Para deployments multi-instancia o producción cloud, reemplazar con Redis.
 */

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

/** Limpia registros expirados cada 5 minutos para evitar memory leaks */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Verifica si la clave está dentro del límite permitido.
 * Registra el intento independientemente del resultado.
 */
export function checkRateLimit(key: string): {
  allowed: boolean;
  remainingMs?: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true };
}

/** Resetea el contador de intentos para una clave (ej: login exitoso) */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
