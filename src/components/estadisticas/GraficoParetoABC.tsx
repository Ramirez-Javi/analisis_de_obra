"use client";

import { useState, useMemo } from "react";
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
  Cell,
} from "recharts";
import type { DashboardProyectoData } from "@/app/estadisticas/actions";

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const MAX_ITEMS = 30; // limitar para legibilidad

const COLOR_A = "#4f46e5"; // Indigo  — clase A (vital)
const COLOR_B = "#f59e0b"; // Amber   — clase B (importantes)
const COLOR_C = "#94a3b8"; // Slate   — clase C (triviales)
const COLOR_LINE = "#ef4444"; // Red — línea acumulada

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

type Vista = "rubro" | "material";
type Metrica = "proyectado" | "ejecutado";
type Clase = "A" | "B" | "C";

interface ParetoItem {
  nombre: string;     // etiqueta corta (eje X)
  nombreFull: string; // nombre completo (tooltip)
  costo: number;
  pctIndividual: number;
  pctAcumulado: number;
  clase: Clase;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtGs(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n.toFixed(0)}`;
}

function fmtGsFull(n: number): string {
  return "Gs " + n.toLocaleString("es-PY");
}

function truncar(s: string, max = 14): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function calcularPareto(
  data: DashboardProyectoData,
  vista: Vista,
  metrica: Metrica,
): ParetoItem[] {
  // Construir array de { nombre, costo }
  const raw: { nombre: string; costo: number }[] =
    vista === "rubro"
      ? data.insumosPorRubro.map((r) => ({
          nombre: r.rubroNombre,
          costo:
            metrica === "proyectado"
              ? r.totalCostoProyectado
              : r.totalCostoEjecutado,
        }))
      : data.insumosConsolidados.map((i) => ({
          nombre: i.materialNombre,
          costo:
            metrica === "proyectado" ? i.costoProyectado : i.costoEjecutado,
        }));

  // Filtrar costo > 0 y ordenar descendente
  const sorted = raw
    .filter((x) => x.costo > 0)
    .sort((a, b) => b.costo - a.costo)
    .slice(0, MAX_ITEMS);

  const total = sorted.reduce((s, x) => s + x.costo, 0);
  if (total === 0) return [];

  let acumulado = 0;
  return sorted.map((x) => {
    const pctInd = (x.costo / total) * 100;
    acumulado += pctInd;
    const clase: Clase = acumulado <= 80 ? "A" : acumulado <= 95 ? "B" : "C";
    return {
      nombre: truncar(x.nombre),
      nombreFull: x.nombre,
      costo: x.costo,
      pctIndividual: pctInd,
      pctAcumulado: +acumulado.toFixed(1),
      clase,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: ParetoItem }[];
  label?: string;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const colorClase: Record<Clase, string> = {
    A: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30",
    B: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    C: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-xl px-4 py-3 text-sm max-w-xs">
      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2 leading-snug">
        {item.nombreFull}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Costo</span>
          <span className="font-mono font-medium text-slate-800 dark:text-slate-100">
            {fmtGsFull(item.costo)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">% del total</span>
          <span className="font-mono font-medium text-slate-800 dark:text-slate-100">
            {item.pctIndividual.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">% acumulado</span>
          <span className="font-mono font-medium text-slate-800 dark:text-slate-100">
            {item.pctAcumulado.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 dark:border-white/10">
          <span className="text-slate-500 dark:text-slate-400">Clase ABC</span>
          <span className={`font-bold px-1.5 py-0.5 rounded-full ${colorClase[item.clase]}`}>
            Clase {item.clase}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function GraficoParetoABC({ data }: { data: DashboardProyectoData }) {
  const [vista, setVista] = useState<Vista>("rubro");
  const [metrica, setMetrica] = useState<Metrica>("proyectado");

  const items = useMemo(
    () => calcularPareto(data, vista, metrica),
    [data, vista, metrica],
  );

  // Resumen ABC
  const resumen = useMemo(() => {
    const total = items.reduce((s, i) => s + i.costo, 0);
    const claseTotales: Record<Clase, { count: number; costo: number }> = {
      A: { count: 0, costo: 0 },
      B: { count: 0, costo: 0 },
      C: { count: 0, costo: 0 },
    };
    for (const item of items) {
      claseTotales[item.clase].count++;
      claseTotales[item.clase].costo += item.costo;
    }
    return { total, claseTotales };
  }, [items]);

  const totalOriginal =
    vista === "rubro"
      ? data.insumosPorRubro.filter((r) =>
          metrica === "proyectado"
            ? r.totalCostoProyectado > 0
            : r.totalCostoEjecutado > 0,
        ).length
      : data.insumosConsolidados.filter((i) =>
          metrica === "proyectado" ? i.costoProyectado > 0 : i.costoEjecutado > 0,
        ).length;

  const truncado = totalOriginal > MAX_ITEMS;

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-sm">
        Sin datos de costos para mostrar el análisis Pareto.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Controles ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Vista */}
        <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-sm">
          {(["rubro", "material"] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                vista === v
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              Por {v === "rubro" ? "Rubro" : "Material"}
            </button>
          ))}
        </div>

        {/* Métrica */}
        <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-sm">
          {(["proyectado", "ejecutado"] as Metrica[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetrica(m)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                metrica === m
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {m === "proyectado" ? "Presupuestado" : "Ejecutado"}
            </button>
          ))}
        </div>

        {truncado && (
          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
            Mostrando top {MAX_ITEMS} de {totalOriginal} ítems
          </span>
        )}
      </div>

      {/* ── Cards resumen ABC ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {(["A", "B", "C"] as Clase[]).map((clase) => {
          const info = resumen.claseTotales[clase];
          const pctItems = items.length
            ? ((info.count / items.length) * 100).toFixed(0)
            : "0";
          const pctCosto = resumen.total
            ? ((info.costo / resumen.total) * 100).toFixed(1)
            : "0";
          const styles: Record<Clase, { border: string; bg: string; title: string; desc: string }> = {
            A: {
              border: "ring-indigo-400/30 dark:ring-indigo-500/20",
              bg: "bg-indigo-50 dark:bg-indigo-900/10",
              title: "text-indigo-700 dark:text-indigo-300",
              desc: "Pocos ítems, alto impacto",
            },
            B: {
              border: "ring-amber-400/30 dark:ring-amber-500/20",
              bg: "bg-amber-50 dark:bg-amber-900/10",
              title: "text-amber-700 dark:text-amber-300",
              desc: "Impacto medio",
            },
            C: {
              border: "ring-slate-300/30 dark:ring-slate-700/30",
              bg: "bg-slate-50 dark:bg-slate-800/40",
              title: "text-slate-600 dark:text-slate-300",
              desc: "Muchos ítems, bajo impacto",
            },
          };
          const s = styles[clase];
          return (
            <div
              key={clase}
              className={`rounded-xl ring-1 ${s.border} ${s.bg} p-3 flex flex-col gap-1`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xl font-black ${s.title}`}
                >
                  Clase {clase}
                </span>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${s.title} bg-white/50 dark:bg-white/5`}
                >
                  {pctItems}% ítems
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
              <div className="mt-1 space-y-0.5">
                <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Gs {fmtGs(info.costo)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pctCosto}% del costo total · {info.count} ítem(s)
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Gráfico ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
          Distribución de costos — Curva de Pareto
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart
            data={items}
            margin={{ top: 10, right: 40, bottom: 60, left: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700"
            />

            {/* Eje X — nombres */}
            <XAxis
              dataKey="nombre"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              angle={-40}
              textAnchor="end"
              interval={0}
              height={70}
            />

            {/* Eje Y izquierdo — costo */}
            <YAxis
              yAxisId="costo"
              orientation="left"
              tickFormatter={(v) => `${fmtGs(v)}`}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              width={52}
            />

            {/* Eje Y derecho — % acumulado */}
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              width={42}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: 8, fontSize: 11 }}
              formatter={(value) => (
                <span className="text-slate-600 dark:text-slate-300">{value}</span>
              )}
            />

            {/* Líneas de referencia — umbrales ABC */}
            <ReferenceLine
              yAxisId="pct"
              y={80}
              stroke={COLOR_A}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: "80% (A/B)",
                position: "insideTopRight",
                fontSize: 10,
                fill: COLOR_A,
              }}
            />
            <ReferenceLine
              yAxisId="pct"
              y={95}
              stroke={COLOR_B}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: "95% (B/C)",
                position: "insideTopRight",
                fontSize: 10,
                fill: COLOR_B,
              }}
            />

            {/* Barras por ítem — coloreadas por clase */}
            <Bar
              yAxisId="costo"
              dataKey="costo"
              name="Costo (Gs)"
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
            >
              {items.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.clase === "A"
                      ? COLOR_A
                      : entry.clase === "B"
                        ? COLOR_B
                        : COLOR_C
                  }
                  fillOpacity={0.85}
                />
              ))}
            </Bar>

            {/* Línea acumulada */}
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="pctAcumulado"
              name="% Acumulado"
              stroke={COLOR_LINE}
              strokeWidth={2}
              dot={{ r: 2, fill: COLOR_LINE }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Leyenda manual para clases ABC */}
        <div className="flex flex-wrap items-center gap-4 mt-1 justify-center">
          {(["A", "B", "C"] as Clase[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{
                  background: c === "A" ? COLOR_A : c === "B" ? COLOR_B : COLOR_C,
                }}
              />
              Clase {c}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span
              className="inline-block w-5 h-0.5"
              style={{ background: COLOR_LINE }}
            />
            % Acumulado
          </span>
        </div>
      </div>

      {/* ── Tabla de detalle top A ──────────────────────────── */}
      {resumen.claseTotales.A.count > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-800/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Clase A — Ítems críticos ({resumen.claseTotales.A.count} ítem{resumen.claseTotales.A.count > 1 ? "s" : ""} ·{" "}
              {((resumen.claseTotales.A.costo / resumen.total) * 100).toFixed(1)}% del presupuesto)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400">
                  <th className="text-left px-4 py-2 font-semibold">#</th>
                  <th className="text-left px-4 py-2 font-semibold">
                    {vista === "rubro" ? "Rubro" : "Material"}
                  </th>
                  <th className="text-right px-4 py-2 font-semibold">Costo</th>
                  <th className="text-right px-4 py-2 font-semibold">% Individual</th>
                  <th className="text-right px-4 py-2 font-semibold">% Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((i) => i.clase === "A")
                  .map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b last:border-0 border-slate-100 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-100 max-w-xs">
                        {item.nombreFull}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-800 dark:text-slate-100">
                        {fmtGsFull(item.costo)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-indigo-600 dark:text-indigo-400">
                        {item.pctIndividual.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-600 dark:text-slate-300">
                        {item.pctAcumulado.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Regla 80/20: los ítems Clase A concentran ~80% del costo con pocos elementos.
        Focalizar control en estos ítems maximiza el impacto de gestión.
      </p>
    </div>
  );
}
