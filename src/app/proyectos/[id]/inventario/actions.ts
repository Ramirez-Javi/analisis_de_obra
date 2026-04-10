"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await getSession();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

// ─── AMBIENTES ──────────────────────────────────────────────

export async function getAmbientes(proyectoId: string) {
  await requireSession();
  return prisma.ambienteProyecto.findMany({
    where: { proyectoId },
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { asBuiltRegistros: true } },
    },
  });
}

export async function crearAmbiente(proyectoId: string, nombre: string) {
  await requireSession();
  if (!nombre.trim()) return { ok: false, error: "El nombre es requerido" };
  try {
    const ambiente = await prisma.ambienteProyecto.create({
      data: { nombre: nombre.trim(), proyectoId },
    });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true, ambiente };
  } catch {
    return { ok: false, error: "Error al crear el ambiente" };
  }
}

export async function eliminarAmbiente(proyectoId: string, ambienteId: string) {
  await requireSession();
  try {
    await prisma.ambienteProyecto.delete({ where: { id: ambienteId } });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar el ambiente" };
  }
}

// ─── RECEPCIÓN / BODEGA ──────────────────────────────────────

export async function getRecepcionesBodega(proyectoId: string) {
  await requireSession();
  return prisma.recepcionBodega.findMany({
    where: { proyectoId },
    orderBy: { fechaRecepcion: "desc" },
    include: {
      material: { select: { id: true, codigo: true, nombre: true, unidadMedida: { select: { simbolo: true } } } },
      proveedor: { select: { id: true, razonSocial: true } },
      _count: { select: { asBuiltRegistros: true } },
      asBuiltRegistros: { select: { cantidadInstalada: true } },
    },
  });
}

export interface RecepcionData {
  materialId: string;
  proveedorId?: string;
  fechaRecepcion: string;
  cantidadRecibida: number;
  nroRemision?: string;
  marca?: string;
  modeloSKU?: string;
  nroLote?: string;
  especificacionTecnica?: string;
  responsableReceptor?: string;
}

export async function crearRecepcion(proyectoId: string, data: RecepcionData) {
  await requireSession();
  try {
    const recepcion = await prisma.recepcionBodega.create({
      data: {
        proyectoId,
        materialId: data.materialId,
        proveedorId: data.proveedorId || null,
        fechaRecepcion: new Date(data.fechaRecepcion),
        cantidadRecibida: data.cantidadRecibida,
        nroRemision: data.nroRemision || null,
        marca: data.marca || null,
        modeloSKU: data.modeloSKU || null,
        nroLote: data.nroLote || null,
        especificacionTecnica: data.especificacionTecnica || null,
        responsableReceptor: data.responsableReceptor || null,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true, recepcion };
  } catch {
    return { ok: false, error: "Error al registrar la recepción" };
  }
}

export async function eliminarRecepcion(proyectoId: string, recepcionId: string) {
  await requireSession();
  try {
    // Verificar que no tenga registros As-Built
    const count = await prisma.asBuiltRegistro.count({ where: { recepcionId } });
    if (count > 0) {
      return { ok: false, error: "No se puede eliminar: tiene registros de instalación asociados" };
    }
    await prisma.recepcionBodega.delete({ where: { id: recepcionId } });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la recepción" };
  }
}

// ─── AS-BUILT ────────────────────────────────────────────────

export async function getAsBuiltPorAmbiente(proyectoId: string) {
  await requireSession();
  const ambientes = await prisma.ambienteProyecto.findMany({
    where: { proyectoId },
    orderBy: { nombre: "asc" },
    include: {
      asBuiltRegistros: {
        orderBy: { fechaInstalacion: "desc" },
        include: {
          recepcion: {
            include: {
              material: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  unidadMedida: { select: { simbolo: true } },
                },
              },
              proveedor: { select: { razonSocial: true } },
            },
          },
        },
      },
    },
  });
  return ambientes;
}

export interface AsBuiltData {
  ambienteId: string;
  recepcionId: string;
  fechaInstalacion: string;
  cantidadInstalada: number;
  dosificacionOMezcla?: string;
  mecanismoInstalacion?: string;
}

export async function crearAsBuilt(proyectoId: string, data: AsBuiltData) {
  await requireSession();
  try {
    // Verificar stock disponible
    const recepcion = await prisma.recepcionBodega.findUnique({
      where: { id: data.recepcionId },
      include: { asBuiltRegistros: { select: { cantidadInstalada: true } } },
    });
    if (!recepcion) return { ok: false, error: "Recepción no encontrada" };

    const totalInstalado = recepcion.asBuiltRegistros.reduce(
      (acc: number, r: { cantidadInstalada: number }) => acc + r.cantidadInstalada,
      0
    );
    const stockDisponible = recepcion.cantidadRecibida - totalInstalado;

    if (data.cantidadInstalada > stockDisponible) {
      return {
        ok: false,
        error: `Stock insuficiente. Disponible: ${stockDisponible.toFixed(2)}`,
      };
    }

    const registro = await prisma.asBuiltRegistro.create({
      data: {
        ambienteId: data.ambienteId,
        recepcionId: data.recepcionId,
        fechaInstalacion: new Date(data.fechaInstalacion),
        cantidadInstalada: data.cantidadInstalada,
        dosificacionOMezcla: data.dosificacionOMezcla || null,
        mecanismoInstalacion: data.mecanismoInstalacion || null,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true, registro };
  } catch {
    return { ok: false, error: "Error al registrar instalación" };
  }
}

export async function eliminarAsBuilt(proyectoId: string, registroId: string) {
  await requireSession();
  try {
    await prisma.asBuiltRegistro.delete({ where: { id: registroId } });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar el registro" };
  }
}

// ─── DATOS AUXILIARES ────────────────────────────────────────

export async function getMaterialesParaSelector() {
  await requireSession();
  return prisma.materialMaestro.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      unidadMedida: { select: { simbolo: true } },
    },
  });
}

export async function getProveedoresParaSelector(empresaId: string) {
  await requireSession();
  return prisma.proveedor.findMany({
    where: { empresaId, activo: true },
    orderBy: { razonSocial: "asc" },
    select: { id: true, razonSocial: true },
  });
}
