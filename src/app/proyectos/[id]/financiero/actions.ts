"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { handlePrismaError } from "@/lib/prisma-errors";
import type { MetodoPago, TipoMovimiento } from "@prisma/client";
import { audit } from "@/lib/audit";
import { crearMovimientoSchema } from "@/lib/schemas";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

/**
 * Verifica que el proyecto existe Y pertenece a la empresa del usuario activo.
 * Previene IDOR (Insecure Direct Object Reference) en todas las operaciones financieras.
 */
async function requireProyectoAccess(proyectoId: string) {
  const session = await requireAuth();
  const empresaId = (session.user as { empresaId?: string }).empresaId;

  const proyecto = await prisma.proyecto.findFirst({
    where: {
      id: proyectoId,
      empresaId: empresaId ?? "", // string vacío garantiza que no coincide si no hay empresa
    },
    select: { id: true },
  });

  if (!proyecto) {
    throw new Error("Proyecto no encontrado o sin acceso");
  }

  return { session, proyectoId: proyecto.id };
}

// ─────────────────────────────────────────────
// OBTENER movimientos del libro mayor
// ─────────────────────────────────────────────
export async function getMovimientos(proyectoId: string) {
  await requireAuth();
  const rows = await prisma.movimientoFinanciero.findMany({
    where: { proyectoId },
    include: { proveedor: { select: { razonSocial: true, ruc: true } } },
    orderBy: { fecha: "asc" },
    take: 1000, // límite de seguridad
  });
  // Decimal → number en el boundary Server/Client
  return rows.map((m) => ({ ...m, monto: Number(m.monto) }));
}

// ─────────────────────────────────────────────
// CREAR movimiento
// ─────────────────────────────────────────────
export interface NuevoMovimientoData {
  fecha: string;
  tipo: TipoMovimiento;
  concepto: string;
  beneficiario: string;
  monto: number;
  nroComprobante?: string;
  autorizadoPor?: string;
  realizadoPor?: string;
  metodoPago: MetodoPago;
  otroMetodoDetalle?: string;
  // Cheque
  nroCheque?: string;
  bancoCheque?: string;
  fechaEmisionCheque?: string;
  fechaCobroCheque?: string;
  // Transferencia/Giro
  nroTransaccion?: string;
  bancoTransfer?: string;
  observacion?: string;
  // Trazabilidad opcional
  proveedorId?: string;
  cuotaPagoId?: string;
  contratoManoObraId?: string;
}

export async function crearMovimiento(proyectoId: string, data: NuevoMovimientoData) {
  const { session } = await requireProyectoAccess(proyectoId);

  // Validación Zod runtime — rechaza datos malformados antes de tocar la DB
  const parsed = crearMovimientoSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const validated = parsed.data;

  try {
    const movimientoData = {
      proyectoId,
      fecha: new Date(validated.fecha),
      tipo: validated.tipo,
      concepto: validated.concepto,
      beneficiario: validated.beneficiario,
      monto: validated.monto,
      nroComprobante: validated.nroComprobante || null,
      autorizadoPor: validated.autorizadoPor || null,
      realizadoPor: validated.realizadoPor || null,
      metodoPago: validated.metodoPago,
      otroMetodoDetalle: validated.otroMetodoDetalle || null,
      nroCheque: validated.nroCheque || null,
      bancoCheque: validated.bancoCheque || null,
      fechaEmisionCheque: validated.fechaEmisionCheque ? new Date(validated.fechaEmisionCheque) : null,
      fechaCobroCheque: validated.fechaCobroCheque ? new Date(validated.fechaCobroCheque) : null,
      nroTransaccion: validated.nroTransaccion || null,
      bancoTransfer: validated.bancoTransfer || null,
      observacion: validated.observacion || null,
      proveedorId: validated.proveedorId || null,
      cuotaPagoId: validated.cuotaPagoId || null,
      contratoManoObraId: validated.contratoManoObraId || null,
      autorizadoPorUsuarioId: session.user.id,
    };

    // Si hay cuotaPagoId, marcar la cuota como PAGADA en la misma transacción
    if (validated.cuotaPagoId) {
      await prisma.$transaction([
        prisma.movimientoFinanciero.create({ data: movimientoData }),
        prisma.cuotaPago.update({
          where: { id: validated.cuotaPagoId },
          data: { estado: "PAGADA" },
        }),
      ]);
    } else {
      await prisma.movimientoFinanciero.create({ data: movimientoData });
    }

    const actorId = (session.user as { id?: string }).id;
    const actorEmail = (session.user as { email?: string }).email ?? undefined;
    audit({ accion: "MOVIMIENTO_CREADO", entidad: "MovimientoFinanciero", userId: actorId, userEmail: actorEmail, despues: { proyectoId, tipo: validated.tipo, monto: validated.monto, concepto: validated.concepto } }).catch(() => {});

    revalidatePath(`/proyectos/${proyectoId}/financiero`);
    return { ok: true };
  } catch (err) {
    const { message } = handlePrismaError(err);
    return { ok: false, error: message };
  }
}

// ─────────────────────────────────────────────
// ACTUALIZAR movimiento
// ─────────────────────────────────────────────
export async function actualizarMovimiento(proyectoId: string, movimientoId: string, data: NuevoMovimientoData) {
  const { session } = await requireProyectoAccess(proyectoId);

  const parsed = crearMovimientoSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const validated = parsed.data;

  try {
    await prisma.movimientoFinanciero.update({
      where: { id: movimientoId, proyectoId },
      data: {
        fecha: new Date(validated.fecha),
        tipo: validated.tipo,
        concepto: validated.concepto,
        beneficiario: validated.beneficiario,
        monto: validated.monto,
        nroComprobante: validated.nroComprobante || null,
        autorizadoPor: validated.autorizadoPor || null,
        realizadoPor: validated.realizadoPor || null,
        metodoPago: validated.metodoPago,
        otroMetodoDetalle: validated.otroMetodoDetalle || null,
        nroCheque: validated.nroCheque || null,
        bancoCheque: validated.bancoCheque || null,
        fechaEmisionCheque: validated.fechaEmisionCheque ? new Date(validated.fechaEmisionCheque) : null,
        fechaCobroCheque: validated.fechaCobroCheque ? new Date(validated.fechaCobroCheque) : null,
        nroTransaccion: validated.nroTransaccion || null,
        bancoTransfer: validated.bancoTransfer || null,
        observacion: validated.observacion || null,
      },
    });

    const actorId = (session.user as { id?: string }).id;
    const actorEmail = (session.user as { email?: string }).email ?? undefined;
    audit({ accion: "MOVIMIENTO_EDITADO" as never, entidad: "MovimientoFinanciero", entidadId: movimientoId, userId: actorId, userEmail: actorEmail }).catch(() => {});

    revalidatePath(`/proyectos/${proyectoId}/financiero`);
    return { ok: true };
  } catch (err) {
    const { message } = handlePrismaError(err);
    return { ok: false, error: message };
  }
}

// ─────────────────────────────────────────────
// ELIMINAR movimiento
// ─────────────────────────────────────────────
export async function eliminarMovimiento(proyectoId: string, movimientoId: string) {
  const { session } = await requireProyectoAccess(proyectoId);
  try {
    // Bind explícito proyectoId → garantiza que solo se elimina el movimiento
    // si pertenece a este proyecto (previene IDOR cross-project)
    await prisma.movimientoFinanciero.delete({
      where: { id: movimientoId, proyectoId },
    });

    const actorId = (session.user as { id?: string }).id;
    const actorEmail = (session.user as { email?: string }).email ?? undefined;
    audit({ accion: "MOVIMIENTO_ELIMINADO", entidad: "MovimientoFinanciero", entidadId: movimientoId, userId: actorId, userEmail: actorEmail }).catch(() => {});

    revalidatePath(`/proyectos/${proyectoId}/financiero`);
    return { ok: true };
  } catch (err) {
    const { message } = handlePrismaError(err);
    return { ok: false, error: message };
  }
}
