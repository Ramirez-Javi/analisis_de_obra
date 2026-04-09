"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { MetodoPago, TipoMovimiento, CategoriaMovimiento } from "@prisma/client";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

// ─────────────────────────────────────────────
// OBTENER movimientos del libro mayor
// ─────────────────────────────────────────────
export async function getMovimientos(proyectoId: string) {
  await requireAuth();
  return prisma.movimientoFinanciero.findMany({
    where: { proyectoId },
    include: { proveedor: { select: { razonSocial: true } } },
    orderBy: { fecha: "asc" },
  });
}

// ─────────────────────────────────────────────
// CREAR movimiento
// ─────────────────────────────────────────────
export interface NuevoMovimientoData {
  fecha: string;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  concepto: string;
  beneficiario: string;
  monto: number;
  nroComprobante?: string;
  autorizadoPor?: string;
  metodoPago: MetodoPago;
  otroMetodoDetalle?: string;
  // Cheque
  nroCheque?: string;
  bancoCheque?: string;
  fechaEmisionCheque?: string;
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
  const session = await requireAuth();
  try {
    await prisma.movimientoFinanciero.create({
      data: {
        proyectoId,
        fecha: new Date(data.fecha),
        tipo: data.tipo,
        categoria: data.categoria,
        concepto: data.concepto,
        beneficiario: data.beneficiario,
        monto: data.monto,
        nroComprobante: data.nroComprobante || null,
        autorizadoPor: data.autorizadoPor || null,
        metodoPago: data.metodoPago,
        otroMetodoDetalle: data.otroMetodoDetalle || null,
        nroCheque: data.nroCheque || null,
        bancoCheque: data.bancoCheque || null,
        fechaEmisionCheque: data.fechaEmisionCheque ? new Date(data.fechaEmisionCheque) : null,
        nroTransaccion: data.nroTransaccion || null,
        bancoTransfer: data.bancoTransfer || null,
        observacion: data.observacion || null,
        proveedorId: data.proveedorId || null,
        cuotaPagoId: data.cuotaPagoId || null,
        contratoManoObraId: data.contratoManoObraId || null,
        autorizadoPorUsuarioId: session.user.id,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/financiero`);
    return { ok: true };
  } catch (err) {
    console.error("[financiero] crearMovimiento:", err);
    return { ok: false, error: "Error al registrar el movimiento" };
  }
}

// ─────────────────────────────────────────────
// ELIMINAR movimiento
// ─────────────────────────────────────────────
export async function eliminarMovimiento(proyectoId: string, movimientoId: string) {
  await requireAuth();
  try {
    await prisma.movimientoFinanciero.delete({ where: { id: movimientoId } });
    revalidatePath(`/proyectos/${proyectoId}/financiero`);
    return { ok: true };
  } catch (err) {
    console.error("[financiero] eliminarMovimiento:", err);
    return { ok: false, error: "Error al eliminar el movimiento" };
  }
}
