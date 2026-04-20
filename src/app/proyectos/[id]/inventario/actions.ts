"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

// ─── AMBIENTES ──────────────────────────────────────────────

export async function getAmbientes(proyectoId: string) {
  await requireProyecto(proyectoId);
  return prisma.ambienteProyecto.findMany({
    where: { proyectoId },
    orderBy: { nombre: "asc" },
    take: 200,
    include: {
      _count: { select: { asBuiltRegistros: true } },
    },
  });
}

export async function crearAmbiente(proyectoId: string, nombre: string) {
  await requireProyecto(proyectoId);
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
  await requireProyecto(proyectoId);
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
  await requireProyecto(proyectoId);
  return prisma.recepcionBodega.findMany({
    where: { proyectoId },
    orderBy: { fechaRecepcion: "desc" },
    take: 500,
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

const recepcionSchema = z.object({
  materialId: z.string().min(1, "El material es requerido"),
  proveedorId: z.string().optional(),
  fechaRecepcion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  cantidadRecibida: z.number().positive("La cantidad debe ser mayor a 0"),
  nroRemision: z.string().max(100).optional(),
  marca: z.string().max(100).optional(),
  modeloSKU: z.string().max(100).optional(),
  nroLote: z.string().max(100).optional(),
  especificacionTecnica: z.string().max(2000).optional(),
  responsableReceptor: z.string().max(200).optional(),
});

export async function crearRecepcion(proyectoId: string, data: RecepcionData) {
  await requireProyecto(proyectoId);

  const parsed = recepcionSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  try {
    const recepcion = await prisma.recepcionBodega.create({
      data: {
        proyectoId,
        materialId: d.materialId,
        proveedorId: d.proveedorId || null,
        fechaRecepcion: new Date(d.fechaRecepcion),
        cantidadRecibida: d.cantidadRecibida,
        nroRemision: d.nroRemision || null,
        marca: d.marca || null,
        modeloSKU: d.modeloSKU || null,
        nroLote: d.nroLote || null,
        especificacionTecnica: d.especificacionTecnica || null,
        responsableReceptor: d.responsableReceptor || null,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true, recepcion };
  } catch {
    return { ok: false, error: "Error al registrar la recepción" };
  }
}

export async function eliminarRecepcion(proyectoId: string, recepcionId: string) {
  await requireProyecto(proyectoId);
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
  await requireProyecto(proyectoId);
  const ambientes = await prisma.ambienteProyecto.findMany({
    where: { proyectoId },
    orderBy: { nombre: "asc" },
    take: 200,
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
  await requireProyecto(proyectoId);
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
  await requireProyecto(proyectoId);
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
    take: 1000,
    select: {
      id: true,
      codigo: true,
      nombre: true,
      unidadMedida: { select: { simbolo: true } },
    },
  });
}

export async function getProveedoresParaSelector() {
  const session = await requireSession();
  const empresaId = (session.user as { empresaId?: string }).empresaId;
  if (!empresaId) return [];
  return prisma.proveedor.findMany({
    where: { empresaId, activo: true },
    orderBy: { razonSocial: "asc" },
    take: 500,
    select: { id: true, razonSocial: true },
  });
}

// ─── CONTROL INTERNO DE STOCK ────────────────────────────────

export interface ConteoFisicoData {
  materialNombre: string;
  unidad: string;
  cantidad: number;
  fecha: string; // ISO date string
  nota?: string;
}

/** Registra un conteo físico presencial de un material en bodega */
export async function crearConteoFisico(proyectoId: string, data: ConteoFisicoData) {
  await requireProyecto(proyectoId);
  if (!data.materialNombre.trim()) return { ok: false, error: "El nombre del material es requerido" };
  if (data.cantidad < 0) return { ok: false, error: "La cantidad no puede ser negativa" };
  try {
    const conteo = await prisma.conteoFisicoBodega.create({
      data: {
        proyectoId,
        materialNombre: data.materialNombre.trim(),
        unidad: data.unidad.trim() || "u",
        cantidad: data.cantidad,
        fecha: new Date(data.fecha),
        nota: data.nota?.trim() || null,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true, conteo };
  } catch {
    return { ok: false, error: "Error al registrar el conteo" };
  }
}

/** Elimina un conteo físico */
export async function eliminarConteoFisico(proyectoId: string, conteoId: string) {
  await requireProyecto(proyectoId);
  try {
    await prisma.conteoFisicoBodega.delete({ where: { id: conteoId } });
    revalidatePath(`/proyectos/${proyectoId}/inventario`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar el conteo" };
  }
}

export interface FilaControlStock {
  materialNombre: string;
  unidad: string;
  recibidoBodega: number;      // sum(RecepcionBodega.cantidadRecibida)
  consumoTeorico: number;      // calculado desde avances × receta
  stockTeorico: number;        // recibidoBodega - consumoTeorico
  conteoFisico: number | null; // último ConteoFisicoBodega.cantidad (null = sin conteo)
  fechaConteo: Date | null;
  varianza: number | null;     // conteoFisico - stockTeorico (null si no hay conteo)
  alertar: boolean;            // true si varianza < 0
  rubrosRelacionados: string[]; // nombres de rubros que usan este insumo
}

/** Retorna la tabla de control de stock con cálculo de varianza.
 *  Cruza: AvanceRubro → Insumo (receta) → RecepcionBodega → ConteoFisicoBodega */
export async function getControlStock(proyectoId: string): Promise<FilaControlStock[]> {
  await requireProyecto(proyectoId);

  // 1. Rubros con insumos y avances
  const rubros = await prisma.rubroProyecto.findMany({
    where: { proyectoId, activo: true },
    select: {
      rubroMaestro: { select: { nombre: true } },
      insumos: {
        where: { esManodeObra: false },
        select: {
          nombre: true,
          cantidad: true,      // rendimiento por unidad de rubro
          porcPerdida: true,
          unidadMedida: { select: { simbolo: true, nombre: true } },
        },
      },
      avancesRubro: { select: { cantidadEjecutada: true } },
    },
  });

  // 2. Recepciones agrupadas por nombre de material
  const recepciones = await prisma.recepcionBodega.findMany({
    where: { proyectoId },
    select: {
      cantidadRecibida: true,
      material: { select: { nombre: true, unidadMedida: { select: { simbolo: true, nombre: true } } } },
    },
  });

  // 3. Último conteo físico por nombre de material
  const conteos = await prisma.conteoFisicoBodega.findMany({
    where: { proyectoId },
    orderBy: { fecha: "desc" },
    select: { materialNombre: true, unidad: true, cantidad: true, fecha: true },
  });

  // Calcular consumo teórico por nombre de insumo
  const consumoPorInsumo = new Map<string, { consumo: number; unidad: string; rubros: string[] }>();

  for (const rubro of rubros) {
    const totalEjecutado = rubro.avancesRubro.reduce((s, a) => s + a.cantidadEjecutada, 0);
    for (const ins of rubro.insumos) {
      const nombreKey = ins.nombre.trim().toLowerCase();
      const consumo = totalEjecutado * ins.cantidad * (1 + ins.porcPerdida / 100);
      const unidad = ins.unidadMedida?.simbolo || ins.unidadMedida?.nombre || "u";
      const existing = consumoPorInsumo.get(nombreKey);
      if (existing) {
        existing.consumo += consumo;
        if (!existing.rubros.includes(rubro.rubroMaestro.nombre)) {
          existing.rubros.push(rubro.rubroMaestro.nombre);
        }
      } else {
        consumoPorInsumo.set(nombreKey, { consumo, unidad, rubros: [rubro.rubroMaestro.nombre] });
      }
    }
  }

  // Agrupar recepciones por nombre de material
  const recibidoPorMaterial = new Map<string, { total: number; unidad: string; nombreOriginal: string }>();
  for (const r of recepciones) {
    const key = r.material.nombre.trim().toLowerCase();
    const unidad = r.material.unidadMedida?.simbolo || r.material.unidadMedida?.nombre || "u";
    const existing = recibidoPorMaterial.get(key);
    if (existing) {
      existing.total += r.cantidadRecibida;
    } else {
      recibidoPorMaterial.set(key, { total: r.cantidadRecibida, unidad, nombreOriginal: r.material.nombre });
    }
  }

  // Último conteo por material (ya ordenado desc, primero encontrado es el más reciente)
  const ultimoConteoPorMaterial = new Map<string, { cantidad: number; fecha: Date; unidad: string }>();
  for (const c of conteos) {
    const key = c.materialNombre.trim().toLowerCase();
    if (!ultimoConteoPorMaterial.has(key)) {
      ultimoConteoPorMaterial.set(key, { cantidad: c.cantidad, fecha: c.fecha, unidad: c.unidad });
    }
  }

  // Construir la tabla uniendo todas las fuentes
  // Keys = todos los materiales que aparecen en recepciones O en insumos de rubros con avance
  const allKeys = new Set([
    ...recibidoPorMaterial.keys(),
    ...[...consumoPorInsumo.entries()]
      .filter(([, v]) => v.consumo > 0)
      .map(([k]) => k),
  ]);

  const filas: FilaControlStock[] = [];
  for (const key of allKeys) {
    const recibido = recibidoPorMaterial.get(key);
    const consumoData = consumoPorInsumo.get(key);
    const conteoData = ultimoConteoPorMaterial.get(key);

    const recibidoBodega = recibido?.total ?? 0;
    const consumoTeorico = consumoData?.consumo ?? 0;
    const stockTeorico = recibidoBodega - consumoTeorico;
    const conteoFisico = conteoData?.cantidad ?? null;
    const varianza = conteoFisico !== null ? conteoFisico - stockTeorico : null;

    filas.push({
      materialNombre: recibido?.nombreOriginal ?? (consumoData ? key : key),
      unidad: recibido?.unidad ?? consumoData?.unidad ?? "u",
      recibidoBodega,
      consumoTeorico,
      stockTeorico,
      conteoFisico,
      fechaConteo: conteoData?.fecha ?? null,
      varianza,
      alertar: varianza !== null && varianza < -0.001,
      rubrosRelacionados: consumoData?.rubros ?? [],
    });
  }

  // Ordenar: primero los alertados, luego por nombre
  filas.sort((a, b) => {
    if (a.alertar && !b.alertar) return -1;
    if (!a.alertar && b.alertar) return 1;
    return a.materialNombre.localeCompare(b.materialNombre);
  });

  return filas;
}
