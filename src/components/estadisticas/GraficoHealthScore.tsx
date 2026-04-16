"use client";

import type { DashboardProyectoData } from "@/app/estadisticas/actions";

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

type Semaforo = "verde" | "amarillo" | "rojo" | "gris";

interface Indicador {
  id: string;
  titulo: string;
  valor: string;
  detalle: string;
  estado: Semaforo;
  icono: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtGs(n: number): string {
  if (Math.abs(n) >= 1_000_000_000)
    return `Gs ${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000)
    return `Gs ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)
    return `Gs ${(n / 1_000).toFixed(0)}K`;
  return `Gs ${n.toFixed(0)}`;
}

// ─────────────────────────────────────────────────────────────
// CÁLCULO DE INDICADORES
// ─────────────────────────────────────────────────────────────

function calcularIndicadores(data: DashboardProyectoData): Indicador[] {
  const { kpi, insumosConsolidados, manoObra, planPagos, flujoCaja } = data;
  const hoy = new Date();
  const indicadores: Indicador[] = [];

  // ── 1. Avance vs Tiempo ─────────────────────────────────────
  if (kpi.diasPlanificados && kpi.diasTranscurridos !== null) {
    const pctTiempo = (kpi.diasTranscurridos / kpi.diasPlanificados) * 100;
    const delta = kpi.avancePct - pctTiempo;
    let estado: Semaforo = "verde";
    let detalle = "";
    if (delta >= 0) {
      detalle = `Adelantado ${delta.toFixed(1)}% respecto al tiempo transcurrido`;
    } else if (delta >= -10) {
      estado = "amarillo";
      detalle = `Retrasado ${Math.abs(delta).toFixed(1)}% respecto al tiempo`;
    } else {
      estado = "rojo";
      detalle = `Retrasado ${Math.abs(delta).toFixed(1)}% respecto al tiempo`;
    }
    indicadores.push({
      id: "avance-tiempo",
      titulo: "Avance vs Tiempo",
      valor: `${kpi.avancePct.toFixed(1)}% obra`,
      detalle,
      estado,
      icono: "⏱",
    });
  } else {
    indicadores.push({
      id: "avance-tiempo",
      titulo: "Avance vs Tiempo",
      valor: `${kpi.avancePct.toFixed(1)}% obra`,
      detalle: "Sin fecha planificada definida",
      estado: "gris",
      icono: "⏱",
    });
  }

  // ── 2. Gasto vs Presupuesto ─────────────────────────────────
  if (kpi.presupuestoTotal > 0) {
    const pctGasto = (kpi.gastoReal / kpi.presupuestoTotal) * 100;
    const deltaGasto = kpi.avancePct - pctGasto; // positivo = bajo gasto (bueno)
    let estado: Semaforo = "verde";
    let detalle = "";
    if (pctGasto > 100) {
      estado = "rojo";
      detalle = `Sobre presupuesto en ${(pctGasto - 100).toFixed(1)}%`;
    } else if (deltaGasto < -10) {
      estado = "amarillo";
      detalle = `Gasto (${pctGasto.toFixed(1)}%) supera avance (${kpi.avancePct.toFixed(1)}%)`;
    } else {
      detalle = `${pctGasto.toFixed(1)}% del presupuesto ejecutado — dentro del límite`;
    }
    indicadores.push({
      id: "gasto-presupuesto",
      titulo: "Gasto vs Presupuesto",
      valor: fmtGs(kpi.gastoReal),
      detalle,
      estado,
      icono: "💰",
    });
  }

  // ── 3. Saldo de Caja ────────────────────────────────────────
  {
    let estado: Semaforo;
    let detalle: string;
    if (kpi.saldoDisponible > 0) {
      estado = "verde";
      detalle = `Caja positiva — margen disponible`;
    } else if (kpi.saldoDisponible === 0) {
      estado = "amarillo";
      detalle = "Caja en cero — sin margen";
    } else {
      estado = "rojo";
      detalle = `Déficit de ${fmtGs(Math.abs(kpi.saldoDisponible))}`;
    }
    indicadores.push({
      id: "saldo-caja",
      titulo: "Saldo de Caja",
      valor: fmtGs(kpi.saldoDisponible),
      detalle,
      estado,
      icono: "🏦",
    });
  }

  // ── 4. Contratos de Mano de Obra vencidos/atrasados ─────────
  {
    const vencidos = manoObra.contratos.filter(
      (c) => c.estado === "ACTIVO" && c.pctPagado < 50,
    );
    const pendientes = manoObra.contratos.filter(
      (c) => c.estado === "ACTIVO" && c.pctPagado >= 50 && c.pctPagado < 100,
    );
    let estado: Semaforo = "verde";
    let valor = "Al día";
    let detalle = `${manoObra.contratos.length} contrato(s) — todos gestionados`;
    if (vencidos.length > 0) {
      estado = "rojo";
      valor = `${vencidos.length} contrato(s) crítico(s)`;
      detalle = `Contratos activos con menos del 50% pagado`;
    } else if (pendientes.length > 0) {
      estado = "amarillo";
      valor = `${pendientes.length} contrato(s) en curso`;
      detalle = `Con pagos parciales pendientes`;
    }
    indicadores.push({
      id: "mano-obra",
      titulo: "Mano de Obra",
      valor,
      detalle,
      estado,
      icono: "👷",
    });
  }

  // ── 5. Materiales en stock crítico ──────────────────────────
  {
    const criticos = insumosConsolidados.filter(
      (i) => i.cantidadPorAdquirir > 0 && i.cantidadEnBodega === 0,
    );
    const bajos = insumosConsolidados.filter(
      (i) => i.cantidadPorAdquirir > 0 && i.cantidadEnBodega > 0,
    );
    let estado: Semaforo = "verde";
    let valor = "Stock OK";
    let detalle = "Todos los materiales cubiertos";
    if (criticos.length > 0) {
      estado = "rojo";
      valor = `${criticos.length} material(es) sin stock`;
      detalle = `Sin unidades en bodega — requieren compra urgente`;
    } else if (bajos.length > 0) {
      estado = "amarillo";
      valor = `${bajos.length} material(es) bajo`;
      detalle = `Stock insuficiente para completar lo proyectado`;
    }
    indicadores.push({
      id: "stock",
      titulo: "Stock de Materiales",
      valor,
      detalle,
      estado,
      icono: "📦",
    });
  }

  // ── 6. Cuotas vencidas sin cobrar ───────────────────────────
  if (!planPagos.sinContrato && planPagos.cuotas.length > 0) {
    const vencidas = planPagos.cuotas.filter((c) => {
      if (c.estado === "PAGADA") return false;
      if (!c.fechaEstimada) return false;
      return new Date(c.fechaEstimada) < hoy;
    });
    const proximas = planPagos.cuotas.filter((c) => {
      if (c.estado === "PAGADA") return false;
      if (!c.fechaEstimada) return false;
      const diff =
        (new Date(c.fechaEstimada).getTime() - hoy.getTime()) /
        (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 15;
    });
    let estado: Semaforo = "verde";
    let valor = "Cobros al día";
    let detalle = "Sin cuotas vencidas pendientes";
    if (vencidas.length > 0) {
      estado = "rojo";
      valor = `${vencidas.length} cuota(s) vencida(s)`;
      detalle = `Total: ${fmtGs(vencidas.reduce((s, c) => s + c.montoCalculado, 0))} sin cobrar`;
    } else if (proximas.length > 0) {
      estado = "amarillo";
      valor = `${proximas.length} cuota(s) próximas`;
      detalle = `Vencen en los próximos 15 días`;
    }
    indicadores.push({
      id: "cobros",
      titulo: "Plan de Cobros",
      valor,
      detalle,
      estado,
      icono: "📋",
    });
  }

  // ── 7. Tendencia de Flujo de Caja ───────────────────────────
  if (flujoCaja.length >= 2) {
    const ultimos = flujoCaja.slice(-3);
    const negativos = ultimos.filter((f) => f.ingresos - f.egresos < 0).length;
    let estado: Semaforo = "verde";
    let valor = "Tendencia positiva";
    let detalle = "Ingresos superan egresos en los últimos meses";
    if (negativos >= 3) {
      estado = "rojo";
      valor = "Tendencia negativa";
      detalle = "Más egresos que ingresos los últimos 3 meses";
    } else if (negativos >= 2) {
      estado = "amarillo";
      valor = "Tendencia mixta";
      detalle = `${negativos} de los últimos 3 meses con resultado negativo`;
    }
    indicadores.push({
      id: "flujo-tendencia",
      titulo: "Tendencia de Caja",
      valor,
      detalle,
      estado,
      icono: "📈",
    });
  }

  return indicadores;
}

// ─────────────────────────────────────────────────────────────
// SCORE GLOBAL
// ─────────────────────────────────────────────────────────────

function calcularScore(indicadores: Indicador[]): {
  puntaje: number;
  nivel: "Crítico" | "En Alerta" | "Estable" | "Óptimo";
  color: string;
  bg: string;
} {
  const pesos: Record<Semaforo, number> = {
    verde: 100,
    amarillo: 50,
    rojo: 0,
    gris: 75,
  };
  const activos = indicadores.filter((i) => i.estado !== "gris");
  if (activos.length === 0)
    return { puntaje: 0, nivel: "Crítico", color: "text-red-500", bg: "bg-red-500" };

  const puntaje = Math.round(
    activos.reduce((s, i) => s + pesos[i.estado], 0) / activos.length,
  );

  if (puntaje >= 85)
    return { puntaje, nivel: "Óptimo", color: "text-emerald-500", bg: "bg-emerald-500" };
  if (puntaje >= 60)
    return { puntaje, nivel: "Estable", color: "text-blue-500", bg: "bg-blue-500" };
  if (puntaje >= 35)
    return { puntaje, nivel: "En Alerta", color: "text-amber-500", bg: "bg-amber-500" };
  return { puntaje, nivel: "Crítico", color: "text-red-500", bg: "bg-red-500" };
}

// ─────────────────────────────────────────────────────────────
// COLORES POR ESTADO
// ─────────────────────────────────────────────────────────────

const COLORES: Record<Semaforo, {
  ring: string;
  bg: string;
  dot: string;
  label: string;
  labelColor: string;
}> = {
  verde: {
    ring: "ring-emerald-400/30 dark:ring-emerald-500/20",
    bg: "bg-emerald-50 dark:bg-emerald-900/10",
    dot: "bg-emerald-500",
    label: "OK",
    labelColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
  },
  amarillo: {
    ring: "ring-amber-400/30 dark:ring-amber-500/20",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    dot: "bg-amber-500",
    label: "Alerta",
    labelColor: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
  },
  rojo: {
    ring: "ring-red-400/40 dark:ring-red-500/20",
    bg: "bg-red-50 dark:bg-red-900/10",
    dot: "bg-red-500",
    label: "Crítico",
    labelColor: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
  },
  gris: {
    ring: "ring-slate-300/30 dark:ring-slate-700/20",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    dot: "bg-slate-400",
    label: "Sin datos",
    labelColor: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
  },
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────

export function GraficoHealthScore({ data }: { data: DashboardProyectoData }) {
  const indicadores = calcularIndicadores(data);
  const score = calcularScore(indicadores);

  // Resumen de estados
  const conteo = { verde: 0, amarillo: 0, rojo: 0, gris: 0 };
  for (const i of indicadores) conteo[i.estado]++;

  return (
    <div className="space-y-6">
      {/* ── Score global ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-800/40 bg-white">
        {/* Gauge circular */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <svg width={120} height={120} viewBox="0 0 120 120">
            {/* Track */}
            <circle
              cx={60} cy={60} r={50}
              fill="none"
              stroke="currentColor"
              strokeWidth={10}
              className="text-slate-200 dark:text-slate-700"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            {/* Progreso */}
            <circle
              cx={60} cy={60} r={50}
              fill="none"
              strokeWidth={10}
              className={score.color.replace("text-", "stroke-")}
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - score.puntaje / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
            <text
              x={60} y={56}
              textAnchor="middle"
              dominantBaseline="middle"
              className={score.color}
              style={{ fontSize: "22px", fontWeight: 700, fill: "currentColor" }}
            >
              {score.puntaje}
            </text>
            <text
              x={60} y={74}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: "9px", fill: "#94a3b8" }}
            >
              / 100
            </text>
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
            Salud del Proyecto
          </p>
          <p className={`text-3xl font-bold ${score.color}`}>{score.nivel}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Basado en {indicadores.filter((i) => i.estado !== "gris").length} indicadores activos
          </p>
          {/* Mini-leyenda */}
          <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start flex-wrap">
            {conteo.verde > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {conteo.verde} OK
              </span>
            )}
            {conteo.amarillo > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                {conteo.amarillo} Alerta
              </span>
            )}
            {conteo.rojo > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                {conteo.rojo} Crítico
              </span>
            )}
            {conteo.gris > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                {conteo.gris} Sin datos
              </span>
            )}
          </div>
        </div>

        {/* Barra de estado horizontal */}
        <div className="hidden lg:flex flex-col gap-1 flex-shrink-0 w-36">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Distribución</p>
          <div className="flex h-3 rounded-full overflow-hidden w-full">
            {conteo.verde > 0 && (
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(conteo.verde / indicadores.length) * 100}%` }}
              />
            )}
            {conteo.amarillo > 0 && (
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(conteo.amarillo / indicadores.length) * 100}%` }}
              />
            )}
            {conteo.rojo > 0 && (
              <div
                className="bg-red-500 h-full"
                style={{ width: `${(conteo.rojo / indicadores.length) * 100}%` }}
              />
            )}
            {conteo.gris > 0 && (
              <div
                className="bg-slate-300 dark:bg-slate-600 h-full"
                style={{ width: `${(conteo.gris / indicadores.length) * 100}%` }}
              />
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {indicadores.length} indicadores totales
          </p>
        </div>
      </div>

      {/* ── Grid de indicadores ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {indicadores.map((ind) => {
          const c = COLORES[ind.estado];
          return (
            <div
              key={ind.id}
              className={`rounded-xl ring-1 ${c.ring} ${c.bg} p-4 flex flex-col gap-2`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{ind.icono}</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    {ind.titulo}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.labelColor}`}>
                  {c.label}
                </span>
              </div>

              {/* Dot indicator */}
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot} shadow-sm`} />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {ind.valor}
                </span>
              </div>

              {/* Detalle */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                {ind.detalle}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Nota al pie ───────────────────────────────────── */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Score calculado sobre datos del proyecto en tiempo real. Actualizado al cargar esta pantalla.
      </p>
    </div>
  );
}
