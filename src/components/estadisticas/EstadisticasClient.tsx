"use client";

import { useState, useTransition } from "react";
import { BarChart3, ChevronDown, Loader2, Download, FileText } from "lucide-react";
import { KpiCards } from "./KpiCards";
import { GraficoInsumosPorRubro } from "./GraficoInsumosPorRubro";
import { GraficoInsumosConsolidados } from "./GraficoInsumosConsolidados";
import { GraficoTimeline } from "./GraficoTimeline";
import { GraficoCurvaS } from "./GraficoCurvaS";
import { GraficoFlujoCaja } from "./GraficoFlujoCaja";
import { GraficoManoObra } from "./GraficoManoObra";
import { GraficoPlanPagos } from "./GraficoPlanPagos";
import { GraficoCostosIndirectos } from "./GraficoCostosIndirectos";
import { GraficoBitacora } from "./GraficoBitacora";
import { GraficoHealthScore } from "./GraficoHealthScore";
import { GraficoParetoABC } from "./GraficoParetoABC";
import { GraficoProyeccionCierre } from "./GraficoProyeccionCierre";
import { ComparativoMultiProyecto } from "./ComparativoMultiProyecto";
import { HeatmapActividad } from "./HeatmapActividad";
import { getEmpresaConfig, openBrandedPrintWindow } from "@/lib/reportHeader";
import type { DashboardProyectoData } from "@/app/estadisticas/actions";

export type { DashboardProyectoData };

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "insumos-rubro",     label: "Insumos x Rubro"  },
  { id: "consolidado",       label: "Consolidado"       },
  { id: "timeline",         label: "Timeline"          },
  { id: "curva-s",          label: "Curva S"           },
  { id: "flujo-caja",       label: "Flujo de Caja"     },
  { id: "mano-obra",        label: "Mano de Obra"      },
  { id: "plan-pagos",       label: "Plan de Cobros"    },
  { id: "costos-indirectos",label: "Costos Indirectos" },
  { id: "bitacora",         label: "Bitácora"          },
  { id: "health-score",     label: "Salud del Proyecto" },
  { id: "pareto-abc",       label: "Pareto ABC"         },
  { id: "proyeccion-cierre", label: "Proyección de Cierre" },
  { id: "heatmap",           label: "Heatmap Actividad"  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─────────────────────────────────────────────────────────────
// BLOQUE DE UN PROYECTO
// ─────────────────────────────────────────────────────────────

function ProyectoDashboardBloque({ data }: { data: DashboardProyectoData }) {
  const [tab, setTab] = useState<TabId>("insumos-rubro");

  // ── Exportar CSV (insumos consolidados) ──────────────────────────
  function exportCSV() {
    const rows: string[][] = [
      ["Material", "Proyectado (u)", "Utilizado (u)", "En Bodega (u)", "% Utilizado", "Costo Proyectado (Gs.)", "Costo Ejecutado (Gs.)"],
    ];
    for (const item of data.insumosConsolidados) {
      rows.push([
        `"${item.materialNombre.replace(/"/g, '""')}"`,
        String(item.cantidadProyectada),
        String(item.cantidadUtilizada),
        String(item.cantidadEnBodega),
        item.pctUtilizado.toFixed(1),
        String(item.costoProyectado),
        String(item.costoEjecutado),
      ]);
    }
    // Flujo de caja
    rows.push([]);
    rows.push(["MES", "INGRESOS (Gs.)", "EGRESOS (Gs.)", "SALDO ACUMULADO (Gs.)"]);
    for (const f of data.flujoCaja) {
      rows.push([f.mes, String(f.ingresos), String(f.egresos), String(f.saldoAcumulado)]);
    }
    // Mano de obra
    rows.push([]);
    rows.push(["CUADRILLA", "DESCRIPCIÓN", "MONTO PACTADO (Gs.)", "PAGADO (Gs.)", "RETENCIÓN (Gs.)", "% PAGADO", "ESTADO"]);
    for (const c of data.manoObra.contratos) {
      rows.push([
        `"${(c.jefeCuadrilla ?? "").replace(/"/g, '""')}"`,
        `"${c.descripcion.replace(/"/g, '""')}"`,
        String(c.montoPactado),
        String(c.pagado),
        String(c.retencion),
        c.pctPagado.toFixed(1),
        c.estado,
      ]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estadisticas-${data.kpi.codigoProyecto}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Exportar PDF (imprimir todo el dashboard) ──────────────────
  function exportPDF() {
    const kpi = data.kpi;
    const empresa = getEmpresaConfig(data.proyectoId);

    function gs(n: number) {
      return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n);
    }

    const insumosRows = data.insumosConsolidados.map((item) => {
      const pct = item.pctUtilizado.toFixed(1);
      const color = item.pctUtilizado > 100 ? "#991b1b" : item.pctUtilizado > 75 ? "#92400e" : "#065f46";
      return "<tr><td>" + item.materialNombre + "</td><td style='text-align:right'>" + item.cantidadProyectada + "</td><td style='text-align:right'>" + item.cantidadUtilizada + "</td><td style='text-align:right'>" + item.cantidadEnBodega + "</td><td style='text-align:right;font-weight:700;color:" + color + "'>" + pct + "%</td></tr>";
    }).join("");

    const flujoCajaRows = data.flujoCaja.map((f) => {
      const resultado = f.ingresos - f.egresos;
      const rColor = resultado >= 0 ? "#065f46" : "#991b1b";
      const sColor = f.saldoAcumulado >= 0 ? "#1d40ae" : "#c2410c";
      return "<tr><td>" + f.mes + "</td><td style='text-align:right;color:#065f46'>" + gs(f.ingresos) + "</td><td style='text-align:right;color:#991b1b'>" + gs(f.egresos) + "</td><td style='text-align:right;color:" + rColor + ";font-weight:600'>" + gs(resultado) + "</td><td style='text-align:right;color:" + sColor + ";font-weight:700'>" + gs(f.saldoAcumulado) + "</td></tr>";
    }).join("");

    const moRows = data.manoObra.contratos.map((c) => {
      const col = c.pctPagado >= 100 ? "#065f46" : c.pctPagado >= 60 ? "#92400e" : "#1d40ae";
      return "<tr><td>" + (c.jefeCuadrilla ?? "—") + "</td><td>" + c.descripcion + "</td><td style='text-align:right'>" + gs(c.montoPactado) + "</td><td style='text-align:right;color:#065f46'>" + gs(c.pagado) + "</td><td style='text-align:right;color:#92400e'>" + gs(c.retencion) + "</td><td style='text-align:right;color:" + col + ";font-weight:700'>" + c.pctPagado.toFixed(1) + "%</td><td>" + c.estado + "</td></tr>";
    }).join("");

    const indirectosRows = data.costosIndirectos.map((c) =>
      "<tr><td>" + c.label + "</td><td style='text-align:right;font-weight:600'>" + gs(c.total) + "</td><td style='text-align:center'>" + c.cantidad + "</td></tr>"
    ).join("");

    const bodyContent =
      "<div class='kpis'>" +
        "<div class='kpi'><div class='label'>Estado</div><div class='value' style='color:#374151'>" + kpi.estado.replace(/_/g, " ") + "</div></div>" +
        "<div class='kpi'><div class='label'>Avance Real</div><div class='value' style='color:#1d40ae'>" + kpi.avancePct.toFixed(1) + "%</div></div>" +
        "<div class='kpi'><div class='label'>Gasto Real</div><div class='value' style='color:#991b1b'>" + gs(kpi.gastoReal) + "</div></div>" +
        "<div class='kpi'><div class='label'>Saldo Disponible</div><div class='value' style='color:#065f46'>" + gs(kpi.saldoDisponible) + "</div></div>" +
        (kpi.presupuestoTotal > 0 ? "<div class='kpi'><div class='label'>Presupuesto Total</div><div class='value' style='color:#374151'>" + gs(kpi.presupuestoTotal) + "</div></div>" : "") +
      "</div>" +
      (insumosRows ? "<h2>Insumos Consolidados</h2><table><thead><tr><th>Material</th><th style='text-align:right'>Proyectado</th><th style='text-align:right'>Utilizado</th><th style='text-align:right'>Bodega</th><th style='text-align:right'>% Uso</th></tr></thead><tbody>" + insumosRows + "</tbody></table>" : "") +
      (flujoCajaRows ? "<h2>Flujo de Caja Mensual</h2><table><thead><tr><th>Mes</th><th style='text-align:right'>Ingresos</th><th style='text-align:right'>Egresos</th><th style='text-align:right'>Resultado</th><th style='text-align:right'>Saldo Acum.</th></tr></thead><tbody>" + flujoCajaRows + "</tbody></table>" : "") +
      (moRows ? "<h2>Mano de Obra — Contratos</h2><table><thead><tr><th>Cuadrilla</th><th>Descripción</th><th style='text-align:right'>Pactado</th><th style='text-align:right'>Pagado</th><th style='text-align:right'>Retención</th><th style='text-align:right'>% Pag.</th><th>Estado</th></tr></thead><tbody>" + moRows + "</tbody></table>" : "") +
      (indirectosRows ? "<h2>Costos Indirectos</h2><table><thead><tr><th>Tipo</th><th style='text-align:right'>Total</th><th style='text-align:right'>Registros</th></tr></thead><tbody>" + indirectosRows + "</tbody></table>" : "");

    openBrandedPrintWindow(
      "Estadísticas — " + kpi.nombreProyecto,
      "ESTADÍSTICAS Y DASHBOARD",
      kpi.nombreProyecto + " · Cód: " + kpi.codigoProyecto,
      bodyContent,
      empresa,
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KpiCards data={data.kpi} />

      {/* Tabs de gráficos */}
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-stretch border-b dark:border-white/[0.06] border-slate-200">
          <div className="flex overflow-x-auto flex-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 px-5 py-3 text-xs font-semibold transition-colors ${
                  tab === t.id
                    ? "dark:text-indigo-400 text-indigo-600 border-b-2 border-indigo-500"
                    : "dark:text-slate-400 text-slate-500 hover:dark:text-slate-200 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 shrink-0">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border dark:border-slate-700 border-slate-300 text-xs font-semibold dark:text-slate-300 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Contenido del tab */}
        <div className="p-5">
          {tab === "insumos-rubro" && (
            <GraficoInsumosPorRubro rubros={data.insumosPorRubro} />
          )}
          {tab === "consolidado" && (
            <GraficoInsumosConsolidados items={data.insumosConsolidados} />
          )}
          {tab === "timeline" && (
            <GraficoTimeline materiales={data.timeline} />
          )}
          {tab === "curva-s" && (
            <GraficoCurvaS data={data.curvaS} />
          )}
          {tab === "flujo-caja" && (
            <GraficoFlujoCaja datos={data.flujoCaja} />
          )}
          {tab === "mano-obra" && (
            <GraficoManoObra stats={data.manoObra} />
          )}
          {tab === "plan-pagos" && (
            <GraficoPlanPagos data={data.planPagos} />
          )}
          {tab === "costos-indirectos" && (
            <GraficoCostosIndirectos data={data.costosIndirectos} />
          )}
          {tab === "bitacora" && (
            <GraficoBitacora stats={data.bitacora} />
          )}
          {tab === "health-score" && (
            <GraficoHealthScore data={data} />
          )}
          {tab === "pareto-abc" && (
            <GraficoParetoABC data={data} />
          )}
          {tab === "proyeccion-cierre" && (
            <GraficoProyeccionCierre data={data} />
          )}
          {tab === "heatmap" && (
            <HeatmapActividad data={data} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL — Dashboard global con selector
// ─────────────────────────────────────────────────────────────

interface ProyectoOpcion {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
}

interface EstadisticasClientProps {
  /** Datos pre-cargados del primer proyecto (o del proyecto fijo en modo por-proyecto) */
  proyectosOpciones: ProyectoOpcion[];
  /** Si viene de /proyectos/[id]/estadisticas, el proyectoId ya está fijo */
  proyectoIdFijo?: string;
  datosIniciales: DashboardProyectoData[];
  fetchData: (proyectoId: string) => Promise<DashboardProyectoData>;
}

export function EstadisticasClient({
  proyectosOpciones,
  proyectoIdFijo,
  datosIniciales,
  fetchData,
}: EstadisticasClientProps) {
  const [seleccionados, setSeleccionados] = useState<string[]>(
    datosIniciales.map((d) => d.proyectoId)
  );
  const [datos, setDatos] = useState<DashboardProyectoData[]>(datosIniciales);
  const [isPending, startTransition] = useTransition();
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  const modoFijo = !!proyectoIdFijo;

  function toggleProyecto(id: string) {
    startTransition(async () => {
      if (seleccionados.includes(id)) {
        if (seleccionados.length === 1) return; // Mínimo 1
        setSeleccionados((prev) => prev.filter((x) => x !== id));
        setDatos((prev) => prev.filter((d) => d.proyectoId !== id));
      } else {
        setSeleccionados((prev) => [...prev, id]);
        const nuevoDato = await fetchData(id);
        setDatos((prev) => [...prev, nuevoDato]);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Header del módulo */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-slate-100 text-slate-800">
              Estadísticas y Dashboard
            </h1>
            <p className="text-xs dark:text-slate-500 text-slate-400">
              {modoFijo
                ? datos[0]?.kpi.nombreProyecto
                : `${seleccionados.length} proyecto${seleccionados.length > 1 ? "s" : ""} seleccionado${seleccionados.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Selector multi-proyecto — solo en modo global */}
        {!modoFijo && (
          <div className="relative">
            <button
              onClick={() => setDropdownAbierto((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl dark:bg-slate-800 bg-slate-100 dark:border-white/[0.08] border-slate-200 border dark:text-slate-200 text-slate-700 hover:dark:bg-slate-700 hover:bg-slate-200 transition-colors"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              Proyectos seleccionados ({seleccionados.length})
              <ChevronDown size={12} />
            </button>

            {dropdownAbierto && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownAbierto(false)}
                />
                {/* Menú */}
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-slate-900 bg-white shadow-2xl overflow-hidden">
                  <div className="p-2 space-y-0.5 max-h-80 overflow-y-auto">
                    {proyectosOpciones.map((p) => {
                      const activo = seleccionados.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleProyecto(p.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            activo
                              ? "dark:bg-indigo-500/10 bg-indigo-50 dark:text-indigo-300 text-indigo-700"
                              : "hover:dark:bg-slate-800 hover:bg-slate-50 dark:text-slate-300 text-slate-700"
                          }`}
                        >
                          <span
                            className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center text-white ${
                              activo
                                ? "border-indigo-500 bg-indigo-500"
                                : "border-slate-400 bg-transparent"
                            }`}
                          >
                            {activo && (
                              <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-current">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{p.nombre}</p>
                            <p className="text-[10px] dark:text-slate-500 text-slate-400">
                              {p.codigo} · {p.estado.replace(/_/g, " ")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Separador si hay múltiples proyectos */}
      {datos.length === 0 ? (
        <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-12 text-center">
          <BarChart3 size={36} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
          <p className="text-sm dark:text-slate-400 text-slate-500">
            Seleccioná al menos un proyecto para ver las estadísticas.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Comparativo multi-proyecto — visible solo cuando hay 2+ proyectos */}
          {datos.length >= 2 && <ComparativoMultiProyecto datos={datos} />}

          {datos.map((d) => (
            <div key={d.proyectoId}>
              {/* Separador de proyecto si hay más de uno */}
              {!modoFijo && datos.length > 1 && (
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-md dark:bg-indigo-500/10 bg-indigo-50 dark:text-indigo-400 text-indigo-700 border dark:border-indigo-500/20 border-indigo-200">
                    {d.kpi.codigoProyecto}
                  </span>
                  <h2 className="text-base font-bold dark:text-slate-200 text-slate-800">
                    {d.kpi.nombreProyecto}
                  </h2>
                  <div className="flex-1 h-px dark:bg-white/[0.06] bg-slate-200" />
                </div>
              )}
              <ProyectoDashboardBloque data={d} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
