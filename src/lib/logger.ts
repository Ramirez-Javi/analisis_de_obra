/**
 * logger.ts — Logger estructurado para reemplazar console.error/warn bare.
 *
 * En desarrollo: salida legible con prefijo colorido.
 * En producción: JSON estructurado listo para ingestarse en Datadog, Papertrail,
 *                Logtail, Axiom, Grafana Loki, etc.
 *
 * USO:
 *   import { logger } from "@/lib/logger";
 *   logger.error("compras", "crearProveedor falló", { err: String(e) });
 *   logger.warn("financiero", "monto cero detectado", { proyectoId });
 *   logger.info("auth", "usuario logeado", { email });
 *
 * Compatible con Edge y Node.js runtimes.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  ts: string;
}

const PREFIXES: Record<LogLevel, string> = {
  info:  "ℹ",
  warn:  "⚠",
  error: "✖",
};

function log(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    level,
    context,
    message,
    ...(data ? { data } : {}),
    ts: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    // Pretty en desarrollo — más fácil de leer en terminal
    const prefix = PREFIXES[level];
    const tag = `[${context}]`;
    if (data) {
      console[level](`${prefix} ${tag} ${message}`, data);
    } else {
      console[level](`${prefix} ${tag} ${message}`);
    }
  } else {
    // JSON estructurado en producción — ingestible por cualquier aggregator de logs
    console[level](JSON.stringify(entry));
  }
}

export const logger = {
  info: (context: string, message: string, data?: Record<string, unknown>) =>
    log("info", context, message, data),

  warn: (context: string, message: string, data?: Record<string, unknown>) =>
    log("warn", context, message, data),

  error: (context: string, message: string, data?: Record<string, unknown>) =>
    log("error", context, message, data),
};
