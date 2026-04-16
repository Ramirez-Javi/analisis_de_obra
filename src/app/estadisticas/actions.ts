"use server";

import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────
// TIPOS DE RETORNO
// ─────────────────────────────────────────────────────────────

export interface KpiResumen {
  nombreProyecto: string;
  codigoProyecto: string;
  estado: string;
  /** % avance real ponderado por peso de cada rubro */
  avancePct: number;
  /** Presupuesto total de insumos (Gs) */
  presupuestoTotal: number;
  /** Gasto real acumulado en egresos (Gs) */
  gastoReal: number;
  /** Saldo disponible = INGRESO_CLIENTE total - gastoReal */
  saldoDisponible: number;
  /** Días transcurridos desde fecha de inicio */
  diasTranscurridos: number | null;
  /** Días totales planificados (duracionSemanas * 7) */
  diasPlanificados: number | null;
  /** Monto del contrato aprobado (Gs) */
  montoContrato: number | null;
}

export interface InsumoRubroItem {
  nombre: string;
  unidad: string;
  cantidadProyectada: number;
  cantidadUtilizada: number;
  pctUtilizado: number;
  costoProyectado: number;
  costoEjecutado: number;
  pctCosto: number;
}

export interface RubroConInsumos {
  rubroId: string;
  rubroNombre: string;
  rubroCodigo: string;
  categoriaRubro: string | null;
  cantidad: number;
  unidad: string;
  insumos: InsumoRubroItem[];
  totalCostoProyectado: number;
  totalCostoEjecutado: number;
}

export interface InsumoConsolidadoItem {
  materialId: string;
  materialNombre: string;
  materialCodigo: string;
  unidad: string;
  cantidadProyectada: number;
  cantidadUtilizada: number;
  cantidadEnBodega: number;
  cantidadPorAdquirir: number;
  pctUtilizado: number;
  costoProyectado: number;
  costoEjecutado: number;
}

export interface Timelinepunto {
  fecha: string; // ISO date "YYYY-MM-DD"
  cantidadDiaria: number;
  cantidadAcumulada: number;
}

export interface TimelineMaterial {
  materialId: string;
  materialNombre: string;
  materialCodigo: string;
  unidad: string;
  totalProyectado: number;
  puntos: Timelinepunto[];
}

export interface ManoObraStats {
  totalContratado: number;
  totalPagado: number;
  totalRetencion: number;
  contratos: {
    id: string;
    descripcion: string;
    jefeCuadrilla: string;
    montoPactado: number;
    pagado: number;
    retencion: number;
    estado: string;
    pctPagado: number;
  }[];
}

// ─────────────────────────────────────────────────────────────
// 1 — RESUMEN EJECUTIVO (KPI Cards)
// ─────────────────────────────────────────────────────────────

export async function getResumenEjecutivo(proyectoId: string): Promise<KpiResumen> {
  const proyecto = await prisma.proyecto.findUniqueOrThrow({
    where: { id: proyectoId },
    select: {
      nombre: true,
      codigo: true,
      estado: true,
      fechaInicio: true,
      duracionSemanas: true,
      aprobacion: { select: { montoContratoGs: true } },
      rubrosProyecto: {
        where: { activo: true },
        select: {
          cantidad: true,
          insumos: {
            select: { cantidad: true, porcPerdida: true, precioUnitario: true },
          },
        },
      },
      cronograma: {
        select: {
          rubroProyecto: {
            select: {
              cantidad: true,
              insumos: { select: { precioUnitario: true, cantidad: true, porcPerdida: true } },
            },
          },
          avances: { select: { porcentajeReal: true }, orderBy: { fecha: "desc" }, take: 1 },
        },
      },
      movimientosFinancieros: {
        select: { tipo: true, monto: true },
      },
    },
  });

  // Presupuesto total de insumos
  let presupuestoTotal = 0;
  for (const rubro of proyecto.rubrosProyecto) {
    for (const ins of rubro.insumos) {
      const cantConPerdida = ins.cantidad * rubro.cantidad * (1 + ins.porcPerdida / 100);
      presupuestoTotal += cantConPerdida * Number(ins.precioUnitario);
    }
  }

  // Gasto real e ingresos desde movimientos
  let gastoReal = 0;
  let ingresoTotal = 0;
  for (const mov of proyecto.movimientosFinancieros) {
    if (mov.tipo.startsWith("EGRESO_")) gastoReal += Number(mov.monto);
    if (mov.tipo === "INGRESO_CLIENTE") ingresoTotal += Number(mov.monto);
  }

  // Avance ponderado: peso de cada tarea = (costo rubro / presupuesto total) * % avance tal tarea
  let avancePct = 0;
  if (presupuestoTotal > 0) {
    for (const tarea of proyecto.cronograma) {
      const ultimoAvance = tarea.avances[0]?.porcentajeReal ?? 0;
      let costosRubro = 0;
      for (const ins of tarea.rubroProyecto.insumos) {
        const cantConPerdida = ins.cantidad * tarea.rubroProyecto.cantidad * (1 + ins.porcPerdida / 100);
        costosRubro += cantConPerdida * Number(ins.precioUnitario);
      }
      avancePct += (costosRubro / presupuestoTotal) * ultimoAvance;
    }
  }

  // Días transcurridos
  let diasTranscurridos: number | null = null;
  let diasPlanificados: number | null = null;
  if (proyecto.fechaInicio) {
    const hoy = new Date();
    const inicio = new Date(proyecto.fechaInicio);
    diasTranscurridos = Math.max(0, Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  }
  if (proyecto.duracionSemanas) {
    diasPlanificados = proyecto.duracionSemanas * 7;
  }

  return {
    nombreProyecto: proyecto.nombre,
    codigoProyecto: proyecto.codigo,
    estado: proyecto.estado,
    avancePct: Math.min(100, avancePct),
    presupuestoTotal,
    gastoReal,
    saldoDisponible: ingresoTotal - gastoReal,
    diasTranscurridos,
    diasPlanificados,
    montoContrato: proyecto.aprobacion?.montoContratoGs
      ? Number(proyecto.aprobacion.montoContratoGs)
      : null,
  };
}

// ─────────────────────────────────────────────────────────────
// 2 — INSUMOS POR RUBRO (Gráfico 1 — 2 barras)
// ─────────────────────────────────────────────────────────────

export async function getInsumosPorRubro(proyectoId: string): Promise<RubroConInsumos[]> {
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
          categoria: { select: { nombre: true } },
          unidadMedida: { select: { simbolo: true } },
        },
      },
      insumos: {
        select: {
          id: true,
          nombre: true,
          cantidad: true,
          porcPerdida: true,
          precioUnitario: true,
          esManodeObra: true,
          unidadMedida: { select: { simbolo: true } },
        },
      },
    },
  });

  // Instalado as-built por nombre de material (agrupación por nombre)
  const abRegistros = await prisma.asBuiltRegistro.findMany({
    where: { recepcion: { proyectoId } },
    select: {
      cantidadInstalada: true,
      recepcion: { select: { material: { select: { nombre: true } } } },
    },
  });

  const instaladoPorNombreGlobal = new Map<string, number>();
  for (const ab of abRegistros) {
    const nombre = ab.recepcion.material.nombre;
    instaladoPorNombreGlobal.set(nombre, (instaladoPorNombreGlobal.get(nombre) ?? 0) + ab.cantidadInstalada);
  }

  return rubros.map((rubro) => {
    // Instalado = cantidad as-built del mismo material (por nombre) en todo el proyecto
    const instaladoPorMaterial = new Map<string, number>(
      rubro.insumos.map((ins) => [ins.nombre, instaladoPorNombreGlobal.get(ins.nombre) ?? 0])
    );

    let totalCostoProyectado = 0;
    let totalCostoEjecutado = 0;

    const insumos: InsumoRubroItem[] = rubro.insumos
      .filter((ins) => !ins.esManodeObra)
      .map((ins) => {
        const cantConPerdida = ins.cantidad * rubro.cantidad * (1 + ins.porcPerdida / 100);
        const costoProyectado = cantConPerdida * Number(ins.precioUnitario);

        // "utilizado" = instalado as-built del mismo material en todo el proyecto
        const utilizado = instaladoPorMaterial.get(ins.nombre) ?? 0;
        const costoEjecutado = utilizado * Number(ins.precioUnitario);

        totalCostoProyectado += costoProyectado;
        totalCostoEjecutado += costoEjecutado;

        const pctUtilizado = cantConPerdida > 0 ? (utilizado / cantConPerdida) * 100 : 0;
        const pctCosto = costoProyectado > 0 ? (costoEjecutado / costoProyectado) * 100 : 0;

        return {
          nombre: ins.nombre,
          unidad: ins.unidadMedida?.simbolo ?? "",
          cantidadProyectada: cantConPerdida,
          cantidadUtilizada: utilizado,
          pctUtilizado: Math.min(pctUtilizado, 999),
          costoProyectado,
          costoEjecutado,
          pctCosto: Math.min(pctCosto, 999),
        };
      });

    return {
      rubroId: rubro.id,
      rubroNombre: rubro.rubroMaestro.nombre,
      rubroCodigo: rubro.rubroMaestro.codigo,
      categoriaRubro: rubro.rubroMaestro.categoria?.nombre ?? null,
      cantidad: rubro.cantidad,
      unidad: rubro.rubroMaestro.unidadMedida.simbolo,
      insumos,
      totalCostoProyectado,
      totalCostoEjecutado,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 3 — INSUMOS CONSOLIDADOS (Gráfico 2 — 4 barras)
// ─────────────────────────────────────────────────────────────

export async function getInsumosConsolidados(proyectoId: string): Promise<InsumoConsolidadoItem[]> {
  // Paso 1: cantidades proyectadas por material (suma de todos los rubros)
  const insumos = await prisma.insumo.findMany({
    where: {
      rubroProyecto: { proyectoId, activo: true },
      esManodeObra: false,
    },
    select: {
      nombre: true,
      cantidad: true,
      porcPerdida: true,
      precioUnitario: true,
      unidadMedida: { select: { simbolo: true } },
      rubroProyecto: { select: { cantidad: true } },
    },
  });

  // Agrupación por nombre de insumo (como proxy de material)
  // Nota: en una versión futura se podría cruzar por materialMaestroId si se agrega al Insumo
  const porNombre = new Map<
    string,
    {
      unidad: string;
      cantidadProyectada: number;
      precioUnitario: number;
    }
  >();

  for (const ins of insumos) {
    const cantConPerdida = ins.cantidad * ins.rubroProyecto.cantidad * (1 + ins.porcPerdida / 100);
    const existing = porNombre.get(ins.nombre);
    if (existing) {
      existing.cantidadProyectada += cantConPerdida;
    } else {
      porNombre.set(ins.nombre, {
        unidad: ins.unidadMedida?.simbolo ?? "",
        cantidadProyectada: cantConPerdida,
        precioUnitario: Number(ins.precioUnitario),
      });
    }
  }

  // Paso 2: cantidades recibidas en bodega por material
  const recepciones = await prisma.recepcionBodega.findMany({
    where: { proyectoId },
    select: {
      cantidadRecibida: true,
      material: { select: { id: true, nombre: true, codigo: true } },
    },
  });

  const recibidoPorNombre = new Map<string, { materialId: string; codigo: string; cantidad: number }>();
  for (const rec of recepciones) {
    const existing = recibidoPorNombre.get(rec.material.nombre);
    if (existing) {
      existing.cantidad += rec.cantidadRecibida;
    } else {
      recibidoPorNombre.set(rec.material.nombre, {
        materialId: rec.material.id,
        codigo: rec.material.codigo,
        cantidad: rec.cantidadRecibida,
      });
    }
  }

  // Paso 3: cantidades instaladas por material (as-built)
  const asBuilt = await prisma.asBuiltRegistro.findMany({
    where: { recepcion: { proyectoId } },
    select: {
      cantidadInstalada: true,
      recepcion: {
        select: { material: { select: { nombre: true } } },
      },
    },
  });

  const instaladoPorNombre = new Map<string, number>();
  for (const ab of asBuilt) {
    const nombre = ab.recepcion.material.nombre;
    instaladoPorNombre.set(nombre, (instaladoPorNombre.get(nombre) ?? 0) + ab.cantidadInstalada);
  }

  // Paso 4: Cruzar y construir resultado
  const resultado: InsumoConsolidadoItem[] = [];

  for (const [nombre, datos] of porNombre.entries()) {
    const recibido = recibidoPorNombre.get(nombre);
    const cantidadRecibida = recibido?.cantidad ?? 0;
    const cantidadInstalada = instaladoPorNombre.get(nombre) ?? 0;
    const cantidadEnBodega = Math.max(0, cantidadRecibida - cantidadInstalada);
    const cantidadPorAdquirir = Math.max(0, datos.cantidadProyectada - cantidadRecibida);
    const pctUtilizado =
      datos.cantidadProyectada > 0
        ? Math.min(999, (cantidadInstalada / datos.cantidadProyectada) * 100)
        : 0;

    resultado.push({
      materialId: recibido?.materialId ?? nombre,
      materialNombre: nombre,
      materialCodigo: recibido?.codigo ?? "—",
      unidad: datos.unidad,
      cantidadProyectada: datos.cantidadProyectada,
      cantidadUtilizada: cantidadInstalada,
      cantidadEnBodega,
      cantidadPorAdquirir,
      pctUtilizado,
      costoProyectado: datos.cantidadProyectada * datos.precioUnitario,
      costoEjecutado: cantidadInstalada * datos.precioUnitario,
    });
  }

  // Ordenar por costo proyectado descendente
  return resultado.sort((a, b) => b.costoProyectado - a.costoProyectado);
}

// ─────────────────────────────────────────────────────────────
// 4 — TIMELINE DE UTILIZACIÓN (Gráfico 3)
// ─────────────────────────────────────────────────────────────

export async function getTimelineInsumos(proyectoId: string): Promise<TimelineMaterial[]> {
  // Obtener todos los as-built del proyecto con datos de material y fecha
  const registros = await prisma.asBuiltRegistro.findMany({
    where: { recepcion: { proyectoId } },
    select: {
      fechaInstalacion: true,
      cantidadInstalada: true,
      recepcion: {
        select: {
          material: { select: { id: true, nombre: true, codigo: true } },
        },
      },
    },
    orderBy: { fechaInstalacion: "asc" },
  });

  if (registros.length === 0) return [];

  // Agrupar por material
  const porMaterial = new Map<
    string,
    {
      nombre: string;
      codigo: string;
      puntosDiarios: Map<string, number>; // fecha ISO => cantidad diaria
    }
  >();

  for (const reg of registros) {
    const mid = reg.recepcion.material.id;
    const fechaStr = reg.fechaInstalacion.toISOString().split("T")[0];
    if (!porMaterial.has(mid)) {
      porMaterial.set(mid, {
        nombre: reg.recepcion.material.nombre,
        codigo: reg.recepcion.material.codigo,
        puntosDiarios: new Map(),
      });
    }
    const mat = porMaterial.get(mid)!;
    mat.puntosDiarios.set(
      fechaStr,
      (mat.puntosDiarios.get(fechaStr) ?? 0) + reg.cantidadInstalada
    );
  }

  // Cantidad proyectada por material (para mostrar contexto en el gráfico)
  const insumosProyectados = await prisma.insumo.groupBy({
    by: ["nombre"],
    where: {
      rubroProyecto: { proyectoId, activo: true },
      esManodeObra: false,
    },
    _sum: { cantidad: true },
  });
  const proyectadoPorNombre = new Map(
    insumosProyectados.map((i) => [i.nombre, i._sum.cantidad ?? 0])
  );

  // Construir la serie temporal con acumulado
  const unidades = await prisma.insumo.findMany({
    where: { rubroProyecto: { proyectoId } },
    select: { nombre: true, unidadMedida: { select: { simbolo: true } } },
    distinct: ["nombre"],
  });
  const unidadPorNombre = new Map(unidades.map((u) => [u.nombre, u.unidadMedida?.simbolo ?? ""]));

  const resultado: TimelineMaterial[] = [];

  for (const [mid, datos] of porMaterial.entries()) {
    const fechasOrdenadas = Array.from(datos.puntosDiarios.keys()).sort();
    let acumulado = 0;
    const puntos: Timelinepunto[] = fechasOrdenadas.map((fecha) => {
      const diaria = datos.puntosDiarios.get(fecha)!;
      acumulado += diaria;
      return { fecha, cantidadDiaria: diaria, cantidadAcumulada: acumulado };
    });

    resultado.push({
      materialId: mid,
      materialNombre: datos.nombre,
      materialCodigo: datos.codigo,
      unidad: unidadPorNombre.get(datos.nombre) ?? "",
      totalProyectado: proyectadoPorNombre.get(datos.nombre) ?? 0,
      puntos,
    });
  }

  return resultado;
}

// ─────────────────────────────────────────────────────────────
// 5 — MANO DE OBRA STATS
// ─────────────────────────────────────────────────────────────

export async function getManoObraStats(proyectoId: string): Promise<ManoObraStats> {
  const contratos = await prisma.contratoManoObra.findMany({
    where: { proyectoId },
    select: {
      id: true,
      descripcion: true,
      jefeCuadrilla: true,
      montoPactado: true,
      porcRetencion: true,
      estado: true,
      pagos: { select: { monto: true } },
    },
  });

  let totalContratado = 0;
  let totalPagado = 0;
  let totalRetencion = 0;

  const contratosDetalle = contratos.map((c) => {
    const montoPactado = Number(c.montoPactado);
    const pagado = c.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const retencion = montoPactado * (c.porcRetencion / 100);

    totalContratado += montoPactado;
    totalPagado += pagado;
    totalRetencion += retencion;

    return {
      id: c.id,
      descripcion: c.descripcion,
      jefeCuadrilla: c.jefeCuadrilla,
      montoPactado,
      pagado,
      retencion,
      estado: c.estado,
      pctPagado: montoPactado > 0 ? Math.min(100, (pagado / montoPactado) * 100) : 0,
    };
  });

  return { totalContratado, totalPagado, totalRetencion, contratos: contratosDetalle };
}

// ─────────────────────────────────────────────────────────────
// HELPER — lista de proyectos para el selector global
// ─────────────────────────────────────────────────────────────

export async function getProyectosParaSelector() {
  return prisma.proyecto.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 6 — CURVA S (Planificado vs Real)
// ─────────────────────────────────────────────────────────────

export interface PuntoAvance {
  fecha: string;        // "DD/MM/YY"
  fechaISO: string;     // "YYYY-MM-DD"
  planificado: number;  // % acumulado planificado
  real: number;         // % acumulado real (null si no hay dato = no dibujar)
}

export interface CurvaSData {
  puntos: PuntoAvance[];
  avanceActualReal: number;
  avanceActualPlanificado: number;
  sinFechaInicio: boolean;
  sinTareas: boolean;
}

export async function getCurvaS(proyectoId: string): Promise<CurvaSData> {
  const proyecto = await prisma.proyecto.findUniqueOrThrow({
    where: { id: proyectoId },
    select: { fechaInicio: true },
  });

  const tareas = await prisma.microcicloTarea.findMany({
    where: { proyectoId },
    select: {
      id: true,
      diaInicio: true,
      duracionDias: true,
      rubroProyecto: {
        select: {
          cantidad: true,
          insumos: { select: { cantidad: true, porcPerdida: true, precioUnitario: true } },
        },
      },
      avances: {
        select: { fecha: true, porcentajeReal: true },
        orderBy: { fecha: "asc" },
      },
    },
  });

  if (tareas.length === 0) {
    return { puntos: [], avanceActualReal: 0, avanceActualPlanificado: 0, sinFechaInicio: !proyecto.fechaInicio, sinTareas: true };
  }

  // Calcular peso económico de cada tarea
  let totalCosto = 0;
  const tareasConPeso = tareas.map((t) => {
    let costo = 0;
    for (const ins of t.rubroProyecto.insumos) {
      const qty = ins.cantidad * t.rubroProyecto.cantidad * (1 + ins.porcPerdida / 100);
      costo += qty * Number(ins.precioUnitario);
    }
    totalCosto += costo;
    return { ...t, costo };
  });

  const costoBase = totalCosto > 0 ? totalCosto : tareas.length; // fallback: peso igual
  const tareasNorm = tareasConPeso.map((t) => ({
    ...t,
    peso: (totalCosto > 0 ? t.costo : 1) / costoBase,
  }));

  // Reunir todas las fechas relevantes
  const fechaSet = new Set<string>();
  const today = new Date();
  fechaSet.add(today.toISOString().split("T")[0]);

  const fechaInicioProyecto = proyecto.fechaInicio ?? null;
  if (fechaInicioProyecto) {
    fechaSet.add(fechaInicioProyecto.toISOString().split("T")[0]);
    // Fecha fin planificada de cada tarea
    for (const t of tareasNorm) {
      const inicio = new Date(fechaInicioProyecto);
      inicio.setDate(inicio.getDate() + t.diaInicio - 1);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + t.duracionDias);
      fechaSet.add(fin.toISOString().split("T")[0]);
    }
  }
  // Fechas de avances reales
  for (const t of tareasNorm) {
    for (const av of t.avances) {
      fechaSet.add(av.fecha.toISOString().split("T")[0]);
    }
  }

  const fechasSorted = Array.from(fechaSet).sort();

  // Muestreo: si hay más de 60 puntos, reducir
  let fechasFinal = fechasSorted;
  if (fechasSorted.length > 60) {
    const step = Math.ceil(fechasSorted.length / 60);
    fechasFinal = fechasSorted.filter((_, i) => i % step === 0 || i === fechasSorted.length - 1);
  }

  function formatFecha(iso: string): string {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  }

  const puntos: PuntoAvance[] = fechasFinal.map((fechaStr) => {
    const fechaD = new Date(fechaStr + "T12:00:00");
    let planificado = 0;
    let real = 0;

    for (const t of tareasNorm) {
      // Planificado
      if (fechaInicioProyecto) {
        const inicio = new Date(fechaInicioProyecto);
        inicio.setDate(inicio.getDate() + t.diaInicio - 1);
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + t.duracionDias);

        if (fechaD >= fin) {
          planificado += 100 * t.peso;
        } else if (fechaD >= inicio && t.duracionDias > 0) {
          const fraccion = (fechaD.getTime() - inicio.getTime()) / (fin.getTime() - inicio.getTime());
          planificado += fraccion * 100 * t.peso;
        }
      }

      // Real: último avance registrado ≤ fecha actual
      const avAnt = [...t.avances]
        .reverse()
        .find((av) => av.fecha <= new Date(fechaStr + "T23:59:59"));
      if (avAnt) real += avAnt.porcentajeReal * t.peso;
    }

    return {
      fecha: formatFecha(fechaStr),
      fechaISO: fechaStr,
      planificado: Math.min(100, parseFloat(planificado.toFixed(1))),
      real: Math.min(100, parseFloat(real.toFixed(1))),
    };
  });

  const ultimo = puntos[puntos.length - 1];
  return {
    puntos,
    avanceActualReal: ultimo?.real ?? 0,
    avanceActualPlanificado: ultimo?.planificado ?? 0,
    sinFechaInicio: !fechaInicioProyecto,
    sinTareas: false,
  };
}

// ─────────────────────────────────────────────────────────────
// 7 — FLUJO DE CAJA MENSUAL
// ─────────────────────────────────────────────────────────────

export interface FlujoCajaMensual {
  mes: string;           // "Ene 26"
  mesISO: string;        // "2026-01"
  ingresos: number;
  egresos: number;
  saldoAcumulado: number;
}

export async function getFlujoCaja(proyectoId: string): Promise<FlujoCajaMensual[]> {
  const movimientos = await prisma.movimientoFinanciero.findMany({
    where: { proyectoId },
    select: { fecha: true, tipo: true, monto: true },
    orderBy: { fecha: "asc" },
  });

  if (movimientos.length === 0) return [];

  const porMes = new Map<string, { ingresos: number; egresos: number }>();

  for (const m of movimientos) {
    const key = `${m.fecha.getFullYear()}-${String(m.fecha.getMonth() + 1).padStart(2, "0")}`;
    const entry = porMes.get(key) ?? { ingresos: 0, egresos: 0 };
    if (m.tipo.startsWith("INGRESO_")) entry.ingresos += Number(m.monto);
    else entry.egresos += Number(m.monto);
    porMes.set(key, entry);
  }

  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const mesesOrdenados = Array.from(porMes.entries()).sort(([a], [b]) => a.localeCompare(b));

  let saldoAcumulado = 0;
  return mesesOrdenados.map(([key, { ingresos, egresos }]) => {
    const [y, m] = key.split("-").map(Number);
    saldoAcumulado += ingresos - egresos;
    return {
      mes: `${MESES[m - 1]} ${String(y).slice(2)}`,
      mesISO: key,
      ingresos,
      egresos,
      saldoAcumulado,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 8 — PLAN DE PAGOS DEL CLIENTE
// ─────────────────────────────────────────────────────────────

export interface CuotaItem {
  numeroCuota: number;
  descripcion: string | null;
  porcentaje: number;
  montoCalculado: number;
  fechaEstimada: string | null;
  fechaPago: string | null;
  estado: string;
}

export interface PlanPagosData {
  cuotas: CuotaItem[];
  totalContrato: number;
  totalCobrado: number;
  totalPendiente: number;
  sinContrato: boolean;
}

export async function getPlanPagos(proyectoId: string): Promise<PlanPagosData> {
  const proyecto = await prisma.proyecto.findUniqueOrThrow({
    where: { id: proyectoId },
    select: {
      aprobacion: { select: { montoContratoGs: true } },
      planPagos: {
        orderBy: { numeroCuota: "asc" },
        select: {
          numeroCuota: true,
          porcentaje: true,
          descripcion: true,
          fechaEstimada: true,
          estado: true,
          fechaPago: true,
        },
      },
    },
  });

  const montoContrato = Number(proyecto.aprobacion?.montoContratoGs ?? 0);

  if (proyecto.planPagos.length === 0) {
    return { cuotas: [], totalContrato: montoContrato, totalCobrado: 0, totalPendiente: montoContrato, sinContrato: montoContrato === 0 };
  }

  const cuotas: CuotaItem[] = proyecto.planPagos.map((c) => ({
    numeroCuota: c.numeroCuota,
    descripcion: c.descripcion,
    porcentaje: c.porcentaje,
    montoCalculado: montoContrato * c.porcentaje / 100,
    fechaEstimada: c.fechaEstimada?.toISOString().split("T")[0] ?? null,
    fechaPago: c.fechaPago?.toISOString().split("T")[0] ?? null,
    estado: c.estado,
  }));

  const totalCobrado = cuotas
    .filter((c) => c.estado === "PAGADA")
    .reduce((s, c) => s + c.montoCalculado, 0);

  return {
    cuotas,
    totalContrato: montoContrato,
    totalCobrado,
    totalPendiente: montoContrato - totalCobrado,
    sinContrato: montoContrato === 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 9 — COSTOS INDIRECTOS
// ─────────────────────────────────────────────────────────────

export interface CostoIndirectoAgrupado {
  tipo: string;
  label: string;
  total: number;
  cantidad: number;
}

const LABEL_TIPO: Record<string, string> = {
  FLETE: "Fletes",
  ALQUILER_MAQUINARIA: "Maquinaria",
  HONORARIOS_PROYECTO: "Honorarios",
  GASTO_ADMINISTRATIVO: "Administrativo",
  SEGURO: "Seguros",
  OTRO: "Otros",
};

export async function getCostosIndirectos(proyectoId: string): Promise<CostoIndirectoAgrupado[]> {
  const items = await prisma.costoIndirecto.findMany({
    where: { proyectoId },
    select: { tipo: true, monto: true },
  });

  if (items.length === 0) return [];

  const porTipo = new Map<string, { total: number; cantidad: number }>();
  for (const item of items) {
    const entry = porTipo.get(item.tipo) ?? { total: 0, cantidad: 0 };
    entry.total += Number(item.monto);
    entry.cantidad += 1;
    porTipo.set(item.tipo, entry);
  }

  return Array.from(porTipo.entries())
    .map(([tipo, { total, cantidad }]) => ({
      tipo,
      label: LABEL_TIPO[tipo] ?? tipo,
      total,
      cantidad,
    }))
    .sort((a, b) => b.total - a.total);
}

// ─────────────────────────────────────────────────────────────
// 10 — ESTADÍSTICAS DE BITÁCORA (Personal + Clima)
// ─────────────────────────────────────────────────────────────

export interface DiaPersonalBitacora {
  fecha: string;       // "DD/MM/YY"
  fechaISO: string;
  horasTotales: number;
  personalCount: number;
}

export interface ClimaFrecuencia {
  clima: string;
  cantidad: number;
  pct: number;
}

export interface BitacoraStats {
  diasConActividad: number;
  totalHorasRegistradas: number;
  personalDiario: DiaPersonalBitacora[];
  climaFrecuencia: ClimaFrecuencia[];
}

export async function getBitacoraStats(proyectoId: string): Promise<BitacoraStats> {
  const entradas = await prisma.bitacoraEntrada.findMany({
    where: { proyectoId },
    select: {
      fecha: true,
      clima: true,
      personalDelDia: { select: { horasTrabajadas: true } },
    },
    orderBy: { fecha: "asc" },
  });

  if (entradas.length === 0) {
    return { diasConActividad: 0, totalHorasRegistradas: 0, personalDiario: [], climaFrecuencia: [] };
  }

  function fmtFecha(d: Date): { iso: string; fmt: string } {
    const iso = d.toISOString().split("T")[0];
    const [y, m, dd] = iso.split("-");
    return { iso, fmt: `${dd}/${m}/${y.slice(2)}` };
  }

  let totalHoras = 0;
  const personalDiario: DiaPersonalBitacora[] = [];
  const climaMap = new Map<string, number>();

  for (const e of entradas) {
    const { iso, fmt } = fmtFecha(e.fecha);
    const horas = e.personalDelDia.reduce((s, p) => s + (p.horasTrabajadas ?? 0), 0);
    totalHoras += horas;
    personalDiario.push({
      fecha: fmt,
      fechaISO: iso,
      horasTotales: parseFloat(horas.toFixed(1)),
      personalCount: e.personalDelDia.length,
    });

    if (e.clima) {
      climaMap.set(e.clima, (climaMap.get(e.clima) ?? 0) + 1);
    }
  }

  const totalClima = Array.from(climaMap.values()).reduce((s, v) => s + v, 0);
  const climaFrecuencia: ClimaFrecuencia[] = Array.from(climaMap.entries())
    .map(([clima, cantidad]) => ({
      clima,
      cantidad,
      pct: totalClima > 0 ? parseFloat(((cantidad / totalClima) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return {
    diasConActividad: entradas.length,
    totalHorasRegistradas: parseFloat(totalHoras.toFixed(1)),
    personalDiario,
    climaFrecuencia,
  };
}

// ─────────────────────────────────────────────────────────────
// TIPO COMPUESTO + SERVER ACTION PARA CLIENTE
// ─────────────────────────────────────────────────────────────

export interface DashboardProyectoData {
  proyectoId: string;
  kpi: KpiResumen;
  insumosPorRubro: RubroConInsumos[];
  insumosConsolidados: InsumoConsolidadoItem[];
  timeline: TimelineMaterial[];
  manoObra: ManoObraStats;
  curvaS: CurvaSData;
  flujoCaja: FlujoCajaMensual[];
  planPagos: PlanPagosData;
  costosIndirectos: CostoIndirectoAgrupado[];
  bitacora: BitacoraStats;
}

export async function fetchProyectoData(proyectoId: string): Promise<DashboardProyectoData> {
  const [kpi, insumosPorRubro, insumosConsolidados, timeline, manoObra, curvaS, flujoCaja, planPagos, costosIndirectos, bitacora] = await Promise.all([
    getResumenEjecutivo(proyectoId),
    getInsumosPorRubro(proyectoId),
    getInsumosConsolidados(proyectoId),
    getTimelineInsumos(proyectoId),
    getManoObraStats(proyectoId),
    getCurvaS(proyectoId),
    getFlujoCaja(proyectoId),
    getPlanPagos(proyectoId),
    getCostosIndirectos(proyectoId),
    getBitacoraStats(proyectoId),
  ]);
  return { proyectoId, kpi, insumosPorRubro, insumosConsolidados, timeline, manoObra, curvaS, flujoCaja, planPagos, costosIndirectos, bitacora };
}
