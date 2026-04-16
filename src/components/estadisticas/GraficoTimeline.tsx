"use client";

import { useState, useMemo } from "react";
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
import type { TimelineMaterial } from "@/app/estadisticas/actions";
import { Activity, ChevronDown } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA — alto contraste, legible en impresión
// ─────────────────────────────────────────────────────────────

const C_ACUMULADO  = "#1d4ed8"; // Blue 700   — línea sólida principal
const C_PROYECCION = "#b45309"; // Amber 700  — línea punteada de proyección
const C_DIARIA     = "#64748b"; // Slate 500  — barras diarias (secundaria)
const C_OBJETIVO   = "#15803d"; // Green 700  — reference line objetivo

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function formatCant(n: number, unidad: string): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} ${unidad}`;
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP PERSONALIZADO
// ─────────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  payload: { fecha: string; acumulado: number; diaria: number; proyeccion?: number };
}

function CustomTooltip({
  active,
  payload,
  label,
  unidad,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  unidad: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[180px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Instalado ese día</span>
        <span className="font-mono font-semibold" style={{ color: C_DIARIA }}>
          {formatCant(d.diaria ?? 0, unidad)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Acumulado real</span>
        <span className="font-mono font-semibold" style={{ color: C_ACUMULADO }}>
          {formatCant(d.acumulado ?? 0, unidad)}
        </span>
      </div>
      {d.proyeccion !== undefined && (
        <div className="flex justify-between gap-4">
          <span className="dark:text-slate-400 text-slate-500">Proyección</span>
          <span className="font-mono font-semibold" style={{ color: C_PROYECCION }}>
            {formatCant(d.proyeccion, unidad)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoTimelineProps {
  materiales: TimelineMaterial[];
}

export function GraficoTimeline({ materiales }: GraficoTimelineProps) {
  const [materialSeleccionado, setMaterialSeleccionado] = useState<string>(
    materiales[0]?.materialId ?? ""
  );

  const material = materiales.find((m) => m.materialId === materialSeleccionado);

  // Construir datos del gráfico: línea real + proyección lineal
  const chartData = useMemo(() => {
    if (!material || material.puntos.length === 0) return [];

    const puntos = material.puntos;
    const ultimoReal = puntos[puntos.length - 1];

    // Tasa diaria promedio de consumo
    const tasaDiariaPromedio =
      puntos.length > 1
        ? (ultimoReal.cantidadAcumulada - puntos[0].cantidadAcumulada) /
          (puntos.length - 1)
        : ultimoReal.cantidadAcumulada;

    // Cuántos días faltan para llegar al total proyectado con esa tasa
    const restante = material.totalProyectado - ultimoReal.cantidadAcumulada;
    const diasProyeccion = tasaDiariaPromedio > 0 ? Math.ceil(restante / tasaDiariaPromedio) : 0;

    // Puntos reales
    const dataReales = puntos.map((p) => ({
      fecha: formatFecha(p.fecha),
      fechaISO: p.fecha,
      diaria: p.cantidadDiaria,
      acumulado: p.cantidadAcumulada,
      proyeccion: undefined as number | undefined,
    }));

    // Proyección desde el último punto real
    const dataProyeccion: typeof dataReales = [];
    if (diasProyeccion > 0 && tasaDiariaPromedio > 0) {
      const [y, m, d] = ultimoReal.fecha.split("-").map(Number);
      let acum = ultimoReal.cantidadAcumulada;
      for (let i = 1; i <= Math.min(diasProyeccion, 60); i++) {
        const fecha = new Date(y, m - 1, d + i);
        const fechaStr = fecha.toISOString().split("T")[0];
        acum += tasaDiariaPromedio;
        dataProyeccion.push({
          fecha: formatFecha(fechaStr),
          fechaISO: fechaStr,
          diaria: 0,
          acumulado: undefined as unknown as number,
          proyeccion: Math.min(acum, material.totalProyectado),
        });
      }
    }

    return [...dataReales, ...dataProyeccion];
  }, [material]);

  if (materiales.length === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <Activity size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          No hay registros de instalación as-built aún. El timeline se activará cuando se registre el primer material instalado.
        </p>
      </div>
    );
  }

  const pctConsumido =
    material && material.totalProyectado > 0
      ? Math.min(
          100,
          ((material.puntos[material.puntos.length - 1]?.cantidadAcumulada ?? 0) /
            material.totalProyectado) *
            100
        )
      : 0;

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-white/[0.05] border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Timeline de Utilización
            </h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Consumo acumulado real + proyección de ritmo actual
            </p>
          </div>
        </div>

        {/* Selector de material */}
        <div className="relative">
          <select
            value={materialSeleccionado}
            onChange={(e) => setMaterialSeleccionado(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-lg dark:bg-slate-800 bg-slate-100 dark:border-white/[0.08] border-slate-200 border dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
          >
            {materiales.map((m) => (
              <option key={m.materialId} value={m.materialId}>
                {m.materialNombre} ({m.materialCodigo})
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-500 pointer-events-none"
          />
        </div>
      </div>

      {/* Métricas rápidas del material seleccionado */}
      {material && (
        <div className="px-5 py-3 border-b dark:border-white/[0.05] border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total proyectado",
              value: formatCant(material.totalProyectado, material.unidad),
              color: "dark:text-slate-300 text-slate-700",
            },
            {
              label: "Instalado",
              value: formatCant(
                material.puntos[material.puntos.length - 1]?.cantidadAcumulada ?? 0,
                material.unidad
              ),
              color: "text-emerald-500",
            },
            {
              label: "% consumido",
              value: `${pctConsumido.toFixed(1)}%`,
              color:
                pctConsumido > 100
                  ? "text-red-500"
                  : pctConsumido > 80
                  ? "text-amber-500"
                  : "text-emerald-500",
            },
            {
              label: "Días con actividad",
              value: `${material.puntos.length} días`,
              color: "dark:text-slate-300 text-slate-700",
            },
          ].map((kpi) => (
            <div key={kpi.label}>
              <p className="text-[10px] dark:text-slate-500 text-slate-400">{kpi.label}</p>
              <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico */}
      <div className="px-2 py-4 grafico-print-block" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="4 3"
              stroke="rgba(148,163,184,0.22)"
            />
            {/* Eje X — visible en pantalla e impresión */}
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              interval="preserveStartEnd"
            />
            {/* Eje Y — con unidades */}
            <YAxis
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(Math.round(v)))}
            />
            <Tooltip
              content={
                <CustomTooltip unidad={material?.unidad ?? ""} />
              }
            />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              formatter={(value) => {
                if (value === "acumulado")  return <span style={{ fontWeight: 700, color: C_ACUMULADO  }}>■ Acumulado real</span>;
                if (value === "proyeccion") return <span style={{ fontWeight: 700, color: C_PROYECCION }}>■ Proyección (ritmo actual)</span>;
                if (value === "diaria")     return <span style={{ fontWeight: 700, color: C_DIARIA     }}>■ Instalado por día</span>;
                return value;
              }}
            />

            {/* Línea de referencia: total proyectado */}
            {material && (
              <ReferenceLine
                y={material.totalProyectado}
                stroke={C_OBJETIVO}
                strokeDasharray="7 4"
                strokeWidth={2}
                className="ref-line-objetivo"
                label={{
                  value: `Objetivo: ${formatCant(material.totalProyectado, material.unidad)}`,
                  position: "insideTopRight",
                  fontSize: 10,
                  fontWeight: 700,
                  fill: C_OBJETIVO,
                }}
              />
            )}

            {/* Instalado por día — línea punteada delgada */}
            <Line
              type="monotone"
              dataKey="diaria"
              stroke={C_DIARIA}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="2 5"
              name="diaria"
              className="line-diaria"
            />

            {/* Acumulado real — línea sólida principal */}
            <Line
              type="monotone"
              dataKey="acumulado"
              stroke={C_ACUMULADO}
              strokeWidth={2.5}
              dot={{ r: 4, fill: C_ACUMULADO, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: C_ACUMULADO }}
              name="acumulado"
              connectNulls={false}
              className="line-real"
            />

            {/* Proyección — punteada, color claramente diferente */}
            <Line
              type="monotone"
              dataKey="proyeccion"
              stroke={C_PROYECCION}
              strokeWidth={2.5}
              strokeDasharray="7 4"
              dot={false}
              name="proyeccion"
              connectNulls={false}
              className="line-proyeccion"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda de lectura */}
      <div className="px-5 pb-4 flex flex-wrap gap-3 text-[11px] dark:text-slate-500 text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-indigo-500" /> Acumulado real
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 border-t-2 border-dashed border-violet-400" /> Proyección
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 border-t border-dashed border-indigo-400" /> Objetivo proyectado
        </span>
      </div>
    </div>
  );
}
