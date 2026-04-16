"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { EstadoFactura, MetodoPago } from "@prisma/client";
import { logger } from "@/lib/logger";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

// ─────────────────────────────────────────────
// PROVEEDORES DEL PROYECTO
// Solo los que tienen al menos 1 factura en este proyecto.
// Incluye las facturas del proyecto para calcular estado de cuenta.
// ─────────────────────────────────────────────
export async function getProveedoresDelProyecto(proyectoId: string) {
  await requireAuth();
  const rows = await prisma.proveedor.findMany({
    where: { facturas: { some: { proyectoId } } },
    take: 200,
    include: {
      facturas: {
        where: { proyectoId },
        orderBy: { fecha: "desc" },
        take: 500,
        include: {
          movimiento: {
            select: {
              id: true, fecha: true, metodoPago: true, otroMetodoDetalle: true,
              nroCheque: true, bancoCheque: true, fechaEmisionCheque: true, fechaCobroCheque: true,
              nroTransaccion: true, bancoTransfer: true,
              autorizadoPor: true, realizadoPor: true,
              observacion: true, nroComprobante: true,
            },
          },
        },
      },
    },
    orderBy: { razonSocial: "asc" },
  });
  return rows.map((p) => ({
    ...p,
    facturas: p.facturas.map((f) => ({
      ...f,
      monto: Number(f.monto),
      montoPagado: Number(f.montoPagado),
    })),
  }));
}

// ─────────────────────────────────────────────
// TODOS LOS PROVEEDORES (para desplegable al cargar factura)
// ─────────────────────────────────────────────
export async function getProveedoresParaSelect() {
  const session = await requireAuth();
  let empresaId = (session.user as { empresaId?: string }).empresaId;
  // Fallback para tokens JWT sin empresaId (sesiones previas a la actualización)
  if (!empresaId) {
    const userId = (session.user as { id?: string }).id;
    if (userId) {
      const u = await prisma.usuario.findUnique({ where: { id: userId }, select: { empresaId: true } });
      empresaId = u?.empresaId ?? undefined;
    }
  }
  return prisma.proveedor.findMany({
    where: { activo: true, empresaId: empresaId ?? undefined },
    orderBy: { razonSocial: "asc" },
    take: 500,
    select: { id: true, razonSocial: true, ruc: true },
  });
}

// ─────────────────────────────────────────────
// FACTURAS (por proyecto) — mantener para revalidación de rutas
// ─────────────────────────────────────────────
export interface NuevaFacturaData {
  nroFactura: string;
  fecha: string;
  concepto: string;
  monto: number;
  proveedorId: string;
  fechaVencimiento?: string;
  observacion?: string;
}

export async function crearFactura(proyectoId: string, data: NuevaFacturaData) {
  await requireAuth();
  try {
    await prisma.facturaProveedor.create({
      data: {
        proyectoId,
        proveedorId: data.proveedorId,
        nroFactura: data.nroFactura,
        fecha: new Date(data.fecha),
        concepto: data.concepto,
        monto: data.monto,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        observacion: data.observacion || null,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/compras`);
    return { ok: true };
  } catch (err) {
    logger.error("compras", "crearFactura falló", { err });
    return { ok: false, error: "Error al cargar la factura" };
  }
}

export async function actualizarEstadoFactura(
  proyectoId: string,
  facturaId: string,
  estado: EstadoFactura,
  montoPagado?: number,
) {
  await requireAuth();
  try {
    await prisma.facturaProveedor.update({
      where: { id: facturaId },
      data: {
        estado,
        ...(montoPagado !== undefined && { montoPagado }),
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/compras`);
    return { ok: true };
  } catch (err) {
    logger.error("compras", "actualizarEstadoFactura falló", { err });
    return { ok: false, error: "Error al actualizar la factura" };
  }
}

export async function eliminarFactura(proyectoId: string, facturaId: string) {
  await requireAuth();
  try {
    await prisma.facturaProveedor.delete({ where: { id: facturaId } });
    revalidatePath(`/proyectos/${proyectoId}/compras`);
    return { ok: true };
  } catch (err) {
    logger.error("compras", "eliminarFactura falló", { err });
    return { ok: false, error: "Error al eliminar la factura" };
  }
}

// ─────────────────────────────────────────────
// ACTUALIZAR datos de una factura
// ─────────────────────────────────────────────
export interface ActualizarFacturaData {
  nroFactura: string;
  fecha: string;
  concepto: string;
  monto: number;
  fechaVencimiento?: string;
  observacion?: string;
}

export async function actualizarFactura(proyectoId: string, facturaId: string, data: ActualizarFacturaData) {
  await requireAuth();
  try {
    await prisma.facturaProveedor.update({
      where: { id: facturaId, proyectoId },
      data: {
        nroFactura: data.nroFactura,
        fecha: new Date(data.fecha),
        concepto: data.concepto,
        monto: data.monto,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        observacion: data.observacion || null,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/compras`);
    return { ok: true };
  } catch (err) {
    logger.error("compras", "actualizarFactura fall\u00f3", { err });
    return { ok: false, error: "Error al actualizar la factura" };
  }
}

// ─────────────────────────────────────────────
// REGISTRAR PAGO con detalles completos
// Crea un MovimientoFinanciero EGRESO_PROVEEDOR y vincula a la factura
// ─────────────────────────────────────────────
export interface RegistrarPagoData {
  fecha: string;
  montoPagado: number;
  autorizadoPor?: string;
  realizadoPor?: string;
  metodoPago: MetodoPago;
  otroMetodoDetalle?: string;
  nroCheque?: string;
  bancoCheque?: string;
  fechaEmisionCheque?: string;
  fechaCobroCheque?: string;
  nroTransaccion?: string;
  bancoTransfer?: string;
  observacion?: string;
  nroComprobante?: string;
}

export async function registrarPagoFactura(
  proyectoId: string,
  facturaId: string,
  proveedorId: string,
  proveedorNombre: string,
  facturaConcepto: string,
  data: RegistrarPagoData,
) {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Crear el movimiento financiero
      const movimiento = await tx.movimientoFinanciero.create({
        data: {
          proyectoId,
          fecha: new Date(data.fecha),
          tipo: "EGRESO_PROVEEDOR",
          concepto: facturaConcepto,
          beneficiario: proveedorNombre,
          monto: data.montoPagado,
          nroComprobante: data.nroComprobante || null,
          autorizadoPor: data.autorizadoPor || null,
          realizadoPor: data.realizadoPor || null,
          autorizadoPorUsuarioId: userId || null,
          metodoPago: data.metodoPago,
          otroMetodoDetalle: data.otroMetodoDetalle || null,
          nroCheque: data.nroCheque || null,
          bancoCheque: data.bancoCheque || null,
          fechaEmisionCheque: data.fechaEmisionCheque ? new Date(data.fechaEmisionCheque) : null,
          fechaCobroCheque: data.fechaCobroCheque ? new Date(data.fechaCobroCheque) : null,
          nroTransaccion: data.nroTransaccion || null,
          bancoTransfer: data.bancoTransfer || null,
          observacion: data.observacion || null,
          proveedorId,
        },
      });
      // 2. Actualizar la factura: estado PAGADA + montoPagado + link al movimiento
      await tx.facturaProveedor.update({
        where: { id: facturaId, proyectoId },
        data: {
          estado: "PAGADA",
          montoPagado: data.montoPagado,
          movimientoId: movimiento.id,
        },
      });
    });
    revalidatePath(`/proyectos/${proyectoId}/compras`);
    revalidatePath(`/proyectos/${proyectoId}/financiero`);
    return { ok: true };
  } catch (err) {
    logger.error("compras", "registrarPagoFactura fall\u00f3", { err });
    return { ok: false, error: "Error al registrar el pago" };
  }
}
