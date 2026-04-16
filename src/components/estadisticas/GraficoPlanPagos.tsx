"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import type { PlanPagosData, CuotaItem } from "@/app/estadisticas/actions";
import { CalendarClock, CheckCircle2, Clock, AlertTriangle, DollarSign } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────

const C_PAGADA   = "#15803d"; // Green 700
const C_VENCIDA  = "#b91c1c"; // Red 700
const C_PENDIENTE= "#334155"; // Slate 700
const C_COBRADO  = "#1d4ed8"; // Blue 700

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatGs(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `Gs ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Gs ${(value / 1_000).toFixed(0)}K`;
  return `Gs ${Math.round(value)}`;
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d} ${MESES[parseInt(m) - 1]} ${y.slice(2)}`;
}

const ESTADO_META: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  PAGADA:   { color: C_PAGADA,    bg: "#dcfce7", icon: <CheckCircle2 size={11} />, label: "Pagada"   },
  VENCIDA:  { color: C_VENCIDA,   bg: "#fee2e2", icon: <AlertTriangle size={11}/>, label: "Vencida"  },
  PENDIENTE:{ color: C_PENDIENTE, bg: "#f1f5f9", icon: <Clock size={11} />,        label: "Pendiente"},
};

// ─────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────

interface CuotaDatum extends CuotaItem {
  label: string;
  barColor: string;
  labelMonto: string;
}

function CustomTooltip({
  active, payload, label,
}: { active?: boolean; payload?: { payload: CuotaDatum }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const meta = ESTADO_META[d.estado] ?? ESTADO_META.PENDIENTE;
  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[200px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Monto</span>
        <span className="font-mono font-bold" style={{ color: meta.color }}>{formatGs(d.montoCalculado)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Porcentaje</span>
        <span className="font-mono font-bold dark:text-slate-200 text-slate-700">{d.porcentaje.toFixed(1)}%</span>
      </div>
      {d.fechaEstimada && (
        <div className="flex justify-between gap-4">
          <span className="dark:text-slate-400 text-slate-500">Fecha estimada</span>
          <span className="font-mono dark:text-slate-200 text-slate-700">{formatFecha(d.fechaEstimada)}</span>
        </div>
      )}
      {d.fechaPago && (
        <div className="flex justify-between gap-4">
          <span className="dark:text-slate-400 text-slate-500">Fecha de pago</span>
          <span className="font-mono" style={{ color: C_PAGADA }}>{formatFecha(d.fechaPago)}</span>
        </div>
      )}
      <div className="border-t dark:border-white/[0.06] border-slate-100 pt-1 mt-1 flex items-center gap-1.5">
        <span style={{ color: meta.color }}>{meta.icon}</span>
        <span className="font-bold" style={{ color: meta.color }}>{meta.label}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoPlanPagosProps {
  data: PlanPagosData;
}

export function GraficoPlanPagos({ data }: GraficoPlanPagosProps) {
  if (data.sinContrato || data.cuotas.length === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <CalendarClock size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          {data.sinContrato
            ? "No hay monto de contrato aprobado. Defina el monto en Aprobación."
            : "Sin cuotas de cobro definidas en el plan de pagos."}
        </p>
      </div>
    );
  }

  const pctCobrado = data.totalContrato > 0
    ? Math.min(100, (data.totalCobrado / data.totalContrato) * 100)
    : 0;

  const chartData: CuotaDatum[] = data.cuotas.map((c) => ({
    ...c,
    label: c.descripcion ? `C${c.numeroCuota}: ${c.descripcion.slice(0, 18)}` : `Cuota ${c.numeroCuota}`,
    barColor: (ESTADO_META[c.estado] ?? ESTADO_META.PENDIENTE).color,
    labelMonto: formatGs(c.montoCalculado),
  }));

  // Valor máx para eje X
  const maxMonto = Math.max(...data.cuotas.map((c) => c.montoCalculado), 1);
  const chartHeight = Math.max(200, data.cuotas.length * 50);

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-white/[0.05] border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md">
            <DollarSign size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Plan de Cobros al Cliente
            </h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              {data.cuotas.length} cuota{data.cuotas.length !== 1 ? "s" : ""} — estados de pago
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6">
          {[
            { label: "Contrato total",  value: formatGs(data.totalContrato),  color: C_COBRADO  },
            { label: "Cobrado",         value: formatGs(data.totalCobrado),    color: C_PAGADA   },
            { label: "Pendiente",       value: formatGs(data.totalPendiente),  color: C_VENCIDA  },
            { label: "% cobrado",       value: `${pctCobrado.toFixed(1)}%`,    color: pctCobrado >= 100 ? C_PAGADA : pctCobrado >= 60 ? C_COBRADO : C_VENCIDA },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-right">
              <p className="text-[10px] dark:text-slate-500 text-slate-400">{label}</p>
              <p className="text-sm font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex justify-between text-[10px] dark:text-slate-500 text-slate-400 mb-1">
          <span>Progreso de cobro</span>
          <span className="font-mono font-bold" style={{ color: pctCobrado >= 100 ? C_PAGADA : pctCobrado >= 60 ? C_COBRADO : C_VENCIDA }}>
            {pctCobrado.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctCobrado}%`, backgroundColor: pctCobrado >= 100 ? C_PAGADA : C_COBRADO }}
          />
        </div>
      </div>

      {/* Gráfico */}
      <div className="px-2 py-4 grafico-print-block" style={{ height: chartHeight + 48 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid strokeDasharray="4 3" horizontal={false} stroke="rgba(148,163,184,0.22)" />
            <XAxis
              type="number"
              domain={[0, maxMonto * 1.15]}
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              tickFormatter={(v) =>
                Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(Math.round(v))
              }
            />
            <YAxis
              type="category"
              dataKey="label"
              width={155}
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />

            <Bar
              dataKey="montoCalculado"
              name="montoCalculado"
              radius={[0, 4, 4, 0]}
              className="bar-utilizado"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.barColor} />
              ))}
              <LabelList dataKey="labelMonto" position="right" style={{ fontSize: 9, fontWeight: 700, fill: "#475569" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detalle */}
      <div className="px-5 pb-5 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b dark:border-white/[0.06] border-slate-100">
              {["#", "Descripción", "%", "Monto", "F. Estimada", "F. Pago", "Estado"].map((h) => (
                <th key={h} className="text-left py-2 pr-4 dark:text-slate-500 text-slate-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cuotas.map((c) => {
              const meta = ESTADO_META[c.estado] ?? ESTADO_META.PENDIENTE;
              return (
                <tr key={c.numeroCuota} className="border-b dark:border-white/[0.04] border-slate-50">
                  <td className="py-2 pr-4 font-mono text-[11px] dark:text-slate-300 text-slate-600">{c.numeroCuota}</td>
                  <td className="py-2 pr-4 dark:text-slate-300 text-slate-600 max-w-[180px] truncate">{c.descripcion ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono font-bold dark:text-slate-200 text-slate-700">{c.porcentaje.toFixed(1)}%</td>
                  <td className="py-2 pr-4 font-mono font-bold" style={{ color: meta.color }}>{formatGs(c.montoCalculado)}</td>
                  <td className="py-2 pr-4 font-mono dark:text-slate-400 text-slate-500">{formatFecha(c.fechaEstimada)}</td>
                  <td className="py-2 pr-4 font-mono" style={{ color: c.fechaPago ? C_PAGADA : "#94a3b8" }}>{formatFecha(c.fechaPago)}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-1 font-bold" style={{ color: meta.color }}>
                      {meta.icon} {meta.label}
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
