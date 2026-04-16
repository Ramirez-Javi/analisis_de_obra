"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { DashboardProyectoData } from "@/app/estadisticas/actions";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtGsFull(n: number): string {
  return "Gs " + Math.round(n).toLocaleString("es-PY");
}
function fmtGs(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `Gs ${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `Gs ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `Gs ${(n / 1_000).toFixed(0)}K`;
  return `Gs ${Math.round(n)}`;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
function fmtFecha(d: Date): string {
  return d.toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────
// CÁLCULOS EVM + PROYECCIONES
// ─────────────────────────────────────────────────────────────

interface ProyeccionResult {
  // Valores básicos
  BAC: number;           // Budget at Completion (presupuesto original)
  PV: number;            // Planned Value
  EV: number;            // Earned Value
  AC: number;            // Actual Cost
  // Índices
  CPI: number;           // Cost Performance Index
  SPI: number;           // Schedule Performance Index
  // Variaciones
  CV: number;            // Cost Variance (EV - AC)
  SV: number;            // Schedule Variance (EV - PV)
  // Proyección de costo (EAC)
  EAC_cpi: number;       // EAC si continúa con CPI actual
  EAC_opt: number;       // EAC optimista (CPI = 1)
  EAC_pes: number;       // EAC pesimista (CPI * 0.8)
  // Proyección de tiempo
  fechaInicio: Date | null;
  fechaFinPlan: Date | null;
  fechaFinProyectada: Date | null;
  fechaFinOpt: Date | null;
  fechaFinPes: Date | null;
  diasRestantesPlan: number | null;
  diasRestantesProyectado: number | null;
  diasDesviacion: number | null;
  // Estado
  sinFechas: boolean;
  sinAvance: boolean;
}

function calcularProyeccion(data: DashboardProyectoData): ProyeccionResult {
  const { kpi } = data;

  const BAC = kpi.presupuestoTotal;
  const avancePct = kpi.avancePct / 100; // 0-1
  const EV = BAC * avancePct;
  const AC = kpi.gastoReal;

  // Planned Value: basado en % tiempo transcurrido
  const pctTiempo =
    kpi.diasPlanificados && kpi.diasTranscurridos !== null
      ? Math.min(kpi.diasTranscurridos / kpi.diasPlanificados, 1)
      : avancePct; // fallback: usar avance como proxy
  const PV = BAC * pctTiempo;

  const CPI = AC > 0 ? EV / AC : 1;
  const SPI = PV > 0 ? EV / PV : 1;
  const CV = EV - AC;
  const SV = EV - PV;

  // EAC variants
  const EAC_cpi = CPI > 0 ? BAC / CPI : BAC;
  const EAC_opt = BAC; // mejor caso: el resto se ejecuta a presupuesto
  const EAC_pes = CPI > 0 ? BAC / (CPI * 0.85) : BAC * 1.15; // 15% peor

  // Fechas
  let fechaInicio: Date | null = null;
  // Derivar fechaInicio del primer flujo de caja o usando diasTranscurridos
  if (kpi.diasTranscurridos !== null) {
    const hoy = new Date();
    fechaInicio = addDays(hoy, -kpi.diasTranscurridos);
  }

  const fechaFinPlan: Date | null =
    fechaInicio && kpi.diasPlanificados
      ? addDays(fechaInicio, kpi.diasPlanificados)
      : null;

  // Proyección de tiempo basada en SPI
  let fechaFinProyectada: Date | null = null;
  let fechaFinOpt: Date | null = null;
  let fechaFinPes: Date | null = null;
  let diasRestantesPlan: number | null = null;
  let diasRestantesProyectado: number | null = null;
  let diasDesviacion: number | null = null;

  if (fechaInicio && kpi.diasPlanificados && avancePct > 0) {
    const diasTotalesProyectados = kpi.diasPlanificados / Math.max(SPI, 0.1);
    fechaFinProyectada = addDays(fechaInicio, Math.round(diasTotalesProyectados));

    const spiOpt = Math.min(SPI * 1.15, 1.0);
    const spiPes = SPI * 0.85;
    fechaFinOpt = addDays(
      fechaInicio,
      Math.round(kpi.diasPlanificados / Math.max(spiOpt, 0.1)),
    );
    fechaFinPes = addDays(
      fechaInicio,
      Math.round(kpi.diasPlanificados / Math.max(spiPes, 0.1)),
    );

    const hoy = new Date();
    diasRestantesPlan = fechaFinPlan ? diffDays(hoy, fechaFinPlan) : null;
    diasRestantesProyectado = diffDays(hoy, fechaFinProyectada);
    diasDesviacion = fechaFinPlan
      ? diffDays(fechaFinPlan, fechaFinProyectada)
      : null;
  } else if (avancePct === 0 && fechaFinPlan) {
    const hoy = new Date();
    diasRestantesPlan = diffDays(hoy, fechaFinPlan);
  }

  return {
    BAC, PV, EV, AC,
    CPI, SPI, CV, SV,
    EAC_cpi, EAC_opt, EAC_pes,
    fechaInicio,
    fechaFinPlan,
    fechaFinProyectada,
    fechaFinOpt,
    fechaFinPes,
    diasRestantesPlan,
    diasRestantesProyectado,
    diasDesviacion,
    sinFechas: kpi.diasPlanificados === null || kpi.diasTranscurridos === null,
    sinAvance: avancePct === 0,
  };
}

// ─────────────────────────────────────────────────────────────
// DATOS DEL GRÁFICO CONO
// ─────────────────────────────────────────────────────────────

interface PuntoGrafico {
  label: string;       // etiqueta eje X
  real?: number;       // gasto real acumulado
  planificado?: number;// costo planificado acumulado
  central?: number;    // proyección central (EAC_cpi)
  optimo?: number;     // rango optimista
  pesimista?: number;  // rango pesimista
  tipo: "historico" | "proyeccion";
}

function buildGraficoCono(
  data: DashboardProyectoData,
  proy: ProyeccionResult,
): PuntoGrafico[] {
  const { flujoCaja, kpi } = data;
  const { BAC, EAC_cpi, EAC_opt, EAC_pes } = proy;

  const puntos: PuntoGrafico[] = [];

  // ── Histórico: acumular desde el flujo de caja ──────────
  let acumReal = 0;
  let acumPlan = 0;
  const totalMeses = flujoCaja.length;

  flujoCaja.forEach((f, i) => {
    acumReal += f.egresos;
    // Planificado lineal
    if (BAC > 0 && totalMeses > 0) {
      acumPlan = (BAC / totalMeses) * (i + 1);
    }
    puntos.push({
      label: f.mes,
      real: acumReal,
      planificado: acumPlan,
      tipo: "historico",
    });
  });

  // ── Punto de corte: hoy ─────────────────────────────────
  // Agregar punto de unión (valor actual real) para que el cono arranque desde aquí
  const corteLabel = "Hoy";
  puntos.push({
    label: corteLabel,
    real: kpi.gastoReal,
    central: kpi.gastoReal,
    optimo: kpi.gastoReal,
    pesimista: kpi.gastoReal,
    tipo: "proyeccion",
  });

  // ── Proyección: 3 puntos futuros ─────────────────────────
  // Punto medio
  puntos.push({
    label: "50%",
    central: kpi.gastoReal + (EAC_cpi - kpi.gastoReal) * 0.5,
    optimo: kpi.gastoReal + (EAC_opt - kpi.gastoReal) * 0.4,
    pesimista: kpi.gastoReal + (EAC_pes - kpi.gastoReal) * 0.6,
    tipo: "proyeccion",
  });

  // Punto final (cierre)
  puntos.push({
    label: "Cierre",
    central: EAC_cpi,
    optimo: EAC_opt,
    pesimista: EAC_pes,
    planificado: BAC,
    tipo: "proyeccion",
  });

  return puntos;
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-xl px-4 py-3 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 items-center">
          <span style={{ color: p.color }} className="truncate max-w-[100px]">{p.name}</span>
          <span className="font-mono text-slate-800 dark:text-slate-100">{fmtGs(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BADGE ÍNDICE
// ─────────────────────────────────────────────────────────────

function IndexBadge({
  label,
  value,
  good,
  warn,
  fmt,
  desc,
}: {
  label: string;
  value: number;
  good: (v: number) => boolean;
  warn: (v: number) => boolean;
  fmt: (v: number) => string;
  desc: string;
}) {
  const color = good(value)
    ? "text-emerald-600 dark:text-emerald-400 ring-emerald-400/30 bg-emerald-50 dark:bg-emerald-900/10"
    : warn(value)
      ? "text-amber-600 dark:text-amber-400 ring-amber-400/30 bg-amber-50 dark:bg-amber-900/10"
      : "text-red-600 dark:text-red-400 ring-red-400/30 bg-red-50 dark:bg-red-900/10";

  return (
    <div className={`rounded-xl ring-1 p-4 flex flex-col gap-1 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-black">{fmt(value)}</p>
      <p className="text-xs opacity-70 leading-snug">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function GraficoProyeccionCierre({ data }: { data: DashboardProyectoData }) {
  const proy = useMemo(() => calcularProyeccion(data), [data]);
  const grafData = useMemo(() => buildGraficoCono(data, proy), [data, proy]);

  const variacionCosto = proy.EAC_cpi - proy.BAC;
  const varCostoPct = proy.BAC > 0 ? (variacionCosto / proy.BAC) * 100 : 0;

  // ── Sin datos suficientes ──────────────────────────────────
  if (proy.BAC === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-sm">
        Sin presupuesto cargado para proyectar el cierre.
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── KPIs EVM de un vistazo ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndexBadge
          label="CPI"
          value={proy.CPI}
          good={(v) => v >= 0.95}
          warn={(v) => v >= 0.80}
          fmt={(v) => v.toFixed(2)}
          desc={
            proy.CPI >= 1
              ? "Debajo del presupuesto"
              : proy.CPI >= 0.95
                ? "Leve desviación de costo"
                : proy.CPI >= 0.80
                  ? "Costo por encima del plan"
                  : "Sobrecosto significativo"
          }
        />
        <IndexBadge
          label="SPI"
          value={proy.SPI}
          good={(v) => v >= 0.95}
          warn={(v) => v >= 0.80}
          fmt={(v) => v.toFixed(2)}
          desc={
            proy.SPI >= 1
              ? "Adelantado respecto al plan"
              : proy.SPI >= 0.95
                ? "Leve retraso"
                : proy.SPI >= 0.80
                  ? "Retraso moderado"
                  : "Retraso crítico"
          }
        />
        <IndexBadge
          label="CV"
          value={proy.CV}
          good={(v) => v >= 0}
          warn={(v) => v >= -proy.BAC * 0.05}
          fmt={fmtGs}
          desc={proy.CV >= 0 ? "Valor ganado supera costo real" : "Costo real supera valor ganado"}
        />
        <IndexBadge
          label="SV"
          value={proy.SV}
          good={(v) => v >= 0}
          warn={(v) => v >= -proy.BAC * 0.05}
          fmt={fmtGs}
          desc={proy.SV >= 0 ? "Adelantado en valor planificado" : "Detrás del plan de avance"}
        />
      </div>

      {/* ── Proyecciones de fecha y costo ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Fecha de cierre */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Proyección de Fecha de Cierre
          </p>

          {proy.sinFechas ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Sin fecha de inicio o duración planificada configurada.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Planificada */}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  Planificada
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {proy.fechaFinPlan ? fmtFecha(proy.fechaFinPlan) : "—"}
                </span>
              </div>

              {/* Optimista */}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Optimista
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {proy.fechaFinOpt ? fmtFecha(proy.fechaFinOpt) : "—"}
                </span>
              </div>

              {/* Proyectada (central) */}
              <div className="flex items-center justify-between text-sm border-t dark:border-white/[0.04] pt-2">
                <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  Proyectada (SPI actual)
                </span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  {proy.fechaFinProyectada ? fmtFecha(proy.fechaFinProyectada) : "—"}
                </span>
              </div>

              {/* Pesimista */}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-red-500 dark:text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Pesimista
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {proy.fechaFinPes ? fmtFecha(proy.fechaFinPes) : "—"}
                </span>
              </div>

              {/* Desviación */}
              {proy.diasDesviacion !== null && (
                <div
                  className={`mt-2 pt-2 border-t dark:border-white/[0.04] text-xs font-medium ${
                    proy.diasDesviacion <= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : proy.diasDesviacion <= 14
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {proy.diasDesviacion === 0
                    ? "Sin desviación — cierre en fecha"
                    : proy.diasDesviacion < 0
                      ? `Cierre ${Math.abs(proy.diasDesviacion)} días antes de lo planificado`
                      : `Cierre proyectado con ${proy.diasDesviacion} días de retraso`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Costo final (EAC) */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Proyección de Costo Final (EAC)
          </p>
          <div className="space-y-2">
            {/* BAC */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                Presupuesto original (BAC)
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono">
                {fmtGsFull(proy.BAC)}
              </span>
            </div>

            {/* Optimista */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Optimista (igual presupuesto)
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
                {fmtGsFull(proy.EAC_opt)}
              </span>
            </div>

            {/* EAC central */}
            <div className="flex items-center justify-between text-sm border-t dark:border-white/[0.04] pt-2">
              <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                Proyectado (CPI actual)
              </span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                {fmtGsFull(proy.EAC_cpi)}
              </span>
            </div>

            {/* Pesimista */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-red-500 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Pesimista (CPI −15%)
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400 font-mono">
                {fmtGsFull(proy.EAC_pes)}
              </span>
            </div>

            {/* Variación */}
            <div
              className={`mt-2 pt-2 border-t dark:border-white/[0.04] text-xs font-medium ${
                variacionCosto <= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : varCostoPct <= 5
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {variacionCosto === 0
                ? "Sin variación de costo proyectada"
                : variacionCosto < 0
                  ? `Ahorro proyectado de ${fmtGs(Math.abs(variacionCosto))} (${Math.abs(varCostoPct).toFixed(1)}%)`
                  : `Sobrecosto proyectado: ${fmtGs(variacionCosto)} (+${varCostoPct.toFixed(1)}%)`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico Cono de Incertidumbre ─────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
          Cono de Incertidumbre — Costo Final Proyectado
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Histórico real + proyección con rango optimista / pesimista desde la fecha actual
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={grafData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis
              tickFormatter={(v) => fmtGs(v)}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: 8, fontSize: 11 }}
            />

            {/* Línea de referencia: BAC */}
            <ReferenceLine
              y={proy.BAC}
              stroke="#64748b"
              strokeDasharray="8 4"
              strokeWidth={1.5}
              label={{
                value: `BAC ${fmtGs(proy.BAC)}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "#64748b",
              }}
            />

            {/* Área del cono (rango pesimista — optimista) */}
            <Area
              type="monotone"
              dataKey="pesimista"
              name="Pesimista"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="#fca5a5"
              fillOpacity={0.15}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Area
              type="monotone"
              dataKey="optimo"
              name="Optimista"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="#6ee7b7"
              fillOpacity={0.2}
              dot={false}
              activeDot={{ r: 3 }}
            />

            {/* Costo planificado lineal */}
            <Line
              type="monotone"
              dataKey="planificado"
              name="Planificado"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
            />

            {/* Costo real histórico */}
            <Line
              type="monotone"
              dataKey="real"
              name="Real"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#4f46e5" }}
              activeDot={{ r: 5 }}
            />

            {/* Proyección central */}
            <Line
              type="monotone"
              dataKey="central"
              name="Proyectado (EAC)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: "#f59e0b" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Nota metodológica ─────────────────────────────── */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        EVM (Earned Value Management) — CPI = EV/AC · SPI = EV/PV · EAC = BAC/CPI.
        Proyección de tiempo basada en ritmo actual de avance (SPI).
      </p>
    </div>
  );
}
