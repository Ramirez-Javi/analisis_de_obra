"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

async function requireEmpresa() {
  const session = await getSession();
  if (!session?.user) throw new Error("No autorizado");

  // Intentar obtener empresaId del JWT (presente en sesiones nuevas)
  let empresaId = (session.user as { empresaId?: string }).empresaId;

  // Fallback: si el JWT es antiguo (antes de agregar empresaId), buscar en DB
  if (!empresaId) {
    const userId = (session.user as { id?: string }).id;
    if (!userId) throw new Error("No autorizado");
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresaId: true },
    });
    empresaId = usuario?.empresaId ?? undefined;
  }

  if (!empresaId) throw new Error("El usuario no tiene empresa asignada");
  return { session, empresaId };
}

// ─────────────────────────────────────────────
// OBTENER TODOS LOS PROVEEDORES (global)
// ─────────────────────────────────────────────
export async function getProveedoresGlobales() {
  const { empresaId } = await requireEmpresa();
  return prisma.proveedor.findMany({
    where: { empresaId },
    orderBy: { razonSocial: "asc" },
    take: 500, // límite de seguridad
    include: {
      _count: { select: { facturas: true } },
    },
  });
}

// ─────────────────────────────────────────────
// CREAR proveedor global
// ─────────────────────────────────────────────
export interface ProveedorData {
  razonSocial: string;
  ruc?: string;
  tipoPersona?: string;
  direccion?: string;
  emailEmpresa?: string;
  vendedores?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  observaciones?: string;
}

export async function crearProveedorGlobal(data: ProveedorData) {
  const { empresaId } = await requireEmpresa();
  try {
    const proveedor = await prisma.proveedor.create({
      data: { ...data, empresaId },
    });
    revalidatePath("/compras");
    return { ok: true, proveedor };
  } catch (err) {
    logger.error("compras", "crearProveedor", { err: String(err) });
    return { ok: false, error: "Error al crear el proveedor" };
  }
}

// ─────────────────────────────────────────────
// ACTUALIZAR proveedor global
// ─────────────────────────────────────────────
export async function actualizarProveedorGlobal(id: string, data: Partial<ProveedorData>) {
  const { empresaId } = await requireEmpresa();
  try {
    await prisma.proveedor.update({ where: { id, empresaId }, data });
    revalidatePath("/compras");
    return { ok: true };
  } catch (err) {
    logger.error("compras", "actualizarProveedor", { err: String(err) });
    return { ok: false, error: "Error al actualizar el proveedor" };
  }
}

// ─────────────────────────────────────────────
// ELIMINAR proveedor global
// ─────────────────────────────────────────────
export async function eliminarProveedorGlobal(id: string) {
  const { empresaId } = await requireEmpresa();
  try {
    const proveedor = await prisma.proveedor.findFirst({
      where: { id, empresaId },
      select: { _count: { select: { facturas: true } } },
    });
    if (!proveedor) return { ok: false, error: "Proveedor no encontrado" };
    if (proveedor._count.facturas > 0) {
      return { ok: false, error: "No se puede eliminar: el proveedor tiene facturas asociadas" };
    }
    await prisma.proveedor.delete({ where: { id, empresaId } });
    revalidatePath("/compras");
    return { ok: true };
  } catch (err) {
    logger.error("compras", "eliminarProveedor", { err: String(err) });
    return { ok: false, error: "Error al eliminar el proveedor" };
  }
}

// ─────────────────────────────────────────────
// ACTIVAR / DESACTIVAR proveedor
// ─────────────────────────────────────────────
export async function toggleActivarProveedor(id: string) {
  const { empresaId } = await requireEmpresa();
  try {
    const actual = await prisma.proveedor.findFirst({
      where: { id, empresaId },
      select: { activo: true },
    });
    if (!actual) return { ok: false, error: "Proveedor no encontrado" };
    await prisma.proveedor.update({
      where: { id, empresaId },
      data: { activo: !actual.activo },
    });
    revalidatePath("/compras");
    return { ok: true, nuevoEstado: !actual.activo };
  } catch (err) {
    logger.error("compras", "toggleActivarProveedor", { err: String(err) });
    return { ok: false, error: "Error al cambiar estado" };
  }
}
