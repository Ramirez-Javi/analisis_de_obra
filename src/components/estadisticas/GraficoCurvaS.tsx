"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CurvaSData } from "@/app/estadisticas/actions";
import { TrendingUp, AlertCircle, Calendar } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA
// ─────────────────────────────────────────────────────────────

const C_PLANIFICADO = "#1d4ed8"; // Blue 700  — línea planificada
const C_REAL        = "#15803d"; // Green 700 — línea real

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
  const planificado = payload.find((p) => p.name === "planificado");
  const real = payload.find((p) => p.name === "real");

  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[180px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-1">{label}</p>
      {planificado && (
        <div className="flex justify-between gap-4">
          <span style={{ color: C_PLANIFICADO }} className="font-medium">Planificado</span>
          <span className="font-mono font-bold dark:text-slate-200 text-slate-700">
            {planificado.value.toFixed(1)}%
          </span>
        </div>
      )}
      {real && (
        <div className="flex justify-between gap-4">
          <span style={{ color: C_REAL }} className="font-medium">Real</span>
          <span className="font-mono font-bold dark:text-slate-200 text-slate-700">
            {real.value.toFixed(1)}%
          </span>
        </div>
      )}
      {planificado && real && (
        <div className="border-t dark:border-white/[0.06] border-slate-100 pt-1.5 mt-1">
          <div className="flex justify-between gap-4">
            <span className="dark:text-slate-400 text-slate-500">Desvío</span>
            <span
              className="font-mono font-bold"
              style={{ color: real.value >= planificado.value ? C_REAL : "#dc2626" }}
            >
              {(real.value - planificado.value).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoCurvaSProps {
  data: CurvaSData;
}

export function GraficoCurvaS({ data }: GraficoCurvaSProps) {
  const desvio = data.avanceActualReal - data.avanceActualPlanificado;
  const colorDesvio =
    desvio >= 0
      ? "text-emerald-500"
      : desvio > -10
      ? "text-amber-500"
      : "text-red-500";

  if (data.sinTareas) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <Calendar size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1">
          Sin tareas de cronograma
        </p>
        <p className="text-xs dark:text-slate-500 text-slate-400">
          Cargá las tareas en el módulo Cronograma para ver la Curva S.
        </p>
      </div>
    );
  }

  if (data.sinFechaInicio) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm font-semibold dark:text-slate-300 text-slate-700 mb-1">
          Sin fecha de inicio definida
        </p>
        <p className="text-xs dark:text-slate-500 text-slate-400">
          Asignale una fecha de inicio al proyecto para calcular la curva planificada.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-white/[0.05] border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Curva S — Avance Planificado vs Real
            </h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              % acumulado de avance ponderado por costo de rubro
            </p>
          </div>
        </div>

        {/* Indicadores rápidos */}
        <div className="flex items-center gap-6">
          {[
            { label: "Planificado", value: `${data.avanceActualPlanificado.toFixed(1)}%`, color: C_PLANIFICADO },
            { label: "Real", value: `${data.avanceActualReal.toFixed(1)}%`, color: C_REAL },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-right">
              <p className="text-[10px] dark:text-slate-500 text-slate-400">{label}</p>
              <p className="text-sm font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
          <div className="text-right">
            <p className="text-[10px] dark:text-slate-500 text-slate-400">Desvío actual</p>
            <p className={`text-sm font-bold ${colorDesvio}`}>
              {desvio >= 0 ? "+" : ""}{desvio.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="px-2 py-4 grafico-print-block" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.puntos}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="4 3" stroke="rgba(148,163,184,0.22)" />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              formatter={(value) => {
                if (value === "planificado")
                  return <span style={{ fontWeight: 700, color: C_PLANIFICADO }}>▬ Planificado (curva ideal)</span>;
                if (value === "real")
                  return <span style={{ fontWeight: 700, color: C_REAL }}>◆ Real acumulado</span>;
                return value;
              }}
            />

            {/* Línea de meta 100% */}
            <ReferenceLine
              y={100}
              stroke="#64748b"
              strokeDasharray="5 3"
              strokeWidth={1}
              label={{ value: "100%", position: "insideTopRight", fontSize: 9, fill: "#64748b" }}
            />

            {/* Planificado — punteado azul */}
            <Line
              type="monotone"
              dataKey="planificado"
              stroke={C_PLANIFICADO}
              strokeWidth={2.5}
              strokeDasharray="7 4"
              dot={false}
              name="planificado"
              className="line-proyeccion"
            />

            {/* Real — sólido verde, con dots */}
            <Line
              type="monotone"
              dataKey="real"
              stroke={C_REAL}
              strokeWidth={2.5}
              dot={{ r: 4, fill: C_REAL, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              name="real"
              connectNulls={false}
              className="line-real"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interpretación */}
      {Math.abs(desvio) > 0.1 && (
        <div
          className={`px-5 py-3 border-t dark:border-white/[0.05] border-slate-100 text-xs font-medium flex items-center gap-2 ${
            desvio >= 0 ? "dark:text-emerald-400 text-emerald-700" : "dark:text-red-400 text-red-700"
          }`}
        >
          <TrendingUp size={13} className={desvio < 0 ? "rotate-180" : ""} />
          {desvio >= 0
            ? `Avance ADELANTADO: el proyecto está ${desvio.toFixed(1)}% por encima del plan.`
            : `Avance RETRASADO: el proyecto está ${Math.abs(desvio).toFixed(1)}% por debajo del plan.`}
        </div>
      )}
    </div>
  );
}
