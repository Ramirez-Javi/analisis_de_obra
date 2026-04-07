"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp, Save, Check } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RubroCronograma {
  id: string;
  nombre: string;
  total: number;
  fechaInicio: string; // YYYY-MM-DD
  duracion: number;    // días
  avanceReal: number;  // 0–100
}

interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatGs(n: number) {
  return new Intl.NumberFormat("es-PY").format(Math.round(n)) + " Gs";
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function dayOffset(base: string, target: string): number {
  const a = new Date(base + "T00:00:00").getTime();
  const b = new Date(target + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

// ─── Mock builder ─────────────────────────────────────────────────────────────

function buildMocks(today: string): RubroCronograma[] {
  return [
    {
      id: "r1",
      nombre: "Excavación",
      total: 5_000_000,
      fechaInicio: today,
      duracion: 5,
      avanceReal: 100,
    },
    {
      id: "r2",
      nombre: "Cimiento PBC",
      total: 15_000_000,
      fechaInicio: addDaysToStr(today, 5),
      duracion: 10,
      avanceReal: 50,
    },
    {
      id: "r3",
      nombre: "Mampostería",
      total: 25_000_000,
      fechaInicio: addDaysToStr(today, 15),
      duracion: 15,
      avanceReal: 0,
    },
  ];
}

// ─── Bar colors ───────────────────────────────────────────────────────────────

const BAR_COLORS = [
  {
    track: "dark:bg-teal-500/25 bg-teal-100 border dark:border-teal-500/30 border-teal-300",
    fill: "dark:bg-teal-400 bg-teal-500",
    label: "dark:text-teal-400 text-teal-700",
  },
  {
    track: "dark:bg-blue-500/25 bg-blue-100 border dark:border-blue-500/30 border-blue-300",
    fill: "dark:bg-blue-400 bg-blue-500",
    label: "dark:text-blue-400 text-blue-700",
  },
  {
    track: "dark:bg-violet-500/25 bg-violet-100 border dark:border-violet-500/30 border-violet-300",
    fill: "dark:bg-violet-400 bg-violet-500",
    label: "dark:text-violet-400 text-violet-700",
  },
];

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "gantt" | "curvaS";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  proyecto: Proyecto;
  backHref: string;
  today: string; // YYYY-MM-DD from server to avoid hydration mismatch
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CronogramaClient({ proyecto, backHref, today }: Props) {
  const STORAGE_KEY = `cronograma_${proyecto.id}`;

  const [activeTab, setActiveTab] = useState<Tab>("gantt");
  const [rubros, setRubros] = useState<RubroCronograma[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`cronograma_${proyecto.id}`);
        if (raw) return JSON.parse(raw) as RubroCronograma[];
      }
    } catch {}
    return buildMocks(today);
  });

  const [savedKey, setSavedKey] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`cronograma_${proyecto.id}`);
        if (raw) return raw;
      }
    } catch {}
    return JSON.stringify(buildMocks(today));
  });

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // ── Derived: project span ────────────────────────────────────────────────
  const { projectStart, totalDays } = useMemo(() => {
    const starts = rubros.map((r) => r.fechaInicio);
    const ends = rubros.map((r) => addDaysToStr(r.fechaInicio, r.duracion));
    const ps = [...starts].sort()[0];
    const pe = [...ends].sort().at(-1)!;
    return { projectStart: ps, totalDays: Math.max(dayOffset(ps, pe), 1) };
  }, [rubros]);

  // ── Derived: Gantt day markers ───────────────────────────────────────────
  const ganttMarkers = useMemo(() => {
    const step = Math.max(5, Math.floor(totalDays / 6));
    const marks: number[] = [0];
    for (let d = step; d < totalDays; d += step) marks.push(d);
    if (marks.at(-1) !== totalDays) marks.push(totalDays);
    return marks;
  }, [totalDays]);

  // ── Derived: Curva S chart data ───────────────────────────────────────────
  const chartData = useMemo(() => {
    const totalCost = rubros.reduce((s, r) => s + r.total, 0);
    if (totalCost === 0) return [];

    // Checkpoints: up to 7 evenly-spaced points
    const step = Math.max(1, Math.floor(totalDays / 6));
    const checkpoints: number[] = [];
    for (let d = 0; d <= totalDays; d += step) checkpoints.push(d);
    if (checkpoints.at(-1) !== totalDays) checkpoints.push(totalDays);

    return checkpoints.map((day) => {
      let planned = 0;
      let real = 0;

      for (const r of rubros) {
        const start = dayOffset(projectStart, r.fechaInicio);
        const end = start + r.duracion;

        // Planned: linear within scheduled window
        const planProg =
          day <= start ? 0 : day >= end ? 1 : (day - start) / r.duracion;
        planned += planProg * r.total;

        // Real: linear within the certified portion
        // If avanceReal=50% and duracion=10 days, the certified work fills days 0-5 of the rubro
        const certEnd = start + r.duracion * (r.avanceReal / 100);
        const realProg =
          day <= start
            ? 0
            : r.avanceReal === 0
            ? 0
            : day >= certEnd
            ? r.avanceReal / 100
            : (day - start) / r.duracion;
        real += realProg * r.total;
      }

      return {
        name: `Día ${day}`,
        "Planificado %": Math.round((planned / totalCost) * 1000) / 10,
        "Real %": Math.round((real / totalCost) * 1000) / 10,
      };
    });
  }, [rubros, projectStart, totalDays]);

  // ── Persistencia ─────────────────────────────────────────────────────────
  const rubrosSerialized = useMemo(() => JSON.stringify(rubros), [rubros]);
  const isDirty = rubrosSerialized !== savedKey;

  function handleSave() {
    setSaveState("saving");
    try {
      localStorage.setItem(STORAGE_KEY, rubrosSerialized);
      setSavedKey(rubrosSerialized);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("idle");
    }
  }

  // ── Updater ───────────────────────────────────────────────────────────────
  function updateRubro<K extends keyof RubroCronograma>(
    id: string,
    key: K,
    value: RubroCronograma[K]
  ) {
    setRubros((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  const totalCost = rubros.reduce((s, r) => s + r.total, 0);
  const totalCertificado = rubros.reduce(
    (s, r) => s + r.total * (r.avanceReal / 100),
    0
  );

  // ── Input classes ──────────────────────────────────────────────────────────
  const inputCls =
    "px-2.5 py-1.5 rounded-lg text-xs border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800 bg-white dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40";

  // ── Tab button classes ────────────────────────────────────────────────────
  function tabCls(tab: Tab) {
    const active = activeTab === tab;
    return `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
      active
        ? "dark:bg-teal-500/20 bg-white dark:text-teal-400 text-teal-700 shadow-sm"
        : "dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700"
    }`;
  }

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50">
      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <div className="sticky top-[52px] z-30 dark:bg-slate-950/95 bg-white/95 backdrop-blur-md border-b dark:border-white/[0.06] border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 dark:text-slate-400 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-base font-bold dark:text-slate-100 text-slate-900 leading-tight">
                Cronograma y Avances
              </h1>
              <p className="text-xs dark:text-slate-500 text-slate-400">
                {proyecto.codigo} · {proyecto.nombre}
              </p>
            </div>
          </div>

          {/* Right: save + tabs */}
          <div className="flex items-center gap-2">
            {/* Botón Guardar */}
            <button
              onClick={handleSave}
              disabled={saveState === "saving" || (saveState !== "saved" && !isDirty)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                saveState === "saved"
                  ? "dark:bg-teal-500/20 bg-teal-50 dark:text-teal-400 text-teal-600 border dark:border-teal-500/20 border-teal-200"
                  : isDirty
                  ? "dark:bg-amber-500/15 bg-amber-50 dark:text-amber-400 text-amber-600 border dark:border-amber-500/20 border-amber-200 dark:hover:bg-amber-500/25 hover:bg-amber-100"
                  : "dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400 border dark:border-white/[0.06] border-slate-200 cursor-default"
              }`}
            >
              {saveState === "saved" ? (
                <><Check className="w-3 h-3" aria-hidden />Guardado</>
              ) : isDirty ? (
                <><Save className="w-3 h-3" aria-hidden />Guardar cambios</>
              ) : (
                <><Save className="w-3 h-3" aria-hidden />Sin cambios</>
              )}
            </button>
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg dark:bg-slate-800/60 bg-slate-100">
              <button onClick={() => setActiveTab("gantt")} className={tabCls("gantt")}>
                <Calendar className="w-3.5 h-3.5" />
                Planificación (Gantt)
              </button>
              <button onClick={() => setActiveTab("curvaS")} className={tabCls("curvaS")}>
                <TrendingUp className="w-3.5 h-3.5" />
                Control (Curva S)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ════════════════════════════════════════════════════════════════
            VISTA 1 — PLANIFICACIÓN (GANTT)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === "gantt" && (
          <div className="space-y-5">
            {/* ── Planning table ─────────────────────────────────────────── */}
            <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/50 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b dark:border-white/[0.06] border-slate-100">
                <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                  Datos de Planificación
                </h2>
                <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                  Ajustá las fechas y duraciones para actualizar el Gantt
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="dark:bg-slate-800/40 bg-slate-50 text-xs dark:text-slate-400 text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Rubro</th>
                      <th className="text-right px-5 py-3">Costo Total</th>
                      <th className="text-center px-5 py-3">Fecha de Inicio</th>
                      <th className="text-center px-5 py-3">Duración (días)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                    {rubros.map((r) => (
                      <tr
                        key={r.id}
                        className="dark:hover:bg-slate-800/30 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium dark:text-slate-200 text-slate-800">
                          {r.nombre}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs dark:text-slate-400 text-slate-500 whitespace-nowrap">
                          {formatGs(r.total)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <input
                            type="date"
                            value={r.fechaInicio}
                            onChange={(e) =>
                              updateRubro(r.id, "fechaInicio", e.target.value)
                            }
                            className={inputCls}
                          />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={r.duracion}
                            onChange={(e) =>
                              updateRubro(
                                r.id,
                                "duracion",
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className={`${inputCls} w-20 text-center`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Gantt visual ────────────────────────────────────────────── */}
            <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/50 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b dark:border-white/[0.06] border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                    Diagrama de Gantt
                  </h2>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                    Duración total del proyecto:{" "}
                    <span className="font-semibold dark:text-slate-300 text-slate-600">
                      {totalDays} días
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs dark:text-slate-500 text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-2 rounded-full dark:bg-slate-600 bg-slate-300" />
                    Programado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-2 rounded-full bg-teal-500" />
                    Avance real
                  </span>
                </div>
              </div>

              <div className="p-5 overflow-x-auto">
                <div className="flex gap-4" style={{ minWidth: "640px" }}>
                  {/* Left column: rubro names */}
                  <div className="w-32 shrink-0">
                    {/* Header spacer aligns with day-markers row */}
                    <div className="h-7" />
                    {rubros.map((r, i) => (
                      <div
                        key={r.id}
                        className="h-10 mb-2 flex items-center"
                      >
                        <span
                          className={`text-xs font-semibold truncate ${BAR_COLORS[i % BAR_COLORS.length].label}`}
                        >
                          {r.nombre}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Right area: day markers + bars */}
                  <div className="flex-1 min-w-0">
                    {/* Day markers */}
                    <div className="relative h-7 mb-0">
                      {ganttMarkers.map((day) => (
                        <span
                          key={day}
                          className="absolute top-0 text-[10px] dark:text-slate-500 text-slate-400 -translate-x-1/2 whitespace-nowrap"
                          style={{ left: `${(day / totalDays) * 100}%` }}
                        >
                          {day === 0 ? "Inicio" : `D${day}`}
                        </span>
                      ))}
                    </div>

                    {/* Bars + grid */}
                    <div className="relative">
                      {/* Vertical gridlines */}
                      {ganttMarkers.map((day) => (
                        <div
                          key={day}
                          className="absolute top-0 bottom-0 w-px dark:bg-white/[0.05] bg-slate-200"
                          style={{ left: `${(day / totalDays) * 100}%` }}
                        />
                      ))}

                      {rubros.map((r, i) => {
                        const start = dayOffset(projectStart, r.fechaInicio);
                        const leftPct = Math.max(0, (start / totalDays) * 100);
                        const widthPct = Math.max(
                          1,
                          (r.duracion / totalDays) * 100
                        );
                        const c = BAR_COLORS[i % BAR_COLORS.length];

                        return (
                          <div key={r.id} className="relative h-10 mb-2">
                            {/* Track (planned) */}
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-lg overflow-hidden ${c.track}`}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                            >
                              {/* Progress fill (real) */}
                              <div
                                className={`h-full ${c.fill} transition-all duration-500`}
                                style={{ width: `${r.avanceReal}%` }}
                              />
                            </div>

                            {/* % label */}
                            <span
                              className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/90 pointer-events-none pl-2 whitespace-nowrap z-10 drop-shadow"
                              style={{ left: `${leftPct}%` }}
                            >
                              {r.avanceReal}%
                            </span>

                            {/* Duration label (right side of bar) */}
                            <span
                              className="absolute top-1/2 -translate-y-1/2 text-[10px] dark:text-slate-500 text-slate-400 pl-1 whitespace-nowrap"
                              style={{ left: `${leftPct + widthPct + 0.5}%` }}
                            >
                              {r.duracion}d
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VISTA 2 — CONTROL Y CURVA S
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === "curvaS" && (
          <div className="space-y-5">
            {/* ── Curva S chart ───────────────────────────────────────────── */}
            <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/50 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b dark:border-white/[0.06] border-slate-100">
                <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                  Curva S — Avance Acumulado
                </h2>
                <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                  El gráfico se actualiza al modificar los porcentajes en la tabla inferior
                </p>
              </div>
              <div className="p-5" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 24, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.12)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        color: "#e2e8f0",
                      }}
                      formatter={(value) => [`${value}%`]}
                      cursor={{ stroke: "rgba(148,163,184,0.2)" }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Planificado %"
                      stroke="#14b8a6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#14b8a6", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Real %"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Carga de avances table ──────────────────────────────────── */}
            <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/50 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b dark:border-white/[0.06] border-slate-100 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                    Carga de Avances
                  </h2>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                    Ingresá el avance real de cada rubro para calcular el monto a certificar
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wide dark:text-slate-500 text-slate-400">
                    Total certificado
                  </p>
                  <p className="text-lg font-bold font-mono dark:text-teal-400 text-teal-600">
                    {formatGs(totalCertificado)}
                  </p>
                  <p className="text-xs dark:text-slate-500 text-slate-400">
                    {totalCost > 0
                      ? ((totalCertificado / totalCost) * 100).toFixed(1)
                      : "0"}
                    % del presupuesto
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="dark:bg-slate-800/40 bg-slate-50 text-xs dark:text-slate-400 text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Rubro</th>
                      <th className="text-right px-5 py-3">Presupuesto</th>
                      <th className="text-center px-5 py-3 w-44">
                        Avance Real %
                      </th>
                      <th className="text-right px-5 py-3">
                        Monto a Certificar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                    {rubros.map((r) => {
                      const montoCert = r.total * (r.avanceReal / 100);
                      return (
                        <tr
                          key={r.id}
                          className="dark:hover:bg-slate-800/30 hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Rubro name */}
                          <td className="px-5 py-4 font-medium dark:text-slate-200 text-slate-800">
                            {r.nombre}
                          </td>

                          {/* Presupuesto */}
                          <td className="px-5 py-4 text-right font-mono text-xs dark:text-slate-400 text-slate-500 whitespace-nowrap">
                            {formatGs(r.total)}
                          </td>

                          {/* Avance input + mini progress bar */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 justify-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={r.avanceReal}
                                onChange={(e) =>
                                  updateRubro(
                                    r.id,
                                    "avanceReal",
                                    Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        parseInt(e.target.value) || 0
                                      )
                                    )
                                  )
                                }
                                className={`${inputCls} w-20 text-center`}
                              />
                              <span className="text-xs dark:text-slate-500 text-slate-400">
                                %
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2 h-1.5 rounded-full dark:bg-slate-700 bg-slate-200 overflow-hidden mx-auto max-w-[120px]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  r.avanceReal >= 100
                                    ? "bg-teal-500"
                                    : r.avanceReal > 0
                                    ? "bg-amber-500"
                                    : "bg-slate-500"
                                }`}
                                style={{ width: `${r.avanceReal}%` }}
                              />
                            </div>
                          </td>

                          {/* Monto a certificar */}
                          <td className="px-5 py-4 text-right">
                            <span className="font-mono text-sm font-semibold dark:text-teal-400 text-teal-600 whitespace-nowrap">
                              {formatGs(montoCert)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="border-t dark:border-white/[0.06] border-slate-200 dark:bg-slate-800/40 bg-slate-50">
                      <td
                        colSpan={3}
                        className="px-5 py-3 text-right text-xs font-semibold dark:text-slate-300 text-slate-600 uppercase tracking-wide"
                      >
                        Total Certificado
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm font-bold dark:text-teal-400 text-teal-600 whitespace-nowrap">
                        {formatGs(totalCertificado)}
                      </td>
                    </tr>
                    <tr className="dark:bg-slate-800/20 bg-slate-50/50">
                      <td
                        colSpan={3}
                        className="px-5 py-2.5 text-right text-xs dark:text-slate-500 text-slate-400"
                      >
                        Presupuesto total: {formatGs(totalCost)} —&nbsp;
                        Saldo pendiente:{" "}
                        {formatGs(totalCost - totalCertificado)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold dark:text-slate-400 text-slate-500">
                        {totalCost > 0
                          ? (
                              ((totalCost - totalCertificado) / totalCost) *
                              100
                            ).toFixed(1)
                          : "0"}
                        %
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
