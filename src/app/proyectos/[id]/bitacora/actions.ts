"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await getSession();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

/** Checks that the project exists and belongs to the current user's empresa. */
async function requireProyecto(proyectoId: string) {
  const session = await requireSession();
  const empresaId = (session.user as { empresaId?: string }).empresaId;
  const proyecto = await prisma.proyecto.findFirst({
    where: { id: proyectoId, ...(empresaId ? { empresaId } : {}) },
    select: { id: true },
  });
  if (!proyecto) throw new Error("Proyecto no encontrado o sin acceso.");
  return proyecto;
}

function isValidHttpUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  return url.startsWith("https://") || url.startsWith("http://");
}

// ─── LECTURAS ────────────────────────────────────────────────

export async function getEntradasBitacora(proyectoId: string) {
  await requireProyecto(proyectoId);
  return prisma.bitacoraEntrada.findMany({
    where: { proyectoId },
    orderBy: { fecha: "desc" },
    include: {
      rubrosDelDia: { orderBy: { id: "asc" } },
      personalDelDia: { orderBy: { nombre: "asc" } },
    },
  });
}

export async function getEntradaDetalle(entradaId: string) {
  await requireSession();
  // entradaId belongs to a project already authorized via getEntradasBitacora
  return prisma.bitacoraEntrada.findUnique({
    where: { id: entradaId },
    include: {
      rubrosDelDia: true,
      personalDelDia: true,
    },
  });
}

// ─── ALERTAS DE STOCK (días restantes por material) ──────────

export async function getAlertasStock(proyectoId: string) {
  await requireProyecto(proyectoId);
  const recepciones = await prisma.recepcionBodega.findMany({
    where: { proyectoId },
    include: {
      material: { select: { id: true, nombre: true, codigo: true, unidadMedida: { select: { simbolo: true } } } },
      asBuiltRegistros: { select: { cantidadInstalada: true, fechaInstalacion: true } },
    },
  });

  return recepciones.map((r) => {
    const totalInstalado = r.asBuiltRegistros.reduce(
      (s: number, a: { cantidadInstalada: number }) => s + a.cantidadInstalada, 0
    );
    const stockActual = r.cantidadRecibida - totalInstalado;

    // Calcular tasa diaria de consumo (últimos 14 días)
    const hace14 = new Date();
    hace14.setDate(hace14.getDate() - 14);
    const registrosRecientes = r.asBuiltRegistros.filter(
      (a: { fechaInstalacion: Date; cantidadInstalada: number }) => a.fechaInstalacion >= hace14
    );
    const consumido14dias = registrosRecientes.reduce(
      (s: number, a: { cantidadInstalada: number }) => s + a.cantidadInstalada, 0
    );
    const tasaDiaria = consumido14dias > 0 ? consumido14dias / 14 : null;
    const diasRestantes = tasaDiaria && stockActual > 0
      ? Math.floor(stockActual / tasaDiaria)
      : null;

    return {
      materialId: r.materialId,
      materialNombre: r.material.nombre,
      materialCodigo: r.material.codigo,
      unidad: r.material.unidadMedida.simbolo,
      stockActual,
      tasaDiaria,
      diasRestantes,
      nivel: diasRestantes === null
        ? "sin-datos"
        : diasRestantes <= 3 ? "critico"
        : diasRestantes <= 7 ? "bajo"
        : "ok",
    };
  }).filter((r) => r.stockActual > 0);
}

// ─── CREAR ENTRADA COMPLETA ────────────────────────────────

export interface RubroData {
  descripcion: string;
  cantidad?: number;
  unidad?: string;
  avancePct?: number;
  observacion?: string;
}

export interface PersonalData {
  nombre: string;
  categoria?: string;
  horasTrabajadas?: number;
  observacion?: string;
}

export interface EntradaData {
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  turno?: string;
  clima?: string;
  temperatura?: number;
  descripcionGeneral: string;
  aspectosPositivos?: string;
  aspectosNegativos?: string;
  oportunidades?: string;
  amenazas?: string;
  observaciones?: string;
  enlaceFotos?: string;
  responsableFirma?: string;
  rubros: RubroData[];
  personal: PersonalData[];
}

export async function crearEntrada(proyectoId: string, data: EntradaData) {
  await requireProyecto(proyectoId);
  if (!data.descripcionGeneral?.trim()) {
    return { ok: false, error: "La descripción general es obligatoria" };
  }
  if (!isValidHttpUrl(data.enlaceFotos?.trim())) {
    return { ok: false, error: "El enlace de fotos debe ser una URL válida (http:// o https://)" };
  }
  try {
    const entrada = await prisma.bitacoraEntrada.create({
      data: {
        proyectoId,
        fecha: new Date(data.fecha),
        horaInicio: data.horaInicio || null,
        horaFin: data.horaFin || null,
        turno: data.turno || null,
        clima: data.clima || null,
        temperatura: data.temperatura ?? null,
        descripcionGeneral: data.descripcionGeneral.trim(),
        aspectosPositivos: data.aspectosPositivos?.trim() || null,
        aspectosNegativos: data.aspectosNegativos?.trim() || null,
        oportunidades: data.oportunidades?.trim() || null,
        amenazas: data.amenazas?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        enlaceFotos: data.enlaceFotos?.trim() || null,
        responsableFirma: data.responsableFirma?.trim() || null,
        rubrosDelDia: {
          create: data.rubros
            .filter((r) => r.descripcion?.trim())
            .map((r) => ({
              descripcion: r.descripcion.trim(),
              cantidad: r.cantidad ?? null,
              unidad: r.unidad?.trim() || null,
              avancePct: r.avancePct ?? null,
              observacion: r.observacion?.trim() || null,
            })),
        },
        personalDelDia: {
          create: data.personal
            .filter((p) => p.nombre?.trim())
            .map((p) => ({
              nombre: p.nombre.trim(),
              categoria: p.categoria?.trim() || null,
              horasTrabajadas: p.horasTrabajadas ?? null,
              observacion: p.observacion?.trim() || null,
            })),
        },
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/bitacora`);
    return { ok: true, entradaId: entrada.id };
  } catch {
    return { ok: false, error: "Error al guardar la entrada" };
  }
}

export async function eliminarEntrada(proyectoId: string, entradaId: string) {
  await requireProyecto(proyectoId);
  try {
    await prisma.bitacoraEntrada.delete({ where: { id: entradaId } });
    revalidatePath(`/proyectos/${proyectoId}/bitacora`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar la entrada" };
  }
}
