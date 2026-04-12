/**
 * Audit Logging — Registro inmutable de acciones críticas del sistema
 *
 * Uso desde Server Actions:
 *   audit({ accion: "PROYECTO_CREADO", entidad: "Proyecto", entidadId: id, despues: data }).catch(() => {});
 *
 * NUNCA bloquea el flujo: siempre llamar con .catch(() => {})
 * Los errores de auditoría se loguean pero no interrumpen la operación principal.
 */

import { prisma } from "@/lib/prisma";
import { AccionAudit, Prisma } from "@prisma/client";
import { headers } from "next/headers";

export type { AccionAudit };

export interface AuditParams {
  /** Acción que se realizó (enum AccionAudit) */
  accion: AccionAudit;
  /** Nombre de la entidad afectada ("Proyecto", "Usuario", etc.) */
  entidad: string;
  /** ID del registro afectado (opcional) */
  entidadId?: string;
  /** Estado previo del registro (para ediciones/eliminaciones) */
  antes?: Record<string, unknown>;
  /** Estado posterior del registro (para creaciones/ediciones) */
  despues?: Record<string, unknown>;
  /** ID del usuario que realizó la acción */
  userId?: string;
  /** Email del usuario que realizó la acción */
  userEmail?: string;
  /** Si la acción fue exitosa */
  exito?: boolean;
  /** Mensaje de error si exito=false */
  error?: string;
}

/**
 * Escribe una entrada de auditoría en la base de datos.
 *
 * Extrae automáticamente IP y User-Agent de los headers de la request.
 * Siempre usar con .catch(() => {}) para no bloquear el flujo principal.
 */
export async function audit(params: AuditParams): Promise<void> {
  const {
    accion,
    entidad,
    entidadId,
    antes,
    despues,
    userId,
    userEmail,
    exito = true,
    error,
  } = params;

  let ip: string | undefined;
  let userAgent: string | undefined;

  try {
    const hdrs = await headers();
    ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      undefined;
    userAgent = hdrs.get("user-agent") ?? undefined;
  } catch {
    // headers() puede fallar fuera del contexto de request (ej: scripts)
  }

  await prisma.auditLog.create({
    data: {
      accion,
      entidad,
      entidadId,
      antes: (antes ?? undefined) as Prisma.InputJsonValue | undefined,
      despues: (despues ?? undefined) as Prisma.InputJsonValue | undefined,
      userId,
      userEmail,
      ip,
      userAgent,
      exito,
      error,
    },
  });
}
