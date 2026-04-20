"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RubroProyectoDB } from "@/app/actions/init-modulos";
import { RUBROS_MAESTROS_MOCK } from "@/components/presupuesto/catalogData";

async function requireProyecto(proyectoId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error("No autorizado");
  const empresaId = (session.user as { empresaId?: string }).empresaId;
  const proyecto = await prisma.proyecto.findFirst({
    where: { id: proyectoId, ...(empresaId ? { empresaId } : {}) },
    select: { id: true },
  });
  if (!proyecto) throw new Error("Proyecto no encontrado o sin acceso.");
  return proyecto;
}

// ─── AVANCES DE RUBRO ────────────────────────────────────────

/** Retorna el total ejecutado por rubroProyectoId para un proyecto.
 *  Usado por el tab "Avances de Obra" cuando la fuente de rubros es localStorage. */
export async function getAvancesTotales(proyectoId: string): Promise<Record<string, number>> {
  await requireProyecto(proyectoId);

  // Get all rubro IDs for this project first
  const rubros = await prisma.rubroProyecto.findMany({
    where: { proyectoId },
    select: { id: true },
  });
  const rubroIds = rubros.map((r) => r.id);
  if (rubroIds.length === 0) return {};

  // Fetch all avance records for those rubros and aggregate in JS
  const avances = await prisma.avanceRubro.findMany({
    where: { rubroProyectoId: { in: rubroIds } },
    select: { rubroProyectoId: true, cantidadEjecutada: true },
  });

  const result: Record<string, number> = {};
  for (const a of avances) {
    result[a.rubroProyectoId] = (result[a.rubroProyectoId] ?? 0) + a.cantidadEjecutada;
  }
  return result;
}

/** Retorna el historial de avances de un rubro específico */
export async function getAvancesRubro(proyectoId: string, rubroProyectoId: string) {
  await requireProyecto(proyectoId);
  return prisma.avanceRubro.findMany({
    where: { rubroProyectoId },
    orderBy: { fecha: "desc" },
    select: {
      id: true,
      cantidadEjecutada: true,
      fecha: true,
      nota: true,
      creadoEn: true,
    },
  });
}

/** Registra una nueva medición de avance (incremental) para un rubro */
const avanceRubroSchema = z.object({
  rubroProyectoId: z.string().min(1, "El rubro es requerido"),
  cantidadEjecutada: z.number().positive("La cantidad debe ser mayor a 0"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  nota: z.string().max(1000).optional(),
});

export async function crearAvanceRubro(
  proyectoId: string,
  rubroProyectoId: string,
  cantidadEjecutada: number,
  fecha: string, // ISO date string "YYYY-MM-DD"
  nota?: string
) {
  await requireProyecto(proyectoId);

  const parsed = avanceRubroSchema.safeParse({ rubroProyectoId, cantidadEjecutada, fecha, nota });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  // Verify the rubro belongs to this project
  const rubro = await prisma.rubroProyecto.findFirst({
    where: { id: d.rubroProyectoId, proyectoId },
    select: { id: true },
  });
  if (!rubro) return { ok: false, error: "Rubro no encontrado en este proyecto" };

  try {
    const avance = await prisma.avanceRubro.create({
      data: {
        rubroProyectoId: d.rubroProyectoId,
        cantidadEjecutada: d.cantidadEjecutada,
        fecha: new Date(d.fecha),
        nota: d.nota?.trim() || null,
      },
    });
    revalidatePath(`/proyectos/${proyectoId}/presupuesto`);
    return { ok: true, avance };
  } catch {
    return { ok: false, error: "Error al registrar el avance" };
  }
}

/** Elimina una medición de avance */
export async function eliminarAvanceRubro(proyectoId: string, avanceId: string) {
  await requireProyecto(proyectoId);
  try {
    await prisma.avanceRubro.delete({ where: { id: avanceId } });
    revalidatePath(`/proyectos/${proyectoId}/presupuesto`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar el avance" };
  }
}

/** Retorna el resumen de avances de todos los rubros del proyecto
 *  Usado para cargar el tab "Avances de Obra" de una sola vez */
export async function getResumenAvancesProyecto(proyectoId: string) {
  await requireProyecto(proyectoId);
  const rubros = await prisma.rubroProyecto.findMany({
    where: { proyectoId, activo: true },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      cantidad: true,
      rubroMaestro: {
        select: {
          codigo: true,
          nombre: true,
          unidadMedida: { select: { nombre: true, simbolo: true } },
        },
      },
      insumos: {
        where: { esManodeObra: false },
        select: {
          id: true,
          nombre: true,
          cantidad: true,       // rendimiento (por unidad de rubro)
          porcPerdida: true,
          unidadMedida: { select: { nombre: true, simbolo: true } },
        },
      },
      avancesRubro: {
        select: { cantidadEjecutada: true },
      },
    },
  });

  return rubros.map((r) => {
    const totalEjecutado = r.avancesRubro.reduce(
      (sum, a) => sum + a.cantidadEjecutada,
      0
    );
    const porcAvance =
      r.cantidad > 0 ? Math.min(100, (totalEjecutado / r.cantidad) * 100) : 0;
    return {
      id: r.id,
      codigo: r.rubroMaestro.codigo,
      nombre: r.rubroMaestro.nombre,
      unidad: r.rubroMaestro.unidadMedida.simbolo || r.rubroMaestro.unidadMedida.nombre,
      cantidadProyectada: r.cantidad,
      totalEjecutado,
      porcAvance,
      faltante: Math.max(0, r.cantidad - totalEjecutado),
      insumos: r.insumos.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        unidad: i.unidadMedida?.simbolo || i.unidadMedida?.nombre || "u",
        rendimiento: i.cantidad,
        porcPerdida: i.porcPerdida,
        // Consumo teórico al avance actual
        consumoTeorico:
          totalEjecutado * i.cantidad * (1 + i.porcPerdida / 100),
        // Consumo teórico proyectado al 100%
        consumoProyectado:
          r.cantidad * i.cantidad * (1 + i.porcPerdida / 100),
      })),
    };
  });
}

// ─── GUARDAR PRESUPUESTO ──────────────────────────────────────
// Mapa de lookup: id mock "rm-0001" → codigo "R-001"
const MOCK_ID_TO_CODIGO = new Map(RUBROS_MAESTROS_MOCK.map((r) => [r.id, r.codigo]));

/** Genera un código único para rubros personalizados de empresa */
function generarCodigoCustom(): string {
  return `EMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Busca o crea una UnidadMedida por nombre */
async function findOrCreateUnidad(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  nombre: string
) {
  const found = await tx.unidadMedida.findFirst({ where: { nombre } });
  if (found) return found;
  return tx.unidadMedida.create({ data: { nombre, simbolo: nombre } });
}

/**
 * Guarda el presupuesto completo de un proyecto.
 * - Rubros nuevos (instanceId empieza con "rubro-"): se crean en DB.
 *   Si son personalizados (rubroMaestroId vacío), también se crea el RubroMaestro
 *   asociado a la empresa para reutilizarlo en proyectos futuros.
 * - Rubros existentes (instanceId = CUID de RubroProyecto): se actualizan.
 * - Rubros eliminados (en DB pero no en el input): se borran.
 * Devuelve la lista actualizada con los CUIDs reales de DB.
 */
export async function guardarPresupuesto(
  proyectoId: string,
  rubros: RubroProyectoDB[]
): Promise<{ ok: boolean; error?: string; rubros?: RubroProyectoDB[] }> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "No autorizado" };
  const empresaId = (session.user as { empresaId?: string }).empresaId ?? null;

  // Verificar acceso al proyecto
  const proyecto = await prisma.proyecto.findFirst({
    where: { id: proyectoId, ...(empresaId ? { empresaId } : {}) },
    select: { id: true },
  });
  if (!proyecto) return { ok: false, error: "Proyecto no encontrado o sin acceso" };

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // IDs existentes en DB para este proyecto
      const existentes = await tx.rubroProyecto.findMany({
        where: { proyectoId },
        select: { id: true },
      });
      const existentesSet = new Set(existentes.map((r) => r.id));
      const inputIds = new Set<string>();

      const updatedRubros: RubroProyectoDB[] = [];

      for (let orden = 0; orden < rubros.length; orden++) {
        const rubro = rubros[orden];
        const isNew = rubro.instanceId.startsWith("rubro-");

        // ── Resolver RubroMaestro ───────────────────────────────
        let maestroId: string;

        if (!isNew) {
          // Rubro existente: leer el maestroId actual desde DB
          const rp = await tx.rubroProyecto.findUnique({
            where: { id: rubro.instanceId },
            select: { rubroMaestroId: true },
          });
          maestroId = rp?.rubroMaestroId ?? rubro.rubroMaestroId;
        } else if (rubro.rubroMaestroId.startsWith("rm-")) {
          // Viene del catálogo mock: seed en DB si no existe
          const codigoMock = MOCK_ID_TO_CODIGO.get(rubro.rubroMaestroId) ?? rubro.codigo;
          const maestroExist = await tx.rubroMaestro.findFirst({
            where: { codigo: codigoMock },
            select: { id: true },
          });
          if (maestroExist) {
            maestroId = maestroExist.id;
          } else {
            const unidad = await findOrCreateUnidad(tx, rubro.unidad);
            const nuevo = await tx.rubroMaestro.create({
              data: {
                codigo: codigoMock,
                nombre: rubro.nombre,
                unidadMedidaId: unidad.id,
                empresaId: null, // rubro del sistema
              },
            });
            maestroId = nuevo.id;
          }
        } else if (!rubro.rubroMaestroId || rubro.rubroMaestroId === "") {
          // Rubro completamente personalizado → seed en catálogo de la empresa
          const unidad = await findOrCreateUnidad(tx, rubro.unidad);
          const codigo = generarCodigoCustom();
          const nuevo = await tx.rubroMaestro.create({
            data: {
              codigo,
              nombre: rubro.nombre,
              unidadMedidaId: unidad.id,
              empresaId, // pertenece a esta empresa
            },
          });
          // Guardar la receta maestra para reutilización futura
          for (const ins of rubro.insumos) {
            const uIns = await findOrCreateUnidad(tx, ins.unidad);
            await tx.recetaMaestraDetalle.create({
              data: {
                rubroMaestroId: nuevo.id,
                cantidad: ins.rendimiento,
                porcPerdida: ins.porcPerdida,
                esManodeObra: ins.esManodeObra,
                descripcionMO: ins.nombre, // almacenamos el nombre del insumo aquí
                unidadMedidaId: uIns.id,
              },
            });
          }
          maestroId = nuevo.id;
        } else {
          // CUID real de un maestro DB
          maestroId = rubro.rubroMaestroId;
        }

        // ── Upsert RubroProyecto ────────────────────────────────
        let rpId: string;

        if (isNew) {
          const creado = await tx.rubroProyecto.create({
            data: {
              proyectoId,
              rubroMaestroId: maestroId,
              cantidad: rubro.cantidadObra,
              orden,
            },
          });
          rpId = creado.id;
        } else {
          await tx.rubroProyecto.update({
            where: { id: rubro.instanceId },
            data: { cantidad: rubro.cantidadObra, orden },
          });
          rpId = rubro.instanceId;
        }
        inputIds.add(rpId);

        // ── Reemplazar Insumos ──────────────────────────────────
        await tx.insumo.deleteMany({ where: { rubroProyectoId: rpId } });
        for (const ins of rubro.insumos) {
          const uIns = await findOrCreateUnidad(tx, ins.unidad);
          await tx.insumo.create({
            data: {
              nombre: ins.nombre,
              cantidad: ins.rendimiento,
              porcPerdida: ins.porcPerdida,
              precioUnitario: ins.precioUnitario,
              esPrecioCustom: false,
              esManodeObra: ins.esManodeObra,
              unidadMedidaId: uIns.id,
              rubroProyectoId: rpId,
            },
          });
        }

        updatedRubros.push({
          ...rubro,
          instanceId: rpId,
          rubroMaestroId: maestroId,
        });
      }

      // ── Eliminar rubros que ya no están ────────────────────────
      const toDelete = [...existentesSet].filter((id) => !inputIds.has(id));
      if (toDelete.length > 0) {
        await tx.rubroProyecto.deleteMany({ where: { id: { in: toDelete } } });
      }

      return updatedRubros;
    });

    revalidatePath(`/proyectos/${proyectoId}/presupuesto`);
    revalidatePath(`/proyectos/${proyectoId}/cronograma`);
    revalidatePath(`/proyectos/${proyectoId}/reportes`);
    return { ok: true, rubros: resultado };
  } catch (err) {
    console.error("[guardarPresupuesto]", err);
    return { ok: false, error: "Error al guardar el presupuesto" };
  }
}
