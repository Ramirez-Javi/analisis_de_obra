"use server";

/**
 * Acciones de servidor para hidratar con datos de DB los módulos
 * que son client-only (Presupuesto, ManoObra, Logística).
 * Los datos de DB se transforman al formato exacto que espera el state del cliente.
 */

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// ─────────────────────────────────────────────────────────────
// HELPER: verificar que el proyecto pertenece a la empresa del usuario
// ─────────────────────────────────────────────────────────────
async function checkProyecto(proyectoId: string) {
  const session = await getSession();
  if (!session?.user) return false;
  const empresaId = (session.user as { empresaId?: string }).empresaId;
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId, ...(empresaId ? { empresaId } : {}) },
    select: { id: true },
  });
  return !!proyecto;
}

// ─────────────────────────────────────────────────────────────
// 1. PRESUPUESTO — tipos espejo de components/presupuesto/types.ts
// ─────────────────────────────────────────────────────────────
export interface InsumoRubroDB {
  id: string;
  nombre: string;
  unidad: string;
  rendimiento: number;
  porcPerdida: number;
  precioUnitario: number;
  esManodeObra: boolean;
}

export interface RubroProyectoDB {
  instanceId: string;
  rubroMaestroId: string;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidadObra: number;
  expanded: boolean;
  insumos: InsumoRubroDB[];
}

export async function cargarRubrosPresupuesto(
  proyectoId: string
): Promise<RubroProyectoDB[]> {
  if (!(await checkProyecto(proyectoId))) return [];

  const rubros = await prisma.rubroProyecto.findMany({
    where: { proyectoId, activo: true },
    orderBy: { orden: "asc" },
    include: {
      rubroMaestro: {
        include: { unidadMedida: true },
      },
      insumos: {
        include: { unidadMedida: true },
      },
    },
  });

  return rubros.map((rp) => ({
    instanceId: rp.id,
    rubroMaestroId: rp.rubroMaestroId,
    codigo: rp.rubroMaestro.codigo,
    nombre: rp.rubroMaestro.nombre,
    unidad: rp.rubroMaestro.unidadMedida.nombre,
    cantidadObra: rp.cantidad,
    expanded: false,
    insumos: rp.insumos.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      unidad: i.unidadMedida?.nombre ?? "u",
      rendimiento: i.cantidad,
      porcPerdida: i.porcPerdida,
      precioUnitario: Number(i.precioUnitario),
      esManodeObra: i.esManodeObra,
    })),
  }));
}

// ─────────────────────────────────────────────────────────────
// 2. MANO DE OBRA — tipos espejo de components/mano-obra/ManoObraClient.tsx
// ─────────────────────────────────────────────────────────────
export interface AyudanteDB {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
}

export interface PagoRegistroDB {
  id: string;
  fecha: string;
  monto: number;
  porcentajePago: number;
  porcentajeAvance: number;
}

export interface ContratistaDB {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
  rubro: string;
  alcance: string;
  montoPactado: number;
  retencion: number;
  ayudantes: AyudanteDB[];
}

export interface ManoObraInitData {
  contratistas: ContratistaDB[];
  pagosMap: Record<string, PagoRegistroDB[]>;
}

export async function cargarManoObraProyecto(
  proyectoId: string
): Promise<ManoObraInitData> {
  if (!(await checkProyecto(proyectoId))) {
    return { contratistas: [], pagosMap: {} };
  }

  const contratos = await prisma.contratoManoObra.findMany({
    where: { proyectoId },
    orderBy: { createdAt: "asc" },
    include: {
      personal: true,
      pagos: { orderBy: { fecha: "asc" } },
      rubrosAsignados: {
        include: { rubroProyecto: { include: { rubroMaestro: true } } },
      },
    },
  });

  const contratistas: ContratistaDB[] = contratos.map((c) => {
    const rubrosNombres = c.rubrosAsignados
      .map((r) => r.rubroProyecto.rubroMaestro.nombre)
      .join(", ");

    return {
      id: c.id,
      nombre: c.jefeCuadrilla,
      documento: c.personal.find((p) => p.rol.toLowerCase().includes("oficial"))?.dni ?? "",
      telefono: c.personal.find((p) => p.rol.toLowerCase().includes("oficial"))?.telefono ?? "",
      rubro: rubrosNombres || c.descripcion,
      alcance: c.descripcion,
      montoPactado: Number(c.montoPactado),
      retencion: c.porcRetencion,
      ayudantes: c.personal.map((p) => ({
        id: p.id,
        nombre: `${p.nombre} ${p.apellido}`.trim(),
        documento: p.dni ?? "",
        telefono: p.telefono ?? "",
      })),
    };
  });

  const pagosMap: Record<string, PagoRegistroDB[]> = {};
  for (const c of contratos) {
    let acumulado = 0;
    pagosMap[c.id] = c.pagos.map((p) => {
      const monto = Number(p.monto);
      acumulado += monto;
      return {
        id: p.id,
        fecha: p.fecha.toISOString().slice(0, 10),
        monto,
        porcentajePago: Number(c.montoPactado) > 0
          ? Math.round((monto / Number(c.montoPactado)) * 100)
          : 0,
        porcentajeAvance: Number(c.montoPactado) > 0
          ? Math.round((acumulado / Number(c.montoPactado)) * 100)
          : 0,
      };
    });
  }

  return { contratistas, pagosMap };
}

// ─────────────────────────────────────────────────────────────
// 3. LOGÍSTICA — tipos espejo de components/logistica/LogisticaClient.tsx
// ─────────────────────────────────────────────────────────────
type UnidadLog = "Horas" | "Días" | "Meses" | "Viajes" | "Global" | "Unidad";

export interface EquipoRubroDB {
  id: string;
  rubroId: string;
  descripcion: string;
  unidad: UnidadLog;
  cantidad: number;
  costoUnitario: number;
}

export interface GastoLogisticoDB {
  id: string;
  descripcion: string;
  unidad: UnidadLog;
  cantidad: number;
  costoUnitario: number;
}

export interface RubroMockDB {
  id: string;
  nombre: string;
}

export interface LogisticaInitData {
  equipos: EquipoRubroDB[];
  gastos: GastoLogisticoDB[];
  rubrosMock: RubroMockDB[];
}

export async function cargarLogisticaProyecto(
  proyectoId: string
): Promise<LogisticaInitData> {
  if (!(await checkProyecto(proyectoId))) {
    return { equipos: [], gastos: [], rubrosMock: [] };
  }

  const [costosIndirectos, rubrosProyecto] = await Promise.all([
    prisma.costoIndirecto.findMany({
      where: { proyectoId },
      orderBy: { fecha: "asc" },
    }),
    prisma.rubroProyecto.findMany({
      where: { proyectoId, activo: true },
      orderBy: { orden: "asc" },
      include: { rubroMaestro: true },
    }),
  ]);

  // Mapa de rubros para el selector
  const rubrosMock: RubroMockDB[] = rubrosProyecto.map((rp) => ({
    id: rp.id,
    nombre: rp.rubroMaestro.nombre,
  }));

  // Rubro default (primero de la lista)
  const defaultRubroId = rubrosMock[0]?.id ?? "r1";

  const equipos: EquipoRubroDB[] = [];
  const gastos: GastoLogisticoDB[] = [];

  for (const ci of costosIndirectos) {
    if (ci.tipo === "ALQUILER_MAQUINARIA") {
      // Intentar asociar al rubro por coincidencia de texto
      const palabrasClave = ci.descripcion.toLowerCase();
      const rubroAsociado = rubrosMock.find((r) =>
        palabrasClave.includes(r.nombre.toLowerCase().split(" ")[0].toLowerCase())
      );
      equipos.push({
        id: ci.id,
        rubroId: rubroAsociado?.id ?? defaultRubroId,
        descripcion: ci.descripcion,
        unidad: "Días",
        cantidad: 1,
        costoUnitario: Number(ci.monto),
      });
    } else {
      gastos.push({
        id: ci.id,
        descripcion: ci.descripcion,
        unidad: ci.tipo === "FLETE" ? "Viajes" : ci.tipo === "SEGURO" ? "Global" : "Global",
        cantidad: 1,
        costoUnitario: Number(ci.monto),
      });
    }
  }

  return { equipos, gastos, rubrosMock };
}
