/**
 * prisma-errors.ts — Mapea códigos de error de Prisma a mensajes user-friendly.
 * Previene exponer detalles internos de la base de datos al cliente.
 */
import { Prisma } from "@prisma/client";

export interface AppError {
  message: string;
  code: string;
}

/**
 * Convierte un error de Prisma (o cualquier error) en un mensaje
 * seguro para mostrar al usuario. No expone stack traces ni detalles de DB.
 */
export function handlePrismaError(err: unknown): AppError {
  // Errores de Prisma conocidos
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return {
          code: "DUPLICATE",
          message: "Ya existe un registro con esos datos. Verificá los campos únicos.",
        };
      case "P2003":
        return {
          code: "FOREIGN_KEY",
          message: "No se puede completar la operación porque el registro está relacionado con otros datos.",
        };
      case "P2025":
        return {
          code: "NOT_FOUND",
          message: "El registro no fue encontrado. Puede haber sido eliminado.",
        };
      case "P2014":
        return {
          code: "RELATION_VIOLATION",
          message: "La operación viola una relación requerida entre registros.",
        };
      default:
        return {
          code: "DB_ERROR",
          message: "Error en la base de datos. Intentá nuevamente.",
        };
    }
  }

  // Errores de conexión de Prisma
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return {
      code: "DB_CONNECTION",
      message: "No se pudo conectar a la base de datos. Verificá la conexión.",
    };
  }

  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return {
      code: "DB_PANIC",
      message: "Error crítico en la base de datos. Contactá al administrador.",
    };
  }

  // Errores de autorización lanzados explícitamente
  if (err instanceof Error) {
    if (err.message.includes("No autorizado") || err.message.includes("sin acceso")) {
      return { code: "UNAUTHORIZED", message: err.message };
    }
    if (err.message.includes("no encontrado")) {
      return { code: "NOT_FOUND", message: err.message };
    }
  }

  // Fallback genérico — no exponer el error real
  return {
    code: "UNKNOWN",
    message: "Ocurrió un error inesperado. Intentá nuevamente.",
  };
}

/**
 * Wrapper para Server Actions: captura y convierte errores de Prisma
 * en respuestas { ok: false, error: string } sin exponer detalles internos.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T & { ok: true }>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch (err) {
    const appError = handlePrismaError(err);
    return { ok: false, error: appError.message } as { ok: false; error: string };
  }
}
