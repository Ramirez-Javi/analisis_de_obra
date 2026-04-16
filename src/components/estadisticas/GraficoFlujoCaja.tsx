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
  ReferenceLine,
  LabelList,
} from "recharts";
import type { FlujoCajaMensual } from "@/app/estadisticas/actions";
import { DollarSign } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────

const C_INGRESO = "#15803d"; // Green 700
const C_EGRESO  = "#b91c1c"; // Red 700
const C_SALDO   = "#1d4ed8"; // Blue 700

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

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
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
  const ing  = payload.find((p) => p.name === "ingresos");
  const egr  = payload.find((p) => p.name === "egresos");
  const sld  = payload.find((p) => p.name === "saldoAcumulado");

  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[200px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-2">{label}</p>
      {ing && (
        <div className="flex justify-between gap-4">
          <span style={{ color: C_INGRESO }} className="font-medium">Ingresos</span>
          <span className="font-mono font-bold">{formatGs(ing.value)}</span>
        </div>
      )}
      {egr && (
        <div className="flex justify-between gap-4">
          <span style={{ color: C_EGRESO }} className="font-medium">Egresos</span>
          <span className="font-mono font-bold">{formatGs(egr.value)}</span>
        </div>
      )}
      {ing && egr && (
        <div className="flex justify-between gap-4 border-t dark:border-white/[0.06] border-slate-100 pt-1.5 mt-1">
          <span className="dark:text-slate-400 text-slate-500">Resultado mes</span>
          <span
            className="font-mono font-bold"
            style={{ color: ing.value >= egr.value ? C_INGRESO : C_EGRESO }}
          >
            {formatGs(ing.value - egr.value)}
          </span>
        </div>
      )}
      {sld && (
        <div className="flex justify-between gap-4">
          <span style={{ color: C_SALDO }} className="font-medium">Saldo acumulado</span>
          <span className="font-mono font-bold" style={{ color: sld.value >= 0 ? C_INGRESO : C_EGRESO }}>
            {formatGs(sld.value)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoFlujoCajaProps {
  datos: FlujoCajaMensual[];
}

export function GraficoFlujoCaja({ datos }: GraficoFlujoCajaProps) {
  if (datos.length === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <DollarSign size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          Sin movimientos financieros registrados aún.
        </p>
      </div>
    );
  }

  const totalIngresos = datos.reduce((s, d) => s + d.ingresos, 0);
  const totalEgresos  = datos.reduce((s, d) => s + d.egresos, 0);
  const saldoFinal    = datos[datos.length - 1]?.saldoAcumulado ?? 0;

  // Pre-calcular etiquetas para LabelList
  const datosConLabel = datos.map((d) => ({
    ...d,
    labelIngreso: d.ingresos > 0 ? formatGs(d.ingresos) : "",
    labelEgreso:  d.egresos  > 0 ? formatGs(d.egresos)  : "",
  }));

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-white/[0.05] border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
            <DollarSign size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Flujo de Caja Mensual
            </h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Ingresos, egresos y saldo acumulado por mes
            </p>
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="flex items-center gap-6">
          {[
            { label: "Total ingresos", value: formatGs(totalIngresos), color: C_INGRESO },
            { label: "Total egresos",  value: formatGs(totalEgresos),  color: C_EGRESO },
            {
              label: "Saldo actual",
              value: formatGs(saldoFinal),
              color: saldoFinal >= 0 ? C_INGRESO : C_EGRESO,
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
      <div className="px-2 py-4 grafico-print-block" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datosConLabel} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 3" stroke="rgba(148,163,184,0.22)" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              tickFormatter={(v) =>
                Math.abs(v) >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : Math.abs(v) >= 1_000
                  ? `${(v / 1_000).toFixed(0)}K`
                  : String(Math.round(v))
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              formatter={(value) => {
                if (value === "ingresos")      return <span style={{ fontWeight: 700, color: C_INGRESO }}>▌Ingresos (cliente)</span>;
                if (value === "egresos")       return <span style={{ fontWeight: 700, color: C_EGRESO  }}>▌Egresos (pagos)</span>;
                if (value === "saldoAcumulado") return <span style={{ fontWeight: 700, color: C_SALDO   }}>◆ Saldo acumulado</span>;
                return value;
              }}
            />

            {/* Línea de equilibrio */}
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 2" strokeWidth={1} />

            {/* Barras */}
            <Bar dataKey="ingresos" name="ingresos" fill={C_INGRESO} fillOpacity={0.85} stroke={C_INGRESO} strokeWidth={1} className="bar-utilizado" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="labelIngreso" position="top" style={{ fontSize: 8, fontWeight: 700, fill: C_INGRESO }} />
            </Bar>
            <Bar dataKey="egresos"  name="egresos"  fill={C_EGRESO}  fillOpacity={0.85} stroke={C_EGRESO}  strokeWidth={1} className="bar-adquirir"  radius={[3, 3, 0, 0]}>
              <LabelList dataKey="labelEgreso" position="top" style={{ fontSize: 8, fontWeight: 700, fill: C_EGRESO }} />
            </Bar>

            {/* Línea de saldo acumulado */}
            <Line
              type="monotone"
              dataKey="saldoAcumulado"
              name="saldoAcumulado"
              stroke={C_SALDO}
              strokeWidth={2.5}
              dot={{ r: 4, fill: C_SALDO, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              className="line-real"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
