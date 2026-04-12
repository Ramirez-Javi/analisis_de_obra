"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { EstadoFactura } from "@prisma/client";

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
      },
    },
    orderBy: { razonSocial: "asc" },
  });
  // Decimal → number en el boundary Server/Client
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
    console.error("[compras] crearFactura:", err);
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
    console.error("[compras] actualizarEstadoFactura:", err);
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
    console.error("[compras] eliminarFactura:", err);
    return { ok: false, error: "Error al eliminar la factura" };
  }
}

