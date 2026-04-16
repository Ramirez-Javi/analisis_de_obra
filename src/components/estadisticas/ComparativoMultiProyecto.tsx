"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";
import type { DashboardProyectoData } from "@/app/estadisticas/actions";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtGs(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}
function truncar(s: string, max = 18): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// Paleta de colores para proyectos (cíclica)
const PALETTE = [
  "#4f46e5", // indigo
  "#0891b2", // cyan
  "#16a34a", // green
  "#d97706", // amber
  "#9333ea", // purple
  "#e11d48", // rose
  "#0284c7", // sky
  "#ca8a04", // yellow
];

function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length];
}

// ─────────────────────────────────────────────────────────────
// MÉTRICAS POR PROYECTO
// ─────────────────────────────────────────────────────────────

type EstadoSemaforo = "verde" | "amarillo" | "rojo";

interface MetricasProyecto {
  proyectoId: string;
  nombre: string;
  nombreCorto: string;
  codigo: string;
  estado: string;
  color: string;
  // Avance
  avancePct: number;
  // Presupuesto
  presupuestoTotal: number;
  gastoReal: number;
  pctGasto: number;
  saldoDisponible: number;
  // Tiempo
  diasTranscurridos: number | null;
  diasPlanificados: number | null;
  pctTiempo: number | null;
  diasRestantes: number | null;
  // Performance
  cpi: number;        // 0 si sin datos
  spi: number;        // 0 si sin datos
  scoreGeneral: number; // 0-100
  // Semáforos
  semaforoAvance: EstadoSemaforo;
  semaforoCosto: EstadoSemaforo;
  semaforoCaja: EstadoSemaforo;
}

function calcularMetricas(
  d: DashboardProyectoData,
  idx: number,
): MetricasProyecto {
  const { kpi } = d;
  const pctGasto =
    kpi.presupuestoTotal > 0
      ? (kpi.gastoReal / kpi.presupuestoTotal) * 100
      : 0;
  const pctTiempo =
    kpi.diasPlanificados && kpi.diasTranscurridos !== null
      ? Math.min((kpi.diasTranscurridos / kpi.diasPlanificados) * 100, 100)
      : null;
  const diasRestantes =
    kpi.diasPlanificados && kpi.diasTranscurridos !== null
      ? Math.max(kpi.diasPlanificados - kpi.diasTranscurridos, 0)
      : null;

  const avancePctNum = kpi.avancePct / 100;
  const EV = kpi.presupuestoTotal * avancePctNum;
  const cpi = kpi.gastoReal > 0 ? EV / kpi.gastoReal : 1;
  const pctTiempoFrac = pctTiempo !== null ? pctTiempo / 100 : avancePctNum;
  const PV = kpi.presupuestoTotal * pctTiempoFrac;
  const spi = PV > 0 ? EV / PV : 1;

  // Semáforos
  const deltaAvanceTiempo =
    pctTiempo !== null ? kpi.avancePct - pctTiempo : 0;
  const semaforoAvance: EstadoSemaforo =
    deltaAvanceTiempo >= -5 ? "verde" : deltaAvanceTiempo >= -15 ? "amarillo" : "rojo";

  const semaforoCosto: EstadoSemaforo =
    pctGasto <= 90 ? "verde" : pctGasto <= 100 ? "amarillo" : "rojo";

  const semaforoCaja: EstadoSemaforo =
    kpi.saldoDisponible > 0
      ? "verde"
      : kpi.saldoDisponible === 0
        ? "amarillo"
        : "rojo";

  // Score 0-100
  const pesos = { verde: 100, amarillo: 50, rojo: 0 };
  const scoreGeneral = Math.round(
    (pesos[semaforoAvance] + pesos[semaforoCosto] + pesos[semaforoCaja]) / 3,
  );

  return {
    proyectoId: d.proyectoId,
    nombre: kpi.nombreProyecto,
    nombreCorto: truncar(kpi.nombreProyecto, 18),
    codigo: kpi.codigoProyecto,
    estado: kpi.estado,
    color: colorForIndex(idx),
    avancePct: kpi.avancePct,
    presupuestoTotal: kpi.presupuestoTotal,
    gastoReal: kpi.gastoReal,
    pctGasto,
    saldoDisponible: kpi.saldoDisponible,
    diasTranscurridos: kpi.diasTranscurridos,
    diasPlanificados: kpi.diasPlanificados,
    pctTiempo,
    diasRestantes,
    cpi,
    spi,
    scoreGeneral,
    semaforoAvance,
    semaforoCosto,
    semaforoCaja,
  };
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────

const SEMAFORO_DOT: Record<EstadoSemaforo, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
};

function SemaforoDot({ estado }: { estado: EstadoSemaforo }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${SEMAFORO_DOT[estado]}`}
    />
  );
}

function RankBadge({ pos }: { pos: number }) {
  const styles =
    pos === 1
      ? "bg-amber-400 text-amber-900"
      : pos === 2
        ? "bg-slate-300 text-slate-700"
        : pos === 3
          ? "bg-amber-700/60 text-amber-100"
          : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${styles}`}
    >
      {pos}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP BARRAS
// ─────────────────────────────────────────────────────────────

function TooltipBarra({
  active,
  payload,
  sufijo = "%",
}: {
  active?: boolean;
  payload?: { value: number; payload: MetricasProyecto }[];
  label?: string;
  sufijo?: string;
}) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{m.nombre}</p>
      <p className="font-mono text-slate-800 dark:text-slate-100">
        {payload[0].value.toFixed(1)}{sufijo}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

type Vista = "tabla" | "barras" | "radar";

export function ComparativoMultiProyecto({
  datos,
}: {
  datos: DashboardProyectoData[];
}) {
  const [vista, setVista] = useState<Vista>("tabla");

  const metricas = useMemo(
    () => datos.map((d, i) => calcularMetricas(d, i)),
    [datos],
  );

  // Ranking por score general (desc)
  const ranking = useMemo(
    () => [...metricas].sort((a, b) => b.scoreGeneral - a.scoreGeneral),
    [metricas],
  );

  // Datos para radar
  const radarData = useMemo(() => {
    const dims = [
      { key: "avancePct", label: "Avance %", max: 100 },
      { key: "cpi", label: "CPI", max: 1.5 },
      { key: "spi", label: "SPI", max: 1.5 },
      {
        key: "saldoPct",
        label: "Saldo caja %",
        max: 100,
        getValue: (m: MetricasProyecto) =>
          m.presupuestoTotal > 0
            ? Math.max(0, (m.saldoDisponible / m.presupuestoTotal) * 100)
            : 0,
      },
      {
        key: "invPctGasto",
        label: "Eficiencia costo",
        max: 100,
        getValue: (m: MetricasProyecto) =>
          Math.max(0, 100 - m.pctGasto),
      },
    ];

    return dims.map((dim) => {
      const entry: Record<string, number | string> = { dim: dim.label };
      for (const m of metricas) {
        const raw =
          "getValue" in dim && dim.getValue
            ? dim.getValue(m)
            : (m[dim.key as keyof MetricasProyecto] as number) ?? 0;
        // Normalizar a 0-100
        entry[m.proyectoId] = Math.min(
          100,
          Math.round((raw / dim.max) * 100),
        );
      }
      return entry;
    });
  }, [metricas]);

  if (datos.length < 2) return null;

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-900/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Comparativo Multi-Proyecto
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {datos.length} proyectos cargados — ranking de performance
          </p>
        </div>
        {/* Toggle vista */}
        <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-xs">
          {(["tabla", "barras", "radar"] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                vista === v
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {v === "tabla" ? "Tabla" : v === "barras" ? "Barras" : "Radar"}
            </button>
          ))}
        </div>
      </div>

      {/* ── VISTA TABLA ──────────────────────────────────── */}
      {vista === "tabla" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/60">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400">
                <th className="text-left px-3 py-2.5 font-semibold w-6">#</th>
                <th className="text-left px-3 py-2.5 font-semibold">Proyecto</th>
                <th className="text-right px-3 py-2.5 font-semibold">Avance</th>
                <th className="text-right px-3 py-2.5 font-semibold">% Tiempo</th>
                <th className="text-right px-3 py-2.5 font-semibold">% Gasto</th>
                <th className="text-right px-3 py-2.5 font-semibold">Saldo caja</th>
                <th className="text-right px-3 py-2.5 font-semibold">Días rest.</th>
                <th className="text-right px-3 py-2.5 font-semibold">CPI</th>
                <th className="text-right px-3 py-2.5 font-semibold">SPI</th>
                <th className="text-center px-3 py-2.5 font-semibold">Semáforo</th>
                <th className="text-right px-3 py-2.5 font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((m, idx) => (
                <tr
                  key={m.proyectoId}
                  className="border-b last:border-0 border-slate-100 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Posición */}
                  <td className="px-3 py-2.5">
                    <RankBadge pos={idx + 1} />
                  </td>

                  {/* Nombre */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: m.color }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
                          {m.nombre}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 font-mono">
                          {m.codigo}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Avance */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {m.avancePct.toFixed(1)}%
                      </span>
                      {/* Mini barra */}
                      <div className="w-14 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${m.avancePct}%`,
                            background: m.color,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* % Tiempo */}
                  <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300 font-mono">
                    {m.pctTiempo !== null ? `${m.pctTiempo.toFixed(0)}%` : "—"}
                  </td>

                  {/* % Gasto */}
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span
                      className={
                        m.pctGasto > 100
                          ? "text-red-600 dark:text-red-400 font-bold"
                          : m.pctGasto > 90
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-600 dark:text-slate-300"
                      }
                    >
                      {m.pctGasto.toFixed(1)}%
                    </span>
                  </td>

                  {/* Saldo */}
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span
                      className={
                        m.saldoDisponible < 0
                          ? "text-red-600 dark:text-red-400 font-bold"
                          : m.saldoDisponible === 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      Gs {fmtGs(m.saldoDisponible)}
                    </span>
                  </td>

                  {/* Días restantes */}
                  <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                    {m.diasRestantes !== null ? `${m.diasRestantes}d` : "—"}
                  </td>

                  {/* CPI */}
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span
                      className={
                        m.cpi >= 0.95
                          ? "text-emerald-600 dark:text-emerald-400"
                          : m.cpi >= 0.80
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400 font-bold"
                      }
                    >
                      {m.cpi.toFixed(2)}
                    </span>
                  </td>

                  {/* SPI */}
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span
                      className={
                        m.spi >= 0.95
                          ? "text-emerald-600 dark:text-emerald-400"
                          : m.spi >= 0.80
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400 font-bold"
                      }
                    >
                      {m.spi.toFixed(2)}
                    </span>
                  </td>

                  {/* Semáforo 3 indicadores */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <SemaforoDot estado={m.semaforoAvance} />
                      <SemaforoDot estado={m.semaforoCosto} />
                      <SemaforoDot estado={m.semaforoCaja} />
                    </div>
                  </td>

                  {/* Score */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`font-black text-sm ${
                        m.scoreGeneral >= 85
                          ? "text-emerald-600 dark:text-emerald-400"
                          : m.scoreGeneral >= 60
                            ? "text-blue-600 dark:text-blue-400"
                            : m.scoreGeneral >= 35
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {m.scoreGeneral}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VISTA BARRAS ─────────────────────────────────── */}
      {vista === "barras" && (
        <div className="space-y-4">
          {/* Avance % */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Avance de obra (%)
            </p>
            <ResponsiveContainer width="100%" height={Math.max(60, ranking.length * 42)}>
              <BarChart
                data={ranking}
                layout="vertical"
                margin={{ top: 0, right: 60, bottom: 0, left: 10 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-700"
                />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="nombreCorto" tick={{ fontSize: 11, fill: "#94a3b8" }} width={100} />
                <Tooltip content={<TooltipBarra sufijo="%" />} />
                <Bar dataKey="avancePct" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {ranking.map((m) => (
                    <Cell key={m.proyectoId} fill={m.color} fillOpacity={0.85} />
                  ))}
                  <LabelList
                    dataKey="avancePct"
                    position="right"
                    formatter={(v: unknown) => `${(v as number).toFixed(1)}%`}
                    style={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* % Gasto vs presupuesto */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Gasto vs presupuesto (%)
            </p>
            <ResponsiveContainer width="100%" height={Math.max(60, ranking.length * 42)}>
              <BarChart
                data={ranking}
                layout="vertical"
                margin={{ top: 0, right: 60, bottom: 0, left: 10 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-700"
                />
                <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="nombreCorto" tick={{ fontSize: 11, fill: "#94a3b8" }} width={100} />
                <Tooltip content={<TooltipBarra sufijo="%" />} />
                <Bar dataKey="pctGasto" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {ranking.map((m) => (
                    <Cell
                      key={m.proyectoId}
                      fill={
                        m.pctGasto > 100 ? "#ef4444" : m.pctGasto > 90 ? "#f59e0b" : m.color
                      }
                      fillOpacity={0.85}
                    />
                  ))}
                  <LabelList
                    dataKey="pctGasto"
                    position="right"
                    formatter={(v: unknown) => `${(v as number).toFixed(1)}%`}
                    style={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Score general */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Ranking de salud general (0 – 100)
            </p>
            <ResponsiveContainer width="100%" height={Math.max(60, ranking.length * 42)}>
              <BarChart
                data={ranking}
                layout="vertical"
                margin={{ top: 0, right: 60, bottom: 0, left: 10 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-700"
                />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="nombreCorto" tick={{ fontSize: 11, fill: "#94a3b8" }} width={100} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const m = payload[0].payload as MetricasProyecto;
                    const nivel =
                      m.scoreGeneral >= 85
                        ? "Óptimo"
                        : m.scoreGeneral >= 60
                          ? "Estable"
                          : m.scoreGeneral >= 35
                            ? "En Alerta"
                            : "Crítico";
                    return (
                      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-xl px-3 py-2 text-xs">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">{m.nombre}</p>
                        <p className="text-slate-500 dark:text-slate-400">Score: <span className="font-bold text-slate-800 dark:text-slate-100">{m.scoreGeneral}</span> — {nivel}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="scoreGeneral" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {ranking.map((m) => (
                    <Cell
                      key={m.proyectoId}
                      fill={
                        m.scoreGeneral >= 85
                          ? "#10b981"
                          : m.scoreGeneral >= 60
                            ? "#4f46e5"
                            : m.scoreGeneral >= 35
                              ? "#f59e0b"
                              : "#ef4444"
                      }
                      fillOpacity={0.85}
                    />
                  ))}
                  <LabelList
                    dataKey="scoreGeneral"
                    position="right"
                    style={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── VISTA RADAR ──────────────────────────────────── */}
      {vista === "radar" && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
            Perfil de performance multi-dimensión (normalizado 0–100)
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
            Avance · CPI · SPI · Saldo de caja · Eficiencia de costo
          </p>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <PolarAngleAxis
                dataKey="dim"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              {metricas.map((m) => (
                <Radar
                  key={m.proyectoId}
                  name={m.nombreCorto}
                  dataKey={m.proyectoId}
                  stroke={m.color}
                  fill={m.color}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={{ r: 3, fill: m.color }}
                />
              ))}
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) => (
                  <span className="text-slate-600 dark:text-slate-300">{value}</span>
                )}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-xl px-3 py-2 text-xs min-w-[160px]">
                      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                      {payload.map((p) => (
                        <div key={p.name} className="flex justify-between gap-3">
                          <span style={{ color: p.color as string }}>{p.name}</span>
                          <span className="font-mono text-slate-800 dark:text-slate-100">
                            {(p.value as number).toFixed(0)} / 100
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Leyenda de semáforos ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-300">Semáforos:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Avance vs Tiempo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Gasto vs Presupuesto</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Saldo de Caja</span>
      </div>
    </div>
  );
}
