"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { RubroConInsumos } from "@/app/estadisticas/actions";
import { ChevronDown, ChevronRight, Package } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA — colores diferenciados en pantalla y de ALTO CONTRASTE
// en impresión (los @media print del globals.css los sobreescriben
// con versiones oscuras sólidas)
// ─────────────────────────────────────────────────────────────

// Pantalla
const COLOR_PROYECTADO_SCREEN = "#6366f1"; // indigo
const COLOR_UTILIZADO_OK      = "#16a34a"; // verde
const COLOR_UTILIZADO_ALERTA  = "#d97706"; // ámbar
const COLOR_UTILIZADO_SOBRE   = "#dc2626"; // rojo

function colorBarra(pct: number): string {
  if (pct > 100) return COLOR_UTILIZADO_SOBRE;
  if (pct > 80)  return COLOR_UTILIZADO_ALERTA;
  return COLOR_UTILIZADO_OK;
}

function formatCant(n: number, unidad: string): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} ${unidad}`;
}

function formatGs(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP PERSONALIZADO
// ─────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    unidad: string;
    cantidadProyectada: number;
    cantidadUtilizada: number;
    pctUtilizado: number;
  };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold dark:text-slate-100 text-slate-800">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Proyectado</span>
        <span className="font-mono font-semibold dark:text-slate-200 text-slate-700">
          100% | {formatCant(d.cantidadProyectada, d.unidad)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="dark:text-slate-400 text-slate-500">Utilizado</span>
        <span
          className="font-mono font-semibold"
          style={{ color: colorBarra(d.pctUtilizado) }}
        >
          {d.pctUtilizado.toFixed(1)}% | {formatCant(d.cantidadUtilizada, d.unidad)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BLOQUE DE UN RUBRO
// ─────────────────────────────────────────────────────────────

function RubroBloque({ rubro }: { rubro: RubroConInsumos }) {
  const [expandido, setExpandido] = useState(true);

  // Datos para el BarChart: una entrada por insumo
  const chartData = rubro.insumos.map((ins) => ({
    name: ins.nombre,
    unidad: ins.unidad,
    proyectado: ins.cantidadProyectada,
    utilizado: ins.cantidadUtilizada,
    cantidadProyectada: ins.cantidadProyectada,
    cantidadUtilizada: ins.cantidadUtilizada,
    pctUtilizado: ins.pctUtilizado,
    costoProyectado: ins.costoProyectado,
    costoEjecutado: ins.costoEjecutado,
    pctCosto: ins.pctCosto,
    // Etiquetas pre-calculadas para LabelList (formatter solo recibe el valor)
    labelProyectado: ins.cantidadProyectada > 0
      ? `100% · ${formatCant(ins.cantidadProyectada, ins.unidad)}`
      : "",
    labelUtilizadoInner: ins.cantidadUtilizada > 0
      ? `${ins.pctUtilizado.toFixed(1)}% · ${formatCant(ins.cantidadUtilizada, ins.unidad)}`
      : "",
    labelUtilizadoOuter: ins.pctUtilizado < 25
      ? `${ins.pctUtilizado.toFixed(1)}%`
      : "",
  }));

  const pctCostoGlobal =
    rubro.totalCostoProyectado > 0
      ? (rubro.totalCostoEjecutado / rubro.totalCostoProyectado) * 100
      : 0;

  const colorHeader =
    pctCostoGlobal > 100
      ? "text-red-500"
      : pctCostoGlobal > 80
      ? "text-amber-500"
      : "text-emerald-500";

  // Alto del gráfico adaptado a cantidad de insumos
  const chartHeight = Math.max(180, rubro.insumos.length * 56);

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header del rubro */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:dark:bg-slate-800/60 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Package size={15} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded dark:bg-indigo-500/10 bg-indigo-50 dark:text-indigo-400 text-indigo-700 border dark:border-indigo-500/20 border-indigo-200">
                {rubro.rubroCodigo}
              </span>
              {rubro.categoriaRubro && (
                <span className="text-[10px] dark:text-slate-500 text-slate-400">
                  {rubro.categoriaRubro}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold dark:text-slate-100 text-slate-800 mt-0.5 truncate">
              {rubro.rubroNombre}
            </p>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Cómputo: {rubro.cantidad} {rubro.unidad}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-4">
          {/* Resumen de costos */}
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[11px] dark:text-slate-500 text-slate-400">Costo ejecutado</span>
            <span className={`text-sm font-bold ${colorHeader}`}>
              Gs {formatGs(rubro.totalCostoEjecutado)} / {pctCostoGlobal.toFixed(1)}%
            </span>
            <span className="text-[11px] dark:text-slate-500 text-slate-400">
              de Gs {formatGs(rubro.totalCostoProyectado)} presup.
            </span>
          </div>
          {expandido ? (
            <ChevronDown size={16} className="dark:text-slate-400 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight size={16} className="dark:text-slate-400 text-slate-500 shrink-0" />
          )}
        </div>
      </button>

      {/* Contenido expandible */}
      {expandido && (
        <div className="px-5 pb-5 space-y-5 border-t dark:border-white/[0.05] border-slate-100">
          {rubro.insumos.length === 0 ? (
            <p className="text-sm dark:text-slate-500 text-slate-400 py-4 text-center">
              Sin insumos de materiales registrados en este rubro.
            </p>
          ) : (
            <>
              {/* Gráfico de barras */}
              <div className="mt-4" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 80, left: 16, bottom: 0 }}
                    barGap={4}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid
                      strokeDasharray="4 3"
                      horizontal={false}
                      stroke="rgba(148,163,184,0.22)"
                    />
                    {/* Eje X con valores numéricos visibles — crítico en impresión */}
                    <XAxis
                      type="number"
                      domain={[0, "dataMax"]}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickLine={{ stroke: "#94a3b8" }}
                      axisLine={{ stroke: "#94a3b8" }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(Math.round(v))
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={165}
                      tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                      tickLine={{ stroke: "#94a3b8" }}
                      axisLine={{ stroke: "#94a3b8" }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                    <Legend
                      verticalAlign="top"
                      iconType="square"
                      formatter={(value) =>
                        value === "proyectado" ? "■ Proyectado (100%)" : "■ Utilizado"
                      }
                      wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingBottom: 10 }}
                    />

                    {/* Barra Proyectado — referencia fija al 100% */}
                    <Bar
                      dataKey="proyectado"
                      name="proyectado"
                      className="bar-proyectado"
                      radius={[0, 4, 4, 0]}
                      fill={COLOR_PROYECTADO_SCREEN}
                      fillOpacity={0.22}
                      stroke={COLOR_PROYECTADO_SCREEN}
                      strokeWidth={1.5}
                    >
                      {/* Etiqueta interior: cantidad y 100% */}
                      <LabelList
                        dataKey="labelProyectado"
                        position="insideRight"
                        style={{ fontSize: 9, fontWeight: 700, fill: COLOR_PROYECTADO_SCREEN }}
                      />
                    </Bar>

                    {/* Barra Utilizado — color semáforo por celda */}
                    <Bar
                      dataKey="utilizado"
                      name="utilizado"
                      className="bar-utilizado"
                      radius={[0, 4, 4, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colorBarra(entry.pctUtilizado)} />
                      ))}
                      {/* Etiqueta: % y cantidad */}
                      <LabelList
                        dataKey="labelUtilizadoInner"
                        position="insideRight"
                        style={{ fontSize: 9, fontWeight: 700, fill: "#ffffff" }}
                      />
                      {/* Etiqueta exterior cuando la barra es muy corta */}
                      <LabelList
                        dataKey="labelUtilizadoOuter"
                        position="right"
                        style={{ fontSize: 9, fontWeight: 600, fill: "#475569" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla resumen de costos */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b dark:border-white/[0.06] border-slate-100">
                      <th className="text-left py-2 pr-4 dark:text-slate-500 text-slate-400 font-medium">Insumo</th>
                      <th className="text-right py-2 px-3 dark:text-slate-500 text-slate-400 font-medium">Costo proyectado</th>
                      <th className="text-right py-2 px-3 dark:text-slate-500 text-slate-400 font-medium">Costo ejecutado</th>
                      <th className="text-right py-2 pl-3 dark:text-slate-500 text-slate-400 font-medium">Δ Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubro.insumos.map((ins) => {
                      const delta = ins.costoProyectado - ins.costoEjecutado;
                      const deltaPositivo = delta >= 0;
                      return (
                        <tr
                          key={ins.nombre}
                          className="border-b dark:border-white/[0.04] border-slate-50"
                        >
                          <td className="py-2 pr-4 dark:text-slate-300 text-slate-700 font-medium">
                            {ins.nombre}
                          </td>
                          <td className="py-2 px-3 text-right font-mono dark:text-slate-400 text-slate-500">
                            Gs {formatGs(ins.costoProyectado)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono dark:text-slate-300 text-slate-700">
                            Gs {formatGs(ins.costoEjecutado)}
                          </td>
                          <td
                            className={`py-2 pl-3 text-right font-mono font-bold ${
                              deltaPositivo ? "text-emerald-500" : "text-red-500"
                            }`}
                          >
                            {deltaPositivo ? "−" : "+"}Gs {formatGs(Math.abs(delta))}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total del rubro */}
                    <tr className="dark:bg-slate-800/40 bg-slate-50">
                      <td className="py-2 pr-4 font-bold dark:text-slate-200 text-slate-800">
                        Total rubro
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold dark:text-slate-200 text-slate-800">
                        Gs {formatGs(rubro.totalCostoProyectado)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold dark:text-slate-200 text-slate-800">
                        Gs {formatGs(rubro.totalCostoEjecutado)}
                      </td>
                      <td
                        className={`py-2 pl-3 text-right font-mono font-bold ${
                          rubro.totalCostoProyectado >= rubro.totalCostoEjecutado
                            ? "text-emerald-500"
                            : "text-red-500"
                        }`}
                      >
                        {rubro.totalCostoProyectado >= rubro.totalCostoEjecutado ? "−" : "+"}Gs{" "}
                        {formatGs(Math.abs(rubro.totalCostoProyectado - rubro.totalCostoEjecutado))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL — lista de todos los rubros
// ─────────────────────────────────────────────────────────────

interface GraficoInsumosPorRubroProps {
  rubros: RubroConInsumos[];
}

export function GraficoInsumosPorRubro({ rubros }: GraficoInsumosPorRubroProps) {
  if (rubros.length === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <Package size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          No hay rubros con insumos registrados en este proyecto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt; 80% utilizado
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> 80–100%
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-red-500" /> &gt; 100%
        </span>
      </div>
      {rubros.map((rubro) => (
        <RubroBloque key={rubro.rubroId} rubro={rubro} />
      ))}
    </div>
  );
}
