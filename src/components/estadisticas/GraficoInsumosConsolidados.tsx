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
import type { InsumoConsolidadoItem } from "@/app/estadisticas/actions";
import { AlertTriangle, CheckCircle2, Layers } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PALETA — 4 colores sólidos, alta diferenciación en pantalla y en
// impresión (los @media print del globals.css los sobreescriben con
// versiones más oscuras todavía)
// ─────────────────────────────────────────────────────────────

const C_PROYECTADO = "#4f46e5"; // Indigo 600 — Proyectado
const C_UTILIZADO  = "#16a34a"; // Green 600  — Utilizado
const C_BODEGA     = "#ca8a04"; // Yellow 600 — En bodega
const C_ADQUIRIR   = "#9333ea"; // Purple 600 — Por adquirir

const LEGENDS = [
  { key: "cantidadProyectada", label: "Proyectado",  color: C_PROYECTADO },
  { key: "cantidadUtilizada",  label: "Utilizado",   color: C_UTILIZADO },
  { key: "cantidadEnBodega",   label: "En bodega",   color: C_BODEGA },
  { key: "cantidadPorAdquirir",label: "Por adquirir",color: C_ADQUIRIR },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatCant(n: number, unidad: string): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} ${unidad}`;
}

function formatGs(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `Gs ${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `Gs ${(value / 1_000).toFixed(0)}K`;
  return `Gs ${value.toFixed(0)}`;
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP PERSONALIZADO
// ─────────────────────────────────────────────────────────────

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
  payload: InsumoConsolidadoItem & { labelMap: Record<string, string> };
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
  const d = payload[0].payload;

  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-3 text-xs min-w-[220px] space-y-1">
      <p className="font-semibold dark:text-slate-100 text-slate-800 mb-2">
        {label} <span className="font-mono text-slate-400">({d.materialCodigo})</span>
      </p>
      {[
        { key: "cantidadProyectada", label: "Proyectado",   color: C_PROYECTADO },
        { key: "cantidadUtilizada",  label: "Utilizado",    color: C_UTILIZADO },
        { key: "cantidadEnBodega",   label: "En bodega",    color: C_BODEGA },
        { key: "cantidadPorAdquirir",label: "Por adquirir", color: C_ADQUIRIR },
      ].map(({ key, label: lbl, color }) => (
        <div key={key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {lbl}
          </span>
          <span className="font-mono font-semibold dark:text-slate-200 text-slate-700">
            {formatCant((d as unknown as Record<string, number>)[key], d.unidad)}
          </span>
        </div>
      ))}
      <div className="border-t dark:border-white/[0.06] border-slate-100 pt-2 mt-2 space-y-0.5">
        <div className="flex justify-between text-slate-400">
          <span>Costo proyectado</span>
          <span className="font-mono">{formatGs(d.costoProyectado)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Costo ejecutado</span>
          <span className="font-mono">{formatGs(d.costoEjecutado)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="dark:text-slate-300 text-slate-700">% utilizado</span>
          <span
            style={{
              color:
                d.pctUtilizado > 100 ? "#dc2626" : d.pctUtilizado > 80 ? "#ca8a04" : C_UTILIZADO,
            }}
          >
            {d.pctUtilizado.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BADGE DE ALERTA
// ─────────────────────────────────────────────────────────────

function AlertaBadge({ item }: { item: InsumoConsolidadoItem }) {
  if (item.cantidadEnBodega === 0 && item.cantidadPorAdquirir > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
        <AlertTriangle size={9} />
        Sin stock – compra urgente
      </span>
    );
  }
  if (item.cantidadPorAdquirir <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
        <CheckCircle2 size={9} />
        Cubierto
      </span>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface GraficoInsumosConsolidadosProps {
  items: InsumoConsolidadoItem[];
}

interface GraficoInsumosConsolidadosProps {
  items: InsumoConsolidadoItem[];
}

export function GraficoInsumosConsolidados({ items }: GraficoInsumosConsolidadosProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-8 text-center">
        <Layers size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
        <p className="text-sm dark:text-slate-400 text-slate-500">
          Aún no hay recepciones de bodega ni instalaciones as-built registradas.
        </p>
      </div>
    );
  }

  // Altura dinámica según cantidad de materiales
  const chartHeight = Math.max(240, items.length * 70);

  // Datos con etiquetas pre-calculadas para LabelList (formatter solo recibe el valor)
  const chartItems = items.map((item) => ({
    ...item,
    labelProyectado: item.cantidadProyectada > 0
      ? formatCant(item.cantidadProyectada, item.unidad)
      : "",
    labelUtilizado: item.cantidadUtilizada > 0
      ? `${item.pctUtilizado.toFixed(1)}%`
      : "",
    labelBodega: item.cantidadEnBodega > 0
      ? formatCant(item.cantidadEnBodega, item.unidad)
      : "",
    labelAdquirir: item.cantidadPorAdquirir > 0
      ? formatCant(item.cantidadPorAdquirir, item.unidad)
      : "",
  }));

  // Alertas consolidadas
  const sinStock = items.filter((i) => i.cantidadEnBodega === 0 && i.cantidadPorAdquirir > 0);
  const cubiertos = items.filter((i) => i.cantidadPorAdquirir <= 0);

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-white/[0.05] border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
            <Layers size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Insumos Consolidados
            </h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              {items.length} materiales · total de obra
            </p>
          </div>
        </div>

        {/* Badges de resumen */}
        <div className="flex items-center gap-2 flex-wrap">
          {sinStock.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20">
              <AlertTriangle size={11} />
              {sinStock.length} material{sinStock.length > 1 ? "es" : ""} sin stock
            </span>
          )}
          {cubiertos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 size={11} />
              {cubiertos.length} cubierto{cubiertos.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div className="px-2 py-4 grafico-print-block" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartItems}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            barGap={3}
            barCategoryGap="22%"
          >
            <CartesianGrid
              strokeDasharray="4 3"
              horizontal={false}
              stroke="rgba(148,163,184,0.2)"
            />
            {/* Eje X con valores — visible en pantalla e impresión */}
            <XAxis
              type="number"
              domain={[0, "dataMax"]}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(Math.round(v))
              }
            />
            <YAxis
              type="category"
              dataKey="materialNombre"
              width={155}
              tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              tickLine={{ stroke: "#94a3b8" }}
              axisLine={{ stroke: "#94a3b8", strokeWidth: 1.5 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
            <Legend
              verticalAlign="top"
              iconType="square"
              formatter={(value) => {
                const leg = LEGENDS.find((l) => l.key === value);
                return (
                  <span style={{ fontSize: 11, fontWeight: 700, color: leg?.color }}>
                    ■ {leg?.label ?? value}
                  </span>
                );
              }}
              wrapperStyle={{ paddingBottom: 10 }}
            />

            {/* 1 — Proyectado */}
            <Bar dataKey="cantidadProyectada" name="cantidadProyectada" className="bar-proyectado" fill={C_PROYECTADO} fillOpacity={0.25} stroke={C_PROYECTADO} strokeWidth={1.5} radius={[0, 3, 3, 0]}>
              <LabelList
                dataKey="labelProyectado"
                position="insideRight"
                style={{ fontSize: 8, fontWeight: 700, fill: C_PROYECTADO }}
              />
            </Bar>

            {/* 2 — Utilizado */}
            <Bar dataKey="cantidadUtilizada" name="cantidadUtilizada" className="bar-utilizado" fill={C_UTILIZADO} stroke={C_UTILIZADO} strokeWidth={1} radius={[0, 3, 3, 0]}>
              <LabelList
                dataKey="labelUtilizado"
                position="insideRight"
                style={{ fontSize: 8, fontWeight: 700, fill: "#ffffff" }}
              />
            </Bar>

            {/* 3 — En bodega */}
            <Bar dataKey="cantidadEnBodega" name="cantidadEnBodega" className="bar-bodega" fill={C_BODEGA} stroke={C_BODEGA} strokeWidth={1} radius={[0, 3, 3, 0]}>
              <LabelList
                dataKey="labelBodega"
                position="insideRight"
                style={{ fontSize: 8, fontWeight: 700, fill: "#ffffff" }}
              />
            </Bar>

            {/* 4 — Por adquirir */}
            <Bar dataKey="cantidadPorAdquirir" name="cantidadPorAdquirir" className="bar-adquirir" fill={C_ADQUIRIR} stroke={C_ADQUIRIR} strokeWidth={1} radius={[0, 3, 3, 0]}>
              <LabelList
                dataKey="labelAdquirir"
                position="insideRight"
                style={{ fontSize: 8, fontWeight: 700, fill: "#ffffff" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de alertas por material */}
      <div className="border-t dark:border-white/[0.05] border-slate-100 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="dark:bg-slate-800/40 bg-slate-50">
              <th className="text-left py-2.5 px-4 dark:text-slate-400 text-slate-500 font-medium">Material</th>
              <th className="text-right py-2.5 px-3 dark:text-slate-400 text-slate-500 font-medium">Proyectado</th>
              <th className="text-right py-2.5 px-3 dark:text-slate-400 text-slate-500 font-medium">Utilizado</th>
              <th className="text-right py-2.5 px-3 dark:text-slate-400 text-slate-500 font-medium">Bodega</th>
              <th className="text-right py-2.5 px-3 dark:text-slate-400 text-slate-500 font-medium">Por adquirir</th>
              <th className="text-center py-2.5 px-3 dark:text-slate-400 text-slate-500 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.materialId}
                className="border-t dark:border-white/[0.04] border-slate-50"
              >
                <td className="py-2.5 px-4 dark:text-slate-300 text-slate-700 font-medium">
                  <span>{item.materialNombre}</span>
                  <span className="ml-2 text-[10px] font-mono dark:text-slate-600 text-slate-400">
                    {item.materialCodigo}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono dark:text-slate-400 text-slate-500">
                  {formatCant(item.cantidadProyectada, item.unidad)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  <span
                    style={{
                      color:
                        item.pctUtilizado > 100
                          ? "#ef4444"
                          : item.pctUtilizado > 80
                          ? "#f59e0b"
                          : "#10b981",
                    }}
                  >
                    {formatCant(item.cantidadUtilizada, item.unidad)}{" "}
                    <span className="text-[10px]">({item.pctUtilizado.toFixed(0)}%)</span>
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono dark:text-slate-400 text-slate-500">
                  {formatCant(item.cantidadEnBodega, item.unidad)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono dark:text-slate-400 text-slate-500">
                  {item.cantidadPorAdquirir > 0 ? (
                    <span className="text-indigo-400">
                      {formatCant(item.cantidadPorAdquirir, item.unidad)}
                    </span>
                  ) : (
                    <span className="text-emerald-500">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <AlertaBadge item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
