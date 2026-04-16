"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, CalendarDays, TrendingUp, Save, Check, Plus, Trash2, X } from "lucide-react";
import { calcSubtotalRubro } from "@/components/presupuesto/types";
import type { RubroProyecto } from "@/components/presupuesto/types";
import type { RubroProyectoDB } from "@/app/actions/init-modulos";
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
  fechaInicio: string;      // YYYY-MM-DD planificado
  duracion: number;         // días planificados
  avanceReal: number;       // 0–100
  fechaInicioReal?: string; // YYYY-MM-DD real
  fechaFinReal?: string;    // YYYY-MM-DD real
  esPersonalizado?: boolean; // tarea agregada manualmente en el cronograma
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

// ─── Presupuesto sync ────────────────────────────────────────────────────────

/**
 * Synchronizes cronograma rubros with the presupuesto stored in localStorage.
 * - Rubros that already exist in cronograma keep their timing/avance data.
 * - New rubros from presupuesto are added with default timing.
 * - Rubros removed from presupuesto are dropped from cronograma.
 * - If no presupuesto data exists, returns the existing cronograma as-is.
 */
function syncFromPresupuesto(
  existing: RubroCronograma[],
  presupuestoRaw: string | null,
  today: string
): RubroCronograma[] {
  if (!presupuestoRaw) return existing;
  let rubrosPresupuesto: RubroProyecto[] = [];
  try {
    rubrosPresupuesto = JSON.parse(presupuestoRaw) as RubroProyecto[];
  } catch {
    return existing;
  }
  if (rubrosPresupuesto.length === 0) return existing;

  const existingMap = new Map(existing.map((r) => [r.id, r]));

  const result = rubrosPresupuesto.map((rp) => {
    const total = calcSubtotalRubro(rp);
    const prev = existingMap.get(rp.instanceId);
    if (prev) {
      // Keep existing timing & avance, update name and total from presupuesto
      return { ...prev, nombre: rp.nombre, total };
    }
    // New rubro: start at today — cascaded below
    return {
      id: rp.instanceId,
      nombre: rp.nombre,
      total,
      fechaInicio: today,
      duracion: 7,
      avanceReal: 0,
    };
  });

  // Cascade start dates for new rubros: each new rubro starts when the previous one ends
  for (let i = 1; i < result.length; i++) {
    if (!existingMap.has(result[i].id)) {
      const prev = result[i - 1];
      result[i] = { ...result[i], fechaInicio: addDaysToStr(prev.fechaInicio, prev.duracion) };
    }
  }

  return result;
}

// ─── DateInputDMY ─────────────────────────────────────────────────────────────
/**
 * Date input that displays in dd/mm/yyyy format (Paraguay / South America).
 * Internally stores values as YYYY-MM-DD. Includes a native calendar picker
 * triggered by clicking the calendar icon.
 */
function DateInputDMY({
  value,
  onChange,
  className,
}: {
  value: string;          // YYYY-MM-DD
  onChange: (v: string) => void;
  className?: string;
}) {
  function toDisplay(iso: string) {
    if (!iso || iso.length < 10) return iso;
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function fromDisplay(dmy: string): string | null {
    const parts = dmy.split("/");
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!y || y.length !== 4) return null;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isNaN(new Date(iso + "T00:00:00").getTime()) ? null : iso;
  }

  // Track the last ISO value we've seen so we can detect external (cascade) changes
  const [lastIso, setLastIso] = useState(value);
  const [text, setText] = useState(() => toDisplay(value));

  // When parent cascades a new value, sync display text during render (avoid setState-in-effect)
  if (lastIso !== value) {
    setLastIso(value);
    setText(toDisplay(value));
  }

  const hiddenRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative inline-flex items-center w-28">
      <input
        type="text"
        value={text}
        placeholder="dd/mm/aaaa"
        maxLength={10}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const iso = fromDisplay(raw);
          if (iso) onChange(iso);
        }}
        onBlur={() => {
          const iso = fromDisplay(text);
          if (!iso) setText(toDisplay(value));
        }}
        className={`${className ?? ""} w-full pr-7`}
      />
      {/* Visible calendar icon — pointer-events-none so the hidden input below handles clicks */}
      <CalendarDays
        size={13}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 pointer-events-none"
      />
      {/* Transparent native date picker positioned over the icon area */}
      <input
        ref={hiddenRef}
        type="date"
        value={value}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
            setText(toDisplay(e.target.value));
          }
        }}
        className="absolute right-0 top-0 bottom-0 w-8 opacity-0 cursor-pointer"
        tabIndex={-1}
      />
    </div>
  );
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

// ─── Gantt calendar constants ────────────────────────────────────────────────

const DAY_W = 28; // pixels per day column

const MONTH_NAMES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];
// 0 = Sunday
const DAY_INITIALS = ["D", "L", "M", "M", "J", "V", "S"];

// ─── GanttGrid ────────────────────────────────────────────────────────────────

interface GanttGridProps {
  rubros: RubroCronograma[];
  projectStart: string;
  totalDays: number;
  barColors: typeof BAR_COLORS;
}

function GanttGrid({ rubros, projectStart, totalDays, barColors }: GanttGridProps) {
  const allDays = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(projectStart + "T00:00:00");
      d.setDate(d.getDate() + i);
      return { offset: i, date: d };
    });
  }, [projectStart, totalDays]);

  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    for (const day of allDays) {
      const label = MONTH_NAMES[day.date.getMonth()];
      if (groups.length === 0 || groups[groups.length - 1].label !== label) {
        groups.push({ label, count: 1 });
      } else {
        groups[groups.length - 1].count++;
      }
    }
    return groups;
  }, [allDays]);

  const weekGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    let weekNum = 1;
    for (let i = 0; i < totalDays; i += 7) {
      groups.push({ label: `SEM ${weekNum}`, count: Math.min(7, totalDays - i) });
      weekNum++;
    }
    return groups;
  }, [totalDays]);

  const totalWidth = totalDays * DAY_W;

  return (
    <div className="flex gap-3" style={{ minWidth: `${128 + 12 + totalWidth}px` }}>
      {/* Left column: rubro names */}
      <div className="w-32 shrink-0">
        {/* Spacer: 3 header rows × 28px = 84px total */}
        <div className="h-[84px]" />
        {rubros.map((r, i) => (
          <div key={r.id} className="h-10 mb-2 flex items-center">
            <span className={`text-xs font-semibold truncate ${barColors[i % barColors.length].label}`}>
              {r.nombre}
            </span>
          </div>
        ))}
      </div>

      {/* Right: calendar header + bars */}
      <div className="flex-1 min-w-0" style={{ width: `${totalWidth}px` }}>
        {/* Row 1: months */}
        <div className="flex border-b dark:border-white/[0.06] border-slate-200">
          {monthGroups.map((mg, idx) => (
            <div
              key={idx}
              className="shrink-0 h-7 flex items-center justify-center text-[10px] font-bold tracking-widest dark:text-slate-200 text-slate-700 dark:bg-slate-800/70 bg-slate-100 border-r dark:border-white/[0.10] border-slate-300 overflow-hidden"
              style={{ width: `${mg.count * DAY_W}px` }}
            >
              {mg.label}
            </div>
          ))}
        </div>

        {/* Row 2: weeks */}
        <div className="flex border-b dark:border-white/[0.06] border-slate-200">
          {weekGroups.map((wg, idx) => (
            <div
              key={idx}
              className="shrink-0 h-7 flex items-center justify-center text-[9px] font-semibold dark:text-slate-400 text-slate-500 dark:bg-slate-800/40 bg-slate-50 border-r dark:border-white/[0.06] border-slate-200 overflow-hidden"
              style={{ width: `${wg.count * DAY_W}px` }}
            >
              {wg.label}
            </div>
          ))}
        </div>

        {/* Row 3: day initials + day numbers */}
        <div className="flex border-b dark:border-white/[0.10] border-slate-300">
          {allDays.map((day) => {
            const dow = day.date.getDay();
            const isWeekend = dow === 0 || dow === 6;
            return (
              <div
                key={day.offset}
                className={`shrink-0 h-7 flex flex-col items-center justify-center border-r dark:border-white/[0.04] border-slate-100 text-[9px] leading-none gap-px select-none
                  ${isWeekend
                    ? "dark:bg-slate-700/50 bg-slate-200/70 dark:text-slate-500 text-slate-400"
                    : "dark:bg-transparent bg-white dark:text-slate-500 text-slate-400"
                  }`}
                style={{ width: `${DAY_W}px` }}
              >
                <span className="font-bold">{DAY_INITIALS[dow]}</span>
                <span>{day.date.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* Bars + per-day grid */}
        <div className="relative" style={{ width: `${totalWidth}px` }}>
          {/* Per-day vertical gridlines */}
          {allDays.map((day) => {
            const isMonthBoundary = day.date.getDate() === 1;
            const dow = day.date.getDay();
            const isWeekend = dow === 0 || dow === 6;
            return (
              <div
                key={day.offset}
                className={`absolute top-0 bottom-0 w-px ${
                  isMonthBoundary
                    ? "dark:bg-white/[0.18] bg-slate-300"
                    : isWeekend
                    ? "dark:bg-white/[0.06] bg-slate-200"
                    : "dark:bg-white/[0.03] bg-slate-100"
                }`}
                style={{ left: `${day.offset * DAY_W}px` }}
              />
            );
          })}

          {/* Last boundary line */}
          <div
            className="absolute top-0 bottom-0 w-px dark:bg-white/[0.08] bg-slate-200"
            style={{ left: `${totalWidth}px` }}
          />

          {/* Rubro bars */}
          {rubros.map((r, i) => {
            const start = dayOffset(projectStart, r.fechaInicio);
            const leftPx = Math.max(0, start) * DAY_W;
            const widthPx = Math.max(DAY_W, r.duracion * DAY_W);
            const c = barColors[i % barColors.length];
            return (
              <div key={r.id} className="relative h-10 mb-2">
                {/* Track (planned) */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-lg overflow-hidden ${c.track}`}
                  style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
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
                  style={{ left: `${leftPx}px` }}
                >
                  {r.avanceReal}%
                </span>
                {/* Duration label */}
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[10px] dark:text-slate-500 text-slate-400 pl-1 whitespace-nowrap"
                  style={{ left: `${leftPx + widthPx + 4}px` }}
                >
                  {r.duracion}d
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "gantt" | "curvaS";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  proyecto: Proyecto;
  backHref: string;
  today: string; // YYYY-MM-DD from server to avoid hydration mismatch
  /** Rubros cargados desde DB como fallback cuando localStorage no tiene datos */
  initialRubros?: RubroProyectoDB[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CronogramaClient({ proyecto, backHref, today, initialRubros = [] }: Props) {
  const STORAGE_KEY = `cronograma_${proyecto.id}`;

  const [activeTab, setActiveTab] = useState<Tab>("gantt");
  const [rubros, setRubros] = useState<RubroCronograma[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const cronogramaRaw = localStorage.getItem(`cronograma_${proyecto.id}`);
        const existing: RubroCronograma[] = cronogramaRaw
          ? (JSON.parse(cronogramaRaw) as RubroCronograma[])
          : [];
        const presupuestoRaw = localStorage.getItem(`presupuesto_${proyecto.id}`);
        // Si no hay datos en localStorage, usar los rubros cargados desde DB
        const fallback = !presupuestoRaw && initialRubros.length > 0
          ? JSON.stringify(initialRubros)
          : presupuestoRaw;
        return syncFromPresupuesto(existing, fallback, today);
      }
    } catch {}
    // SSR fallback: use DB data directly
    if (initialRubros.length > 0) {
      return syncFromPresupuesto([], JSON.stringify(initialRubros), today);
    }
    return [];
  });

  const [savedKey, setSavedKey] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`cronograma_${proyecto.id}`);
        if (raw) return raw;
      }
    } catch {}
    return "[]";
  });

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // ── Agregar tarea modal ───────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState({ nombre: "", fechaInicio: today, duracion: 1 });

  // Re-sync with presupuesto whenever the user navigates back to this tab
  // (covers the case where rubros were added/removed in the presupuesto module)
  useEffect(() => {
    function handleFocus() {
      const presupuestoRaw = localStorage.getItem(`presupuesto_${proyecto.id}`);
      if (!presupuestoRaw) return;
      setRubros((prev) => syncFromPresupuesto(prev, presupuestoRaw, today));
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [proyecto.id, today]);

  // ── Derived: project span ────────────────────────────────────────────────
  const { projectStart, totalDays } = useMemo(() => {
    const starts = rubros.map((r) => r.fechaInicio);
    const ends = rubros.map((r) => addDaysToStr(r.fechaInicio, r.duracion));
    const ps = [...starts].sort()[0];
    const pe = [...ends].sort().at(-1)!;
    return { projectStart: ps, totalDays: Math.max(dayOffset(ps, pe), 1) };
  }, [rubros]);

  // ── Derived: Curva S chart data ───────────────────────────────────────────
  const chartData = useMemo(() => {
    const totalCost = rubros.reduce((s, r) => s + r.total, 0);
    if (totalCost === 0) return [];

    // Checkpoints every 3 days (scaled for very long projects to avoid overplotting)
    const step = Math.max(3, Math.ceil(totalDays / 30));
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
  function agregarTarea() {
    if (!nuevaTarea.nombre.trim()) return;
    const newRow: RubroCronograma = {
      id: `custom-${Date.now()}`,
      nombre: nuevaTarea.nombre.trim(),
      total: 0,
      fechaInicio: nuevaTarea.fechaInicio,
      duracion: Math.max(1, nuevaTarea.duracion),
      avanceReal: 0,
      esPersonalizado: true,
    };
    setRubros((prev) => [...prev, newRow]);
    setModalOpen(false);
    setNuevaTarea({ nombre: "", fechaInicio: today, duracion: 1 });
  }

  function eliminarTarea(id: string) {
    setRubros((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRubro<K extends keyof RubroCronograma>(
    id: string,
    key: K,
    value: RubroCronograma[K]
  ) {
    setRubros((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const next = prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
      // When timing changes, cascade start dates for all subsequent rubros
      if (key === "fechaInicio" || key === "duracion") {
        for (let i = idx + 1; i < next.length; i++) {
          const p = next[i - 1];
          next[i] = { ...next[i], fechaInicio: addDaysToStr(p.fechaInicio, p.duracion) };
        }
      }
      return next;
    });
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

      {rubros.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 dark:text-slate-600 text-slate-300" />
          <h2 className="text-base font-semibold dark:text-slate-300 text-slate-600 mb-1">
            No hay rubros en el presupuesto
          </h2>
          <p className="text-sm dark:text-slate-500 text-slate-400">
            Primero cargá los rubros en el módulo de{" "}
            <Link
              href={backHref.replace(/\/cronograma$/, "/presupuesto")}
              className="underline underline-offset-2 dark:text-teal-400 text-teal-600 hover:opacity-80"
            >
              Cómputo y Presupuesto
            </Link>
            {" "}y luego volvé aquí para planificar los tiempos.
          </p>
        </div>
      ) : (
        <>
        {/* ─── Modal: Agregar tarea ──────────────────────────────────────────── */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 dark:bg-black/60 bg-black/30 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border dark:border-white/[0.10] border-slate-200 dark:bg-slate-900 bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/[0.08] border-slate-100">
                <div className="flex items-center gap-2">
                  <Plus size={15} className="dark:text-teal-400 text-teal-600" />
                  <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                    Agregar tarea al Gantt
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 dark:text-slate-400 text-slate-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">
                    Nombre de la tarea
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Limpieza de terreno"
                    value={nuevaTarea.nombre}
                    onChange={(e) => setNuevaTarea((p) => ({ ...p, nombre: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") agregarTarea(); }}
                    className={`${inputCls} w-full`}
                  />
                </div>
                {/* Fecha inicio */}
                <div>
                  <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">
                    Fecha de inicio
                  </label>
                  <DateInputDMY
                    value={nuevaTarea.fechaInicio}
                    onChange={(v) => setNuevaTarea((p) => ({ ...p, fechaInicio: v }))}
                    className={inputCls}
                  />
                </div>
                {/* Duración */}
                <div>
                  <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">
                    Duración (días)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={nuevaTarea.duracion}
                    onChange={(e) =>
                      setNuevaTarea((p) => ({
                        ...p,
                        duracion: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className={`${inputCls} w-24 text-center`}
                  />
                </div>
              </div>
              {/* Footer */}
              <div className="px-5 pb-5 flex gap-2 justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarTarea}
                  disabled={!nuevaTarea.nombre.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Plus size={13} />
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ════════════════════════════════════════════════════════════════
            VISTA 1 — PLANIFICACIÓN (GANTT)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === "gantt" && (
          <div className="space-y-5">
            {/* ── Planning table ─────────────────────────────────────────── */}
            <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/50 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b dark:border-white/[0.06] border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                    Datos de Planificación
                  </h2>
                  <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                    Ajustá las fechas y duraciones para actualizar el Gantt
                  </p>
                </div>
                <button
                  onClick={() => {
                    const last = rubros[rubros.length - 1];
                    setNuevaTarea({
                      nombre: "",
                      fechaInicio: last ? addDaysToStr(last.fechaInicio, last.duracion) : today,
                      duracion: 1,
                    });
                    setModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-white transition-colors"
                >
                  <Plus size={13} />
                  Agregar tarea
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="dark:bg-slate-800/40 bg-slate-50 text-xs dark:text-slate-400 text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Rubro / Tarea</th>
                      <th className="text-right px-5 py-3">Costo Total</th>
                      <th className="text-center px-5 py-3">Fecha de Inicio</th>
                      <th className="text-center px-5 py-3">Duración (días)</th>
                      <th className="text-center px-5 py-3">Fecha de Finalización</th>
                      <th className="w-10" />
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
                          <DateInputDMY
                            value={r.fechaInicio}
                            onChange={(v) => updateRubro(r.id, "fechaInicio", v)}
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
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-teal-900/30 bg-teal-50 dark:text-teal-300 text-teal-700 dark:border dark:border-teal-800/50 border border-teal-200 whitespace-nowrap">
                            {new Date(
                              addDaysToStr(r.fechaInicio, r.duracion - 1) + "T00:00:00"
                            ).toLocaleDateString("es-PY", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="px-2 py-3.5 text-center">
                          {r.esPersonalizado && (
                            <button
                              onClick={() => eliminarTarea(r.id)}
                              title="Eliminar tarea"
                              className="p-1.5 rounded-lg dark:text-slate-500 text-slate-400 dark:hover:text-red-400 hover:text-red-500 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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
                <GanttGrid
                  rubros={rubros}
                  projectStart={projectStart}
                  totalDays={totalDays}
                  barColors={BAR_COLORS}
                />
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
                      <th className="text-center px-5 py-3 w-44">Avance Real %</th>
                      <th className="text-center px-3 py-3 whitespace-nowrap">Inicio Real</th>
                      <th className="text-center px-3 py-3 whitespace-nowrap">Fin Real</th>
                      <th className="text-center px-3 py-3 whitespace-nowrap">Días Reales</th>
                      <th className="text-center px-3 py-3 whitespace-nowrap">Diferencia</th>
                      <th className="text-right px-5 py-3">Monto a Certificar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                    {rubros.map((r) => {
                      const montoCert = r.total * (r.avanceReal / 100);

                      // Días reales y diferencia (solo cuando ambas fechas existen)
                      const diasReales =
                        r.fechaInicioReal && r.fechaFinReal
                          ? dayOffset(r.fechaInicioReal, r.fechaFinReal) + 1
                          : null;
                      const diff =
                        diasReales !== null ? diasReales - r.duracion : null;

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
                                    Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                  )
                                }
                                className={`${inputCls} w-20 text-center`}
                              />
                              <span className="text-xs dark:text-slate-500 text-slate-400">%</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full dark:bg-slate-700 bg-slate-200 overflow-hidden mx-auto max-w-[120px]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  r.avanceReal >= 100 ? "bg-teal-500" : r.avanceReal > 0 ? "bg-amber-500" : "bg-slate-500"
                                }`}
                                style={{ width: `${r.avanceReal}%` }}
                              />
                            </div>
                          </td>

                          {/* Fecha inicio real */}
                          <td className="px-3 py-4 text-center">
                            <DateInputDMY
                              value={r.fechaInicioReal ?? ""}
                              onChange={(v) => updateRubro(r.id, "fechaInicioReal", v || undefined)}
                              className={inputCls}
                            />
                          </td>

                          {/* Fecha fin real */}
                          <td className="px-3 py-4 text-center">
                            <DateInputDMY
                              value={r.fechaFinReal ?? ""}
                              onChange={(v) => updateRubro(r.id, "fechaFinReal", v || undefined)}
                              className={inputCls}
                            />
                          </td>

                          {/* Días reales */}
                          <td className="px-3 py-4 text-center">
                            {diasReales !== null ? (
                              <span className="font-mono text-xs font-semibold dark:text-slate-300 text-slate-600">
                                {diasReales}d
                              </span>
                            ) : (
                              <span className="text-xs dark:text-slate-600 text-slate-300">—</span>
                            )}
                          </td>

                          {/* Diferencia vs Gantt */}
                          <td className="px-3 py-4 text-center">
                            {diff === null ? (
                              <span className="text-xs dark:text-slate-600 text-slate-300">—</span>
                            ) : diff === 0 ? (
                              <span className="text-xs font-mono font-semibold dark:text-slate-400 text-slate-500">0</span>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                                  diff > 0
                                    ? "dark:bg-red-500/15 bg-red-50 dark:text-red-400 text-red-600 dark:border dark:border-red-500/20 border border-red-200"
                                    : "dark:bg-teal-500/15 bg-teal-50 dark:text-teal-400 text-teal-600 dark:border dark:border-teal-500/20 border border-teal-200"
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff}d
                              </span>
                            )}
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
                        colSpan={7}
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
                        colSpan={7}
                        className="px-5 py-2.5 text-right text-xs dark:text-slate-500 text-slate-400"
                      >
                        Presupuesto total: {formatGs(totalCost)} —&nbsp;
                        Saldo pendiente: {formatGs(totalCost - totalCertificado)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold dark:text-slate-400 text-slate-500">
                        {totalCost > 0
                          ? (((totalCost - totalCertificado) / totalCost) * 100).toFixed(1)
                          : "0"}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>
        </>
      )}
    </div>
  );
}
