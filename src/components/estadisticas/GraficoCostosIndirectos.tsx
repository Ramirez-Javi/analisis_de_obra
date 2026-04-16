"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { CostoIndirectoAgrupado } from "@/app/estadisticas/actions";
import { Wrench } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA — print-safe colores oscuros
// ─────────────────────────────────────────────────────────────

const COLORES = [
  "#1d4ed8", // Blue 700
  "#15803d", // Green 700
  "#b91c1c", // Red 700
  "#b45309", // Amber 700
  "#7c3aed", // Violet 700
  "#0f766e", // Teal 700
  "#c2410c", // Orange 700
  "#1e40af", // Blue 800
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatGs(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `Gs ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Gs ${(value / 1_000).toFixed(0)}K`;
  return `Gs ${Math.round(value)}`;
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────

interface SliceDatum extends CostoIndirectoAgrupado {
  pct: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SliceDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[180px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-1">{d.label}</p>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Total</span>
        <span className="font-mono font-bold" style={{ color: d.color }}>{formatGs(d.total)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Participación</span>
        <span className="font-mono font-bold dark:text-slate-200 text-slate-700">{d.pct.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Registros</span>
        <span className="font-mono dark:text-slate-300 text-slate-600">{d.cantidad}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoCostosIndirectosProps {
  data: CostoIndirectoAgrupado[];
}

export function GraficoCostosIndirectos({ data }: GraficoCostosIndirectosProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <Wrench size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          Sin costos indirectos registrados en este proyecto.
        </p>
      </div>
    );
  }

  const totalGeneral = data.reduce((s, d) => s + d.total, 0);

  const slices: SliceDatum[] = data.map((d, i) => ({
    ...d,
    pct: totalGeneral > 0 ? (d.total / totalGeneral) * 100 : 0,
    color: COLORES[i % COLORES.length],
  }));

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-white/[0.05] border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-md">
            <Wrench size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Costos Indirectos
            </h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Distribución por tipo de costo
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] dark:text-slate-500 text-slate-400">Total indirectos</p>
          <p className="text-base font-bold" style={{ color: COLORES[0] }}>{formatGs(totalGeneral)}</p>
        </div>
      </div>

      {/* Contenido: Pie + leyenda */}
      <div className="flex flex-col md:flex-row items-center gap-4 px-4 py-5 grafico-print-block">
        {/* PieChart */}
        <div className="w-full md:w-64 h-64 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
                dataKey="total"
                nameKey="label"
              >
                {slices.map((slice, i) => (
                  <Cell key={i} fill={slice.color} stroke="none" />
                ))}
                <LabelList
                  dataKey="pct"
                  position="inside"
                  style={{ fontSize: 9, fontWeight: 700, fill: "#ffffff" }}
                  formatter={(v: unknown) => {
                    const n = Number(v);
                    return n >= 8 ? `${n.toFixed(0)}%` : "";
                  }}
                />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda + tabla */}
        <div className="flex-1 w-full overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b dark:border-white/[0.06] border-slate-100">
                {["", "Tipo", "Total", "%", "Registros"].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 dark:text-slate-500 text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slices.map((s) => (
                <tr key={s.tipo} className="border-b dark:border-white/[0.04] border-slate-50">
                  <td className="py-2 pr-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  </td>
                  <td className="py-2 pr-4 dark:text-slate-200 text-slate-700 font-semibold whitespace-nowrap">{s.label}</td>
                  <td className="py-2 pr-4 font-mono font-bold" style={{ color: s.color }}>{formatGs(s.total)}</td>
                  <td className="py-2 pr-4 font-mono font-bold dark:text-slate-300 text-slate-600">{s.pct.toFixed(1)}%</td>
                  <td className="py-2 pr-4 dark:text-slate-400 text-slate-500 text-center">{s.cantidad}</td>
                </tr>
              ))}
              <tr className="border-t dark:border-white/[0.08] border-slate-200">
                <td colSpan={2} className="py-2 pr-4 dark:text-slate-300 text-slate-600 font-bold">TOTAL</td>
                <td className="py-2 pr-4 font-mono font-bold dark:text-slate-100 text-slate-800">{formatGs(totalGeneral)}</td>
                <td className="py-2 pr-4 font-mono font-bold dark:text-slate-300 text-slate-600">100%</td>
                <td className="py-2 pr-4 dark:text-slate-400 text-slate-500 text-center">
                  {data.reduce((s, d) => s + d.cantidad, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
