"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { ManoObraStats } from "@/app/estadisticas/actions";
import { HardHat, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────

const C_PACTADO  = "#1d4ed8"; // Blue 700   — monto total pactado
const C_PAGADO   = "#15803d"; // Green 700  — ya pagado
const C_RETENCION= "#b45309"; // Amber 700  — retención de garantía

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatGs(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `Gs ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Gs ${(value / 1_000).toFixed(0)}K`;
  return `Gs ${Math.round(value)}`;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVO:     { label: "Activo",     color: "text-emerald-500", icon: <Clock size={11} /> },
  FINALIZADO: { label: "Finalizado", color: "text-blue-400",    icon: <CheckCircle2 size={11} /> },
  PAUSADO:    { label: "Pausado",    color: "text-amber-500",   icon: <AlertTriangle size={11} /> },
  RESCINDIDO: { label: "Rescindido", color: "text-red-500",     icon: <AlertTriangle size={11} /> },
};

// ─────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────

interface TooltipEntry { name: string; value: number; color: string }
interface ContratoDatum {
  nombre: string;
  montoPactado: number;
  pagado: number;
  retencion: number;
  pctPagado: number;
  estado: string;
  labelPactado: string;
  labelPagado: string;
  labelRetencion: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = (payload[0] as unknown as { payload: ContratoDatum }).payload;

  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[210px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-2 leading-tight">{label}</p>
      {[
        { label: "Monto pactado",  value: formatGs(d.montoPactado),  color: C_PACTADO   },
        { label: "Pagado",         value: formatGs(d.pagado),         color: C_PAGADO    },
        { label: "Retención",      value: formatGs(d.retencion),      color: C_RETENCION },
      ].map(({ label: lbl, value, color }) => (
        <div key={lbl} className="flex justify-between gap-4">
          <span style={{ color }} className="font-medium">{lbl}</span>
          <span className="font-mono font-bold dark:text-slate-200 text-slate-700">{value}</span>
        </div>
      ))}
      <div className="border-t dark:border-white/[0.06] border-slate-100 pt-1.5 mt-1 flex justify-between">
        <span className="dark:text-slate-400 text-slate-500">% pagado</span>
        <span
          className="font-mono font-bold"
          style={{ color: d.pctPagado >= 100 ? C_PAGADO : d.pctPagado >= 60 ? C_RETENCION : C_PACTADO }}
        >
          {d.pctPagado.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoManoObraProps {
  stats: ManoObraStats;
}

export function GraficoManoObra({ stats }: GraficoManoObraProps) {
  if (stats.contratos.length === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <HardHat size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          Sin contratos de mano de obra registrados.
        </p>
      </div>
    );
  }

  const pctTotalPagado = stats.totalContratado > 0
    ? Math.min(100, (stats.totalPagado / stats.totalContratado) * 100)
    : 0;

  // Datos del gráfico con etiquetas pre-calculadas
  const chartData: ContratoDatum[] = stats.contratos.map((c) => ({
    nombre: c.jefeCuadrilla || c.descripcion.slice(0, 22),
    montoPactado: c.montoPactado,
    pagado:       c.pagado,
    retencion:    c.retencion,
    pctPagado:    c.pctPagado,
    estado:       c.estado,
    labelPactado:   formatGs(c.montoPactado),
    labelPagado:    c.pagado   > 0 ? `${c.pctPagado.toFixed(0)}%` : "",
    labelRetencion: c.retencion > 0 ? formatGs(c.retencion) : "",
  }));

  const chartHeight = Math.max(240, stats.contratos.length * 68);

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-white/[0.05] border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
            <HardHat size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Mano de Obra — Contratos de Cuadrillas
            </h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Pactado, pagado y retención por cuadrilla
            </p>
          </div>
        </div>

        {/* KPI resumen */}
        <div className="flex items-center gap-6">
          {[
            { label: "Total pactado",  value: formatGs(stats.totalContratado), color: C_PACTADO   },
            { label: "Total pagado",   value: formatGs(stats.totalPagado),      color: C_PAGADO    },
            { label: "Retención total",value: formatGs(stats.totalRetencion),   color: C_RETENCION },
            {
              label: "% pagado global",
              value: `${pctTotalPagado.toFixed(1)}%`,
              color: pctTotalPagado >= 100 ? C_PAGADO : pctTotalPagado >= 60 ? C_RETENCION : C_PACTADO,
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-right">
              <p className="text-[10px] dark:text-slate-500 text-slate-400">{label}</p>
              <p className="text-sm font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="px-2 py-4 grafico-print-block" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
            barGap={3}
            barCategoryGap="22%"
          >
            <CartesianGrid strokeDasharray="4 3" horizontal={false} stroke="rgba(148,163,184,0.22)" />
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              tickFormatter={(v) =>
                Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(Math.round(v))
              }
            />
            <YAxis
              type="category"
              dataKey="nombre"
              width={145}
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
            <Legend
              verticalAlign="top"
              iconType="square"
              wrapperStyle={{ paddingBottom: 10 }}
              formatter={(value) => {
                if (value === "montoPactado") return <span style={{ fontWeight: 700, color: C_PACTADO   }}>▌ Monto pactado</span>;
                if (value === "pagado")       return <span style={{ fontWeight: 700, color: C_PAGADO    }}>▌ Pagado</span>;
                if (value === "retencion")    return <span style={{ fontWeight: 700, color: C_RETENCION }}>▌ Retención</span>;
                return value;
              }}
            />

            {/* Pactado */}
            <Bar dataKey="montoPactado" name="montoPactado" fill={C_PACTADO} fillOpacity={0.22} stroke={C_PACTADO} strokeWidth={1.5} radius={[0, 3, 3, 0]} className="bar-proyectado">
              <LabelList dataKey="labelPactado" position="insideRight" style={{ fontSize: 8, fontWeight: 700, fill: C_PACTADO }} />
            </Bar>

            {/* Pagado */}
            <Bar dataKey="pagado" name="pagado" fill={C_PAGADO} stroke={C_PAGADO} strokeWidth={1} radius={[0, 3, 3, 0]} className="bar-utilizado">
              <LabelList dataKey="labelPagado" position="insideRight" style={{ fontSize: 8, fontWeight: 700, fill: "#ffffff" }} />
            </Bar>

            {/* Retención */}
            <Bar dataKey="retencion" name="retencion" fill={C_RETENCION} stroke={C_RETENCION} strokeWidth={1} radius={[0, 3, 3, 0]} className="bar-bodega">
              <LabelList dataKey="labelRetencion" position="insideRight" style={{ fontSize: 8, fontWeight: 700, fill: "#ffffff" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de estados por contrato */}
      <div className="px-5 pb-5 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b dark:border-white/[0.06] border-slate-100">
              {["Cuadrilla / Jefe", "Descripción", "Monto pactado", "Pagado", "% pagado", "Estado"].map((h) => (
                <th key={h} className="text-left py-2 pr-4 dark:text-slate-500 text-slate-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.contratos.map((c) => {
              const cfg = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.ACTIVO;
              return (
                <tr key={c.id} className="border-b dark:border-white/[0.04] border-slate-50">
                  <td className="py-2 pr-4 dark:text-slate-200 text-slate-700 font-semibold">{c.jefeCuadrilla || "—"}</td>
                  <td className="py-2 pr-4 dark:text-slate-400 text-slate-500 max-w-[180px] truncate">{c.descripcion}</td>
                  <td className="py-2 pr-4 font-mono" style={{ color: C_PACTADO }}>{formatGs(c.montoPactado)}</td>
                  <td className="py-2 pr-4 font-mono" style={{ color: C_PAGADO }}>{formatGs(c.pagado)}</td>
                  <td className="py-2 pr-4 font-mono font-bold"
                    style={{ color: c.pctPagado >= 100 ? C_PAGADO : c.pctPagado >= 60 ? C_RETENCION : C_PACTADO }}
                  >
                    {c.pctPagado.toFixed(1)}%
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center gap-1 font-bold ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
