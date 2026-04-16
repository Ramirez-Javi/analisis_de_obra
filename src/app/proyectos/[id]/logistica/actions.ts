"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { TipoCostoIndirecto, MetodoPago, TipoMovimiento } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrearCostoIndirectoData {
  descripcion: string;
  tipo: TipoCostoIndirecto;
  monto: number;
  proveedor?: string;
  fecha?: string;
  comprobante?: string;
  metodoPago?: MetodoPago;
}

// Mapeo TipoCostoIndirecto → TipoMovimiento
const TIPO_MOVIMIENTO_MAP: Record<TipoCostoIndirecto, TipoMovimiento> = {
  ALQUILER_MAQUINARIA: "EGRESO_MAQUINARIA",
  FLETE: "EGRESO_OTRO",
  HONORARIOS_PROYECTO: "EGRESO_HONORARIO",
  GASTO_ADMINISTRATIVO: "EGRESO_CAJA_CHICA",
  SEGURO: "EGRESO_OTRO",
  OTRO: "EGRESO_OTRO",
};

// ─── Crear costo indirecto ────────────────────────────────────────────────────

export async function crearCostoIndirecto(
  proyectoId: string,
  data: CrearCostoIndirectoData
) {
  const metodoPago = data.metodoPago ?? "EFECTIVO";
  const fecha = data.fecha ? new Date(data.fecha) : new Date();
  const tipoMovimiento = TIPO_MOVIMIENTO_MAP[data.tipo];

  const { costo } = await prisma.$transaction(async (tx) => {
    const costo = await tx.costoIndirecto.create({
      data: {
        descripcion: data.descripcion,
        tipo: data.tipo,
        monto: data.monto,
        proveedor: data.proveedor,
        fecha,
        comprobante: data.comprobante,
        proyectoId,
      },
    });

    await tx.movimientoFinanciero.create({
      data: {
        fecha,
        tipo: tipoMovimiento,
        concepto: data.descripcion,
        beneficiario: data.proveedor ?? "Sin especificar",
        monto: data.monto,
        metodoPago,
        proyectoId,
      },
    });

    return { costo };
  });

  revalidatePath(`/proyectos/${proyectoId}/logistica`);
  revalidatePath(`/proyectos/${proyectoId}/financiero`);

  return { ok: true, id: costo.id };
}

// ─── Actualizar costo indirecto ───────────────────────────────────────────────

export async function actualizarCostoIndirecto(
  proyectoId: string,
  id: string,
  data: Partial<CrearCostoIndirectoData>
) {
  await prisma.costoIndirecto.update({
    where: { id },
    data: {
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.monto !== undefined && { monto: data.monto }),
      ...(data.proveedor !== undefined && { proveedor: data.proveedor }),
      ...(data.fecha !== undefined && { fecha: new Date(data.fecha) }),
      ...(data.comprobante !== undefined && { comprobante: data.comprobante }),
    },
  });

  revalidatePath(`/proyectos/${proyectoId}/logistica`);
  return { ok: true };
}

// ─── Eliminar costo indirecto ─────────────────────────────────────────────────

export async function eliminarCostoIndirecto(proyectoId: string, id: string) {
  await prisma.costoIndirecto.delete({ where: { id } });

  revalidatePath(`/proyectos/${proyectoId}/logistica`);
  revalidatePath(`/proyectos/${proyectoId}/financiero`);

  return { ok: true };
}
