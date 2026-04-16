"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { MetodoPago } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegistrarPagoContratoData {
  fecha: string;
  monto: number;
  metodoPago: MetodoPago;
  descripcion?: string;
  comprobante?: string;
  observacion?: string;
}

export interface CrearContratoData {
  jefeCuadrilla: string;
  descripcion: string;
  montoPactado: number;
  porcRetencion?: number;
}

export interface ActualizarContratoData {
  jefeCuadrilla?: string;
  descripcion?: string;
  montoPactado?: number;
  porcRetencion?: number;
}

export interface PersonalData {
  nombre: string;
  apellido: string;
  dni?: string;
  rol: string;
  telefono?: string;
}

// ─── Registrar pago (persiste PagoContrato + MovimientoFinanciero) ─────────────

export async function registrarPagoContrato(
  proyectoId: string,
  contratoId: string,
  jefeCuadrilla: string,
  data: RegistrarPagoContratoData
) {
  const { pago, movimiento } = await prisma.$transaction(async (tx) => {
    const pago = await tx.pagoContrato.create({
      data: {
        monto: data.monto,
        fecha: new Date(data.fecha),
        descripcion: data.descripcion,
        comprobante: data.comprobante,
        contratoId,
      },
    });

    const movimiento = await tx.movimientoFinanciero.create({
      data: {
        fecha: new Date(data.fecha),
        tipo: "EGRESO_PERSONAL",
        concepto: `Pago a cuadrilla: ${jefeCuadrilla}`,
        beneficiario: jefeCuadrilla,
        monto: data.monto,
        metodoPago: data.metodoPago,
        observacion: data.observacion,
        proyectoId,
        contratoManoObraId: contratoId,
      },
    });

    return { pago, movimiento };
  });

  revalidatePath(`/proyectos/${proyectoId}/mano-obra`);
  revalidatePath(`/proyectos/${proyectoId}/financiero`);

  return { ok: true, id: pago.id, movimientoId: movimiento.id };
}

// ─── Eliminar pago ────────────────────────────────────────────────────────────

export async function eliminarPagoContrato(proyectoId: string, pagoId: string) {
  await prisma.pagoContrato.delete({ where: { id: pagoId } });

  revalidatePath(`/proyectos/${proyectoId}/mano-obra`);
  revalidatePath(`/proyectos/${proyectoId}/financiero`);

  return { ok: true };
}

// ─── CRUD contrato ────────────────────────────────────────────────────────────

export async function crearContrato(proyectoId: string, data: CrearContratoData) {
  const contrato = await prisma.contratoManoObra.create({
    data: {
      jefeCuadrilla: data.jefeCuadrilla,
      descripcion: data.descripcion,
      montoPactado: data.montoPactado,
      porcRetencion: data.porcRetencion ?? 5,
      proyectoId,
    },
  });

  revalidatePath(`/proyectos/${proyectoId}/mano-obra`);
  return { ok: true, id: contrato.id };
}

export async function actualizarContrato(
  proyectoId: string,
  contratoId: string,
  data: ActualizarContratoData
) {
  await prisma.contratoManoObra.update({
    where: { id: contratoId },
    data: {
      ...(data.jefeCuadrilla !== undefined && { jefeCuadrilla: data.jefeCuadrilla }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.montoPactado !== undefined && { montoPactado: data.montoPactado }),
      ...(data.porcRetencion !== undefined && { porcRetencion: data.porcRetencion }),
    },
  });

  revalidatePath(`/proyectos/${proyectoId}/mano-obra`);
  return { ok: true };
}

export async function eliminarContrato(proyectoId: string, contratoId: string) {
  await prisma.contratoManoObra.delete({ where: { id: contratoId } });

  revalidatePath(`/proyectos/${proyectoId}/mano-obra`);
  revalidatePath(`/proyectos/${proyectoId}/financiero`);

  return { ok: true };
}

// ─── Personal de cuadrilla ────────────────────────────────────────────────────

export async function agregarPersonal(
  proyectoId: string,
  contratoId: string,
  data: PersonalData
) {
  const personal = await prisma.personalCuadrilla.create({
    data: {
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      rol: data.rol,
      telefono: data.telefono,
      contratoId,
    },
  });

  revalidatePath(`/proyectos/${proyectoId}/mano-obra`);
  return { ok: true, id: personal.id };
}

export async function eliminarPersonal(proyectoId: string, personalId: string) {
  await prisma.personalCuadrilla.delete({ where: { id: personalId } });

  revalidatePath(`/proyectos/${proyectoId}/mano-obra`);
  return { ok: true };
}
