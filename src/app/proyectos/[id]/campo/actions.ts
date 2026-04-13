"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    throw new Error("Solo los administradores pueden realizar esta acción.");
  }
  const userId = (session.user as { id?: string }).id!;
  const userRecord = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { empresaId: true },
  });
  return { empresaId: userRecord?.empresaId ?? null };
}
import { revalidatePath } from "next/cache";

export type CampoAccesoRow = {
  id: string;
  nombre: string;
  apellido: string;
  activo: boolean;
};

type Resultado = { ok: boolean; error?: string };

// ── Listar accesos de campo de un proyecto ──────────────────────────────────

export async function getCampoAccesos(proyectoId: string): Promise<CampoAccesoRow[]> {
  const { empresaId } = await requireAdmin();

  // Verificar que el proyecto pertenece a la empresa del admin
  const proyecto = await prisma.proyecto.findFirst({
    where: { id: proyectoId, empresaId: empresaId ?? undefined },
    select: { id: true },
  });
  if (!proyecto) return [];

  return prisma.campoAcceso.findMany({
    where: { proyectoId },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apellido: true, activo: true },
  });
}

// ── Crear un acceso de campo para un proyecto ───────────────────────────────

export async function crearCampoAcceso(
  proyectoId: string,
  data: { nombre: string; apellido: string; pin: string }
): Promise<Resultado & { id?: string }> {
  try {
    const { empresaId } = await requireAdmin();

    if (!data.nombre.trim()) return { ok: false, error: "El nombre es requerido." };
    if (!/^\d{4,6}$/.test(data.pin)) return { ok: false, error: "PIN debe tener 4 a 6 dígitos." };

    const proyecto = await prisma.proyecto.findFirst({
      where: { id: proyectoId, empresaId: empresaId ?? undefined },
      select: { id: true },
    });
    if (!proyecto) return { ok: false, error: "Proyecto no encontrado." };

    const pinHash = await bcrypt.hash(data.pin, 10);
    const acceso = await prisma.campoAcceso.create({
      data: {
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        pinHash,
        proyectoId,
      },
    });

    revalidatePath(`/proyectos/${proyectoId}/ficha`);
    return { ok: true, id: acceso.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al crear acceso." };
  }
}

// ── Cambiar el PIN de un acceso de campo ─────────────────────────────────────

export async function actualizarPinCampoAcceso(
  id: string,
  proyectoId: string,
  pin: string
): Promise<Resultado> {
  try {
    const { empresaId } = await requireAdmin();

    if (!/^\d{4,6}$/.test(pin)) return { ok: false, error: "PIN debe tener 4 a 6 dígitos." };

    // Verificar pertenencia
    const acceso = await prisma.campoAcceso.findFirst({
      where: { id, proyecto: { empresaId: empresaId ?? undefined } },
      select: { proyectoId: true },
    });
    if (!acceso || acceso.proyectoId !== proyectoId) {
      return { ok: false, error: "Acceso no encontrado." };
    }

    const pinHash = await bcrypt.hash(pin, 12);
    await prisma.campoAcceso.update({ where: { id }, data: { pinHash } });

    revalidatePath(`/proyectos/${proyectoId}/ficha`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al actualizar PIN." };
  }
}

// ── Eliminar un acceso de campo ───────────────────────────────────────────────

export async function eliminarCampoAcceso(id: string, proyectoId: string): Promise<Resultado> {
  try {
    const { empresaId } = await requireAdmin();

    const acceso = await prisma.campoAcceso.findFirst({
      where: { id, proyecto: { empresaId: empresaId ?? undefined } },
      select: { proyectoId: true },
    });
    if (!acceso || acceso.proyectoId !== proyectoId) {
      return { ok: false, error: "Acceso no encontrado." };
    }

    await prisma.campoAcceso.delete({ where: { id } });

    revalidatePath(`/proyectos/${proyectoId}/ficha`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al eliminar acceso." };
  }
}
