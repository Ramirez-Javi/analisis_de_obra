"use client";

import { useMemo, useState } from "react";
import type { DashboardProyectoData } from "@/app/estadisticas/actions";

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Colores por nivel (0-4) — clases completas para que Tailwind no las purgue
const NIVEL_BG = [
  "bg-slate-100 dark:bg-slate-800/80",          // 0: sin actividad
  "bg-indigo-100 dark:bg-indigo-900/70",         // 1: bajo
  "bg-indigo-300 dark:bg-indigo-700",            // 2: medio
  "bg-indigo-500",                               // 3: alto
  "bg-indigo-700 dark:bg-indigo-400",            // 4: máximo
];

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

type Metrica = "horas" | "personal";

interface DayCellData {
  iso: string;
  date: Date;
  inYear: boolean;
  horas: number;
  personal: number;
  nivel: number; // 0-4 calculado dinámicamente
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// JS: 0=Dom,1=Lun,...,6=Sáb → Mon=0,...,Sun=6
function dowLunes(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function nivelColor(value: number, max: number): number {
  if (value === 0 || max === 0) return 0;
  const pct = value / max;
  if (pct <= 0.25) return 1;
  if (pct <= 0.5) return 2;
  if (pct <= 0.75) return 3;
  return 4;
}

// ─────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DE GRILLA
// ─────────────────────────────────────────────────────────────

function buildGrid(
  year: number,
  dataMap: Map<string, { horas: number; personal: number }>,
  metrica: Metrica,
): { weeks: DayCellData[][]; monthLabels: { weekIdx: number; label: string }[] } {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  // Empezar en el lunes de la semana del 1 de enero
  const startDate = addDays(jan1, -dowLunes(jan1));
  // Terminar en el domingo de la semana del 31 de diciembre
  const endDate = addDays(dec31, 6 - dowLunes(dec31));

  // Calcular max para normalización
  let maxVal = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const iso = isoDate(current);
    const d = dataMap.get(iso);
    if (d) {
      const v = metrica === "horas" ? d.horas : d.personal;
      if (v > maxVal) maxVal = v;
    }
    current.setDate(current.getDate() + 1);
  }

  // Construir semanas
  const weeks: DayCellData[][] = [];
  let cur = new Date(startDate);
  let lastMonth = -1;
  const monthLabels: { weekIdx: number; label: string }[] = [];

  while (cur <= endDate) {
    const week: DayCellData[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = isoDate(cur);
      const dayData = dataMap.get(iso);
      const horas = dayData?.horas ?? 0;
      const personal = dayData?.personal ?? 0;
      const inYear = cur.getFullYear() === year;
      const value = metrica === "horas" ? horas : personal;
      week.push({
        iso,
        date: new Date(cur),
        inYear,
        horas,
        personal,
        nivel: inYear ? nivelColor(value, maxVal) : 0,
      });
      cur = addDays(cur, 1);
    }

    // Etiqueta de mes: primer día hábil del año en esta semana
    const firstInYear = week.find((c) => c.inYear && c.date.getDate() <= 7);
    if (firstInYear) {
      const mes = firstInYear.date.getMonth();
      if (mes !== lastMonth) {
        monthLabels.push({ weekIdx: weeks.length, label: MESES[mes] });
        lastMonth = mes;
      }
    }

    weeks.push(week);
  }

  return { weeks, monthLabels };
}

// ─────────────────────────────────────────────────────────────
// CELDA INDIVIDUAL
// ─────────────────────────────────────────────────────────────

function HeatCell({
  cell,
  onHover,
  onLeave,
}: {
  cell: DayCellData;
  onHover: (cell: DayCellData) => void;
  onLeave: () => void;
}) {
  const bg = cell.inYear ? NIVEL_BG[cell.nivel] : "bg-transparent";

  return (
    <div
      className={`w-3 h-3 rounded-[2px] cursor-default transition-transform hover:scale-125 hover:z-10 ${bg} ${
        cell.inYear && (cell.horas > 0 || cell.personal > 0)
          ? "ring-1 ring-inset ring-black/5 dark:ring-white/10"
          : ""
      }`}
      onMouseEnter={() => onHover(cell)}
      onMouseLeave={onLeave}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function HeatmapActividad({ data }: { data: DashboardProyectoData }) {
  const { bitacora } = data;

  // Construir mapa de datos
  const dataMap = useMemo(() => {
    const map = new Map<string, { horas: number; personal: number }>();
    for (const d of bitacora.personalDiario) {
      const existing = map.get(d.fechaISO);
      if (existing) {
        existing.horas += d.horasTotales;
        existing.personal = Math.max(existing.personal, d.personalCount);
      } else {
        map.set(d.fechaISO, { horas: d.horasTotales, personal: d.personalCount });
      }
    }
    return map;
  }, [bitacora]);

  // Años disponibles
  const anos = useMemo(() => {
    const set = new Set<number>();
    for (const d of bitacora.personalDiario) {
      set.add(parseInt(d.fechaISO.split("-")[0]));
    }
    if (set.size === 0) set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a); // descendente
  }, [bitacora]);

  const [ano, setAno] = useState<number>(anos[0]);
  const [metrica, setMetrica] = useState<Metrica>("horas");
  const [hoveredCell, setHoveredCell] = useState<DayCellData | null>(null);

  const { weeks, monthLabels } = useMemo(
    () => buildGrid(ano, dataMap, metrica),
    [ano, dataMap, metrica],
  );

  // Stats del año seleccionado
  const statsAno = useMemo(() => {
    let totalHoras = 0;
    let diasActivos = 0;
    let maxHoras = 0;
    let maxDia = "";
    let racha = 0;
    let rachaMax = 0;
    let rachaActual = 0;

    const jan1 = new Date(ano, 0, 1);
    const dec31 = new Date(ano, 11, 31);
    let cur = new Date(jan1);
    while (cur <= dec31) {
      const iso = isoDate(cur);
      const d = dataMap.get(iso);
      if (d) {
        totalHoras += d.horas;
        diasActivos++;
        rachaActual++;
        if (d.horas > maxHoras) {
          maxHoras = d.horas;
          maxDia = iso;
        }
      } else {
        if (rachaActual > rachaMax) rachaMax = rachaActual;
        rachaActual = 0;
      }
      cur = addDays(cur, 1);
    }
    if (rachaActual > rachaMax) rachaMax = rachaActual;
    racha = rachaMax;
    return { totalHoras, diasActivos, maxHoras, maxDia, rachaMax: racha };
  }, [ano, dataMap]);

  if (bitacora.personalDiario.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
        Sin entradas de bitácora para generar el heatmap.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Controles ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Año */}
        <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-sm">
          {anos.map((a) => (
            <button
              key={a}
              onClick={() => setAno(a)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                ano === a
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Métrica */}
        <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-sm">
          {(["horas", "personal"] as Metrica[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetrica(m)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                metrica === m
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {m === "horas" ? "Horas trabajadas" : "Personal en obra"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats rápidas ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Días con actividad",
            value: `${statsAno.diasActivos}`,
            sub: `de 365 días del año`,
            color: "text-indigo-600 dark:text-indigo-400",
          },
          {
            label: "Horas totales",
            value: `${statsAno.totalHoras.toFixed(0)} h`,
            sub: `${statsAno.diasActivos > 0 ? (statsAno.totalHoras / statsAno.diasActivos).toFixed(1) : 0} h/día promedio`,
            color: "text-indigo-600 dark:text-indigo-400",
          },
          {
            label: "Racha más larga",
            value: `${statsAno.rachaMax} días`,
            sub: "consecutivos con actividad",
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Día más activo",
            value: statsAno.maxDia
              ? new Date(statsAno.maxDia + "T12:00:00").toLocaleDateString("es-PY", {
                  day: "numeric",
                  month: "short",
                })
              : "—",
            sub: statsAno.maxHoras > 0 ? `${statsAno.maxHoras.toFixed(1)} h registradas` : "",
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 px-4 py-3"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Heatmap ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
          Calendario de actividad — {ano}
        </p>

        {/* Contenedor scrollable */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex gap-1 min-w-max">
            {/* Etiquetas días de semana */}
            <div className="flex flex-col gap-0.5 mr-1 pt-5">
              {DIAS_SEMANA.map((d, i) => (
                <div
                  key={d}
                  className={`h-3 flex items-center text-[9px] text-slate-400 dark:text-slate-500 pr-1 leading-none ${
                    i % 2 === 0 ? "opacity-0" : "" // Solo Mar, Jue, Sáb, Dom visibles
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Semanas */}
            <div className="flex flex-col gap-0">
              {/* Etiquetas de mes */}
              <div className="relative h-5 mb-0.5">
                {monthLabels.map(({ weekIdx, label }) => (
                  <span
                    key={label}
                    className="absolute text-[10px] font-medium text-slate-500 dark:text-slate-400"
                    style={{ left: `${weekIdx * 14}px` }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Grid de semanas */}
              <div className="flex gap-0.5">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((cell) => (
                      <div key={cell.iso} className="relative">
                        <HeatCell
                          cell={cell}
                          onHover={(c) => {
                            setHoveredCell(c);
                          }}
                          onLeave={() => {
                            setHoveredCell(null);
                          }}
                        />
                        {/* Tooltip inline por celda */}
                        {hoveredCell?.iso === cell.iso && (
                          <div className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-xl px-3 py-2 text-xs whitespace-nowrap">
                            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1 capitalize">
                              {fmtDateLong(cell.date)}
                            </p>
                            {cell.horas > 0 || cell.personal > 0 ? (
                              <div className="space-y-0.5 text-slate-500 dark:text-slate-400">
                                <div className="flex justify-between gap-4">
                                  <span>Horas</span>
                                  <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                                    {cell.horas.toFixed(1)} h
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Personal</span>
                                  <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                                    {cell.personal} personas
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-400 dark:text-slate-500">
                                Sin actividad
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda de intensidad */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Menos</span>
          {NIVEL_BG.map((cls, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-[2px] ${cls} ring-1 ring-inset ring-black/5 dark:ring-white/5`}
            />
          ))}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Más</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-3">
            ({metrica === "horas" ? "horas trabajadas por día" : "personas en obra por día"})
          </span>
        </div>
      </div>

      {/* ── Distribución por día de semana ─────────────────── */}
      <DowDistribucion dataMap={dataMap} ano={ano} metrica={metrica} />

      {/* ── Distribución mensual ───────────────────────────── */}
      <DistribucionMensual dataMap={dataMap} ano={ano} metrica={metrica} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Distribución por día de semana
// ─────────────────────────────────────────────────────────────

function DowDistribucion({
  dataMap,
  ano,
  metrica,
}: {
  dataMap: Map<string, { horas: number; personal: number }>;
  ano: number;
  metrica: Metrica;
}) {
  const dowTotales = useMemo(() => {
    const totales = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    const jan1 = new Date(ano, 0, 1);
    const dec31 = new Date(ano, 11, 31);
    let cur = new Date(jan1);
    while (cur <= dec31) {
      const iso = isoDate(cur);
      const d = dataMap.get(iso);
      if (d) {
        const dow = dowLunes(cur);
        totales[dow] += metrica === "horas" ? d.horas : d.personal;
        counts[dow]++;
      }
      cur = addDays(cur, 1);
    }
    return DIAS_SEMANA.map((label, i) => ({
      label,
      total: totales[i],
      avg: counts[i] > 0 ? totales[i] / counts[i] : 0,
    }));
  }, [dataMap, ano, metrica]);

  const max = Math.max(...dowTotales.map((d) => d.total));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
        Actividad por día de semana — {ano}
      </p>
      <div className="flex items-end gap-2 h-24">
        {dowTotales.map((d) => {
          const h = max > 0 ? (d.total / max) * 100 : 0;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: "72px" }}>
                <div
                  className="w-full rounded-t-sm bg-indigo-500 dark:bg-indigo-500 transition-all"
                  style={{ height: `${h}%`, minHeight: d.total > 0 ? "2px" : "0" }}
                />
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Distribución mensual
// ─────────────────────────────────────────────────────────────

function DistribucionMensual({
  dataMap,
  ano,
  metrica,
}: {
  dataMap: Map<string, { horas: number; personal: number }>;
  ano: number;
  metrica: Metrica;
}) {
  const mesTotales = useMemo(() => {
    const totales = new Array(12).fill(0);
    const diasActivos = new Array(12).fill(0);
    const jan1 = new Date(ano, 0, 1);
    const dec31 = new Date(ano, 11, 31);
    let cur = new Date(jan1);
    while (cur <= dec31) {
      const iso = isoDate(cur);
      const d = dataMap.get(iso);
      if (d) {
        const mes = cur.getMonth();
        totales[mes] += metrica === "horas" ? d.horas : d.personal;
        diasActivos[mes]++;
      }
      cur = addDays(cur, 1);
    }
    return MESES.map((label, i) => ({
      label,
      total: totales[i],
      diasActivos: diasActivos[i],
    }));
  }, [dataMap, ano, metrica]);

  const max = Math.max(...mesTotales.map((m) => m.total));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
        Actividad mensual — {ano}
      </p>
      <div className="flex items-end gap-1.5 h-28">
        {mesTotales.map((m) => {
          const h = max > 0 ? (m.total / max) * 100 : 0;
          return (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              {/* Valor encima */}
              <span
                className="text-[9px] text-slate-400 dark:text-slate-500 leading-none"
                style={{ opacity: m.total > 0 ? 1 : 0 }}
              >
                {metrica === "horas"
                  ? m.total >= 1000
                    ? `${(m.total / 1000).toFixed(1)}k`
                    : m.total.toFixed(0)
                  : m.total.toFixed(0)}
              </span>
              <div className="w-full flex flex-col justify-end" style={{ height: "72px" }}>
                <div
                  className="w-full rounded-t-sm bg-indigo-500 dark:bg-indigo-500 transition-all"
                  style={{ height: `${h}%`, minHeight: m.total > 0 ? "2px" : "0" }}
                />
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">{m.label}</span>
              {m.diasActivos > 0 && (
                <span className="text-[8px] text-slate-300 dark:text-slate-600">
                  {m.diasActivos}d
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
