"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  BarChart,
  Cell,
} from "recharts";
import type { BitacoraStats } from "@/app/estadisticas/actions";
import { ClipboardList, Users, Sun, Cloud } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────

const C_HORAS    = "#1d4ed8"; // Blue 700  — horas trabajadas
const C_PERSONAL = "#15803d"; // Green 700 — cantidad de personal

const CLIMA_COLORES: Record<string, string> = {
  SOLEADO:    "#b45309", // Amber 700
  NUBLADO:    "#334155", // Slate 700
  LLUVIOSO:   "#1d4ed8", // Blue 700
  TORMENTA:   "#7c3aed", // Violet 700
  VENTOSO:    "#0f766e", // Teal 700
  PARCIALMENTE_NUBLADO: "#9333ea",
};

const CLIMA_LABEL: Record<string, string> = {
  SOLEADO:    "Soleado",
  NUBLADO:    "Nublado",
  LLUVIOSO:   "Lluvioso",
  TORMENTA:   "Tormenta",
  VENTOSO:    "Ventoso",
  PARCIALMENTE_NUBLADO: "Parcialmente nublado",
};

function climaColor(clima: string): string {
  return CLIMA_COLORES[clima] ?? "#64748b";
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function muestrear<T>(arr: T[], maxPuntos: number): T[] {
  if (arr.length <= maxPuntos) return arr;
  const step = arr.length / maxPuntos;
  const result: T[] = [];
  for (let i = 0; i < maxPuntos; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP — gráfico personal
// ─────────────────────────────────────────────────────────────

interface DiaDatum {
  fecha: string;
  horasTotales: number;
  personalCount: number;
  labelHoras: string;
  labelPersonal: string;
}

function TooltipPersonal({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: DiaDatum }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[180px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span style={{ color: C_HORAS }} className="font-medium">Horas trabajadas</span>
        <span className="font-mono font-bold dark:text-slate-200 text-slate-700">{d.horasTotales}h</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: C_PERSONAL }} className="font-medium">Personal</span>
        <span className="font-mono font-bold dark:text-slate-200 text-slate-700">{d.personalCount}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoBitacoraProps {
  stats: BitacoraStats;
}

export function GraficoBitacora({ stats }: GraficoBitacoraProps) {
  if (stats.diasConActividad === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <ClipboardList size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          Sin registros de bitácora para este proyecto.
        </p>
      </div>
    );
  }

  const promHorasDia = stats.totalHorasRegistradas / stats.diasConActividad;
  const promPersonal = stats.personalDiario.reduce((s, d) => s + d.personalCount, 0) / stats.diasConActividad;

  // Muestreo a máximo 60 puntos
  const datosPersonal = muestrear(
    stats.personalDiario.map((d) => ({
      ...d,
      labelHoras: `${d.horasTotales}h`,
      labelPersonal: String(d.personalCount),
    })) as DiaDatum[],
    60
  );

  const climaData = stats.climaFrecuencia.map((c) => ({
    ...c,
    label: CLIMA_LABEL[c.clima] ?? c.clima,
    color: climaColor(c.clima),
    labelPct: `${c.pct}%`,
  }));

  return (
    <div className="space-y-4">
      {/* ── Resumen KPIs ── */}
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white px-5 py-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
            <ClipboardList size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">Bitácora de Obra</h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">Personal diario y condiciones climáticas</p>
          </div>
        </div>
        {[
          { label: "Días con actividad",   value: String(stats.diasConActividad),             color: C_HORAS,    icon: <ClipboardList size={13} /> },
          { label: "Total horas",          value: `${stats.totalHorasRegistradas}h`,          color: C_HORAS,    icon: <Users size={13} /> },
          { label: "Promedio horas/día",   value: `${promHorasDia.toFixed(1)}h`,              color: C_PERSONAL, icon: <Users size={13} /> },
          { label: "Personal prom./día",   value: `${promPersonal.toFixed(1)} personas`,      color: C_PERSONAL, icon: <Users size={13} /> },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-right">
            <p className="text-[10px] dark:text-slate-500 text-slate-400">{label}</p>
            <p className="text-sm font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Gráfico personal por día ── */}
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b dark:border-white/[0.05] border-slate-100 flex items-center gap-2">
          <Users size={15} className="dark:text-slate-400 text-slate-500" />
          <h4 className="text-sm font-semibold dark:text-slate-200 text-slate-700">Horas y Personal por Día</h4>
        </div>
        <div className="px-2 py-4 grafico-print-block" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datosPersonal} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 3" stroke="rgba(148,163,184,0.22)" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 9, fill: "#475569", fontWeight: 600 }}
                tickLine={{ stroke: "#94a3b8" }}
                axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="horas"
                orientation="left"
                tick={{ fontSize: 9, fill: "#475569", fontWeight: 600 }}
                tickLine={{ stroke: "#94a3b8" }}
                axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
                label={{ value: "Horas", angle: -90, position: "insideLeft", dy: 30, style: { fontSize: 9, fill: "#475569", fontWeight: 700 } }}
              />
              <YAxis
                yAxisId="personal"
                orientation="right"
                tick={{ fontSize: 9, fill: "#475569", fontWeight: 600 }}
                tickLine={{ stroke: "#94a3b8" }}
                axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
                label={{ value: "Personas", angle: 90, position: "insideRight", dy: -30, style: { fontSize: 9, fill: "#475569", fontWeight: 700 } }}
              />
              <Tooltip content={<TooltipPersonal />} />
              <Legend
                verticalAlign="top"
                formatter={(value) => {
                  if (value === "horasTotales")  return <span style={{ fontWeight: 700, color: C_HORAS    }}>▌ Horas</span>;
                  if (value === "personalCount") return <span style={{ fontWeight: 700, color: C_PERSONAL }}>▌ Personal</span>;
                  return value;
                }}
              />
              <Bar yAxisId="horas" dataKey="horasTotales" name="horasTotales" fill={C_HORAS} fillOpacity={0.7} stroke={C_HORAS} strokeWidth={1} radius={[2, 2, 0, 0]} className="bar-utilizado" />
              <Line yAxisId="personal" dataKey="personalCount" name="personalCount" stroke={C_PERSONAL} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} className="line-real" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Gráfico clima ── */}
      {climaData.length > 0 && (
        <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b dark:border-white/[0.05] border-slate-100 flex items-center gap-2">
            <Sun size={15} className="dark:text-slate-400 text-slate-500" />
            <h4 className="text-sm font-semibold dark:text-slate-200 text-slate-700">Frecuencia Climática</h4>
            <Cloud size={13} className="dark:text-slate-500 text-slate-400 ml-1" />
          </div>
          <div className="px-2 py-4 grafico-print-block" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={climaData} margin={{ top: 8, right: 20, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="4 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                  tickLine={{ stroke: "#94a3b8" }}
                  axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#475569", fontWeight: 600 }}
                  tickLine={{ stroke: "#94a3b8" }}
                  axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
                  label={{ value: "Días", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#475569", fontWeight: 700 } }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.05)" }}
                />
                <Bar dataKey="cantidad" name="cantidad" radius={[4, 4, 0, 0]} className="bar-utilizado">
                  {climaData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                  <LabelList dataKey="labelPct" position="top" style={{ fontSize: 9, fontWeight: 700, fill: "#475569" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
