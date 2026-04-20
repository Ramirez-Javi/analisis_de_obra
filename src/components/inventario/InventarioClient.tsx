"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  Package, Plus, Trash2, X, Save, MapPin, ClipboardList, Layers,
  Download, FileText, ChevronDown, ChevronUp, BarChart3,
  AlertTriangle, CheckCircle2, Eye, Printer, ShieldAlert, RefreshCw,
} from "lucide-react";
import {
  crearAmbiente, eliminarAmbiente,
  crearRecepcion, eliminarRecepcion,
  crearAsBuilt, eliminarAsBuilt,
  crearConteoFisico, getControlStock,
  type RecepcionData, type AsBuiltData, type FilaControlStock,
} from "@/app/proyectos/[id]/inventario/actions";
import { getEmpresaConfig, openBrandedPrintWindow } from "@/lib/reportHeader";
import { fmtFechaCorta as fmtFecha } from "@/lib/fmtFecha";
import { usePagination } from "@/lib/usePagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
// ─── Tipos (definidos localmente, sin importar desde @prisma/client) ─────────
type MaterialSelect = { id: string; codigo: string; nombre: string; unidadMedida: { simbolo: string } };
type ProveedorSelect = { id: string; razonSocial: string };

type AmbienteBase = { id: string; proyectoId: string; nombre: string; createdAt: Date; updatedAt: Date };
type AmbienteConCount = AmbienteBase & { _count: { asBuiltRegistros: number } };

type RecepcionBase = {
  id: string; proyectoId: string; materialId: string; proveedorId: string | null;
  cantidadRecibida: number; nroRemision: string | null;
  marca: string | null; modeloSKU: string | null; nroLote: string | null;
  especificacionTecnica: string | null; responsableReceptor: string | null;
  fechaRecepcion: Date; createdAt: Date; updatedAt: Date;
};
type RecepcionConDetalle = RecepcionBase & {
  material: MaterialSelect;
  proveedor: ProveedorSelect | null;
  _count: { asBuiltRegistros: number };
  asBuiltRegistros: { cantidadInstalada: number }[];
};

type AsBuiltBase = {
  id: string; ambienteId: string; recepcionId: string;
  cantidadInstalada: number; dosificacionOMezcla: string | null;
  mecanismoInstalacion: string | null; fechaInstalacion: Date;
  createdAt: Date; updatedAt: Date;
};
type AsBuiltConDetalle = AsBuiltBase & {
  recepcion: RecepcionBase & {
    material: MaterialSelect;
    proveedor: { razonSocial: string } | null;
  };
};

type AmbienteConAsBuilt = AmbienteBase & {
  asBuiltRegistros: AsBuiltConDetalle[];
};

interface Props {
  proyectoId: string;
  proyectoNombre: string;
  ambientes: AmbienteConCount[];
  recepciones: RecepcionConDetalle[];
  asBuiltPorAmbiente: AmbienteConAsBuilt[];
  materiales: MaterialSelect[];
  proveedores: ProveedorSelect[];
}

// ─── Helpers ──────────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40";
const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";



function calcStock(r: RecepcionConDetalle) {
  const salida = r.asBuiltRegistros.reduce((s, a) => s + a.cantidadInstalada, 0);
  return r.cantidadRecibida - salida;
}

// ─── Print helpers ────────────────────────────────────────────

function buildImpresionRecepcion(r: RecepcionConDetalle, proyectoNombre: string, proyectoId: string) {
  const empresa = getEmpresaConfig(proyectoId);
  const stock = calcStock(r);
  const filas = [
    ["Material", `${r.material.nombre} (${r.material.codigo})`],
    ["Unidad de Medida", r.material.unidadMedida.simbolo],
    ["Proveedor", r.proveedor?.razonSocial ?? "—"],
    ["N° Remisión", r.nroRemision ?? "—"],
    ["Responsable Receptor", r.responsableReceptor ?? "—"],
    ["Fecha de Recepción", fmtFecha(r.fechaRecepcion)],
    ["Cantidad Recibida", `${r.cantidadRecibida} ${r.material.unidadMedida.simbolo}`],
    ["Cantidad Instalada", `${(r.cantidadRecibida - stock).toFixed(2)} ${r.material.unidadMedida.simbolo}`],
    ["Stock Disponible", `${stock.toFixed(2)} ${r.material.unidadMedida.simbolo}`],
    ["Marca", r.marca ?? "—"],
    ["SKU / Modelo", r.modeloSKU ?? "—"],
    ["N° Lote", r.nroLote ?? "—"],
    ["Especificación Técnica", r.especificacionTecnica ?? "—"],
  ];

  const body =
    `<h2>Ficha de Recepción en Bodega</h2>` +
    `<table><tbody>` +
    filas.map(([k, v]) => `<tr><th style="width:35%;text-align:left">${k}</th><td>${v}</td></tr>`).join("") +
    `</tbody></table>`;

  openBrandedPrintWindow(
    `Recepción – ${r.material.nombre}`,
    `Recepción: ${r.material.nombre}`,
    `Proyecto: ${proyectoNombre}`,
    body,
    empresa,
  );
}

function buildImpresionAsBuilt(reg: AsBuiltConDetalle, ambienteNombre: string, proyectoNombre: string, proyectoId: string) {
  const empresa = getEmpresaConfig(proyectoId);
  const r = reg.recepcion;
  const filas = [
    ["Ambiente", ambienteNombre],
    ["Material", `${r.material.nombre} (${r.material.codigo})`],
    ["Unidad de Medida", r.material.unidadMedida.simbolo],
    ["Proveedor", r.proveedor?.razonSocial ?? "—"],
    ["Marca", r.marca ?? "—"],
    ["SKU / Modelo", r.modeloSKU ?? "—"],
    ["N° Lote", r.nroLote ?? "—"],
    ["Especificación Técnica", r.especificacionTecnica ?? "—"],
    ["Cantidad Instalada", `${reg.cantidadInstalada} ${r.material.unidadMedida.simbolo}`],
    ["Dosificación / Mezcla", reg.dosificacionOMezcla ?? "—"],
    ["Mecanismo de Instalación", reg.mecanismoInstalacion ?? "—"],
    ["Fecha de Instalación", fmtFecha(reg.fechaInstalacion)],
  ];

  const body =
    `<h2>Ficha As-Built de Instalación</h2>` +
    `<table><tbody>` +
    filas.map(([k, v]) => `<tr><th style="width:35%;text-align:left">${k}</th><td>${v}</td></tr>`).join("") +
    `</tbody></table>`;

  openBrandedPrintWindow(
    `As-Built – ${r.material.nombre}`,
    `As-Built: ${r.material.nombre}`,
    `Ambiente: ${ambienteNombre} · Proyecto: ${proyectoNombre}`,
    body,
    empresa,
  );
}

function buildImpresionDossierCompleto(asBuiltPorAmbiente: AmbienteConAsBuilt[], proyectoNombre: string, proyectoId: string) {
  const empresa = getEmpresaConfig(proyectoId);
  const totalItems = asBuiltPorAmbiente.reduce((s, a) => s + a.asBuiltRegistros.length, 0);
  const materialesDistintos = new Set(asBuiltPorAmbiente.flatMap((a) => a.asBuiltRegistros.map((r) => r.recepcion.materialId))).size;

  let body =
    `<div class="kpis">` +
    `<div class="kpi"><div class="label">Ambientes</div><div class="value">${asBuiltPorAmbiente.length}</div></div>` +
    `<div class="kpi"><div class="label">Registros Instalados</div><div class="value">${totalItems}</div></div>` +
    `<div class="kpi"><div class="label">Materiales Distintos</div><div class="value">${materialesDistintos}</div></div>` +
    `</div>`;

  asBuiltPorAmbiente.forEach((amb) => {
    body += `<h2>${amb.nombre}</h2>`;
    if (amb.asBuiltRegistros.length === 0) {
      body += `<p style="color:#888;font-size:8.5pt;margin-bottom:10pt">(Sin registros)</p>`;
      return;
    }
    body +=
      `<table><thead><tr>` +
      `<th>Material</th><th>Código</th><th>Marca / SKU / Lote</th>` +
      `<th>Especificación</th><th>Proveedor</th>` +
      `<th style="text-align:right">Cantidad</th><th>Dosificación</th>` +
      `<th>Mecanismo</th><th>Fecha</th>` +
      `</tr></thead><tbody>`;
    amb.asBuiltRegistros.forEach((reg, idx) => {
      const r = reg.recepcion;
      const marcaLote = [r.marca, r.modeloSKU, r.nroLote ? `Lote:${r.nroLote}` : ""].filter(Boolean).join(" · ") || "—";
      body +=
        `<tr class="${idx % 2 === 1 ? "even-row" : ""}">` +
        `<td>${r.material.nombre}</td>` +
        `<td style="font-family:monospace">${r.material.codigo}</td>` +
        `<td>${marcaLote}</td>` +
        `<td>${r.especificacionTecnica ?? "—"}</td>` +
        `<td>${r.proveedor?.razonSocial ?? "—"}</td>` +
        `<td style="text-align:right;font-family:monospace">${reg.cantidadInstalada} ${r.material.unidadMedida.simbolo}</td>` +
        `<td>${reg.dosificacionOMezcla ?? "—"}</td>` +
        `<td>${reg.mecanismoInstalacion ?? "—"}</td>` +
        `<td>${fmtFecha(reg.fechaInstalacion)}</td>` +
        `</tr>`;
    });
    body += `</tbody></table>`;
  });

  openBrandedPrintWindow(
    `Dossier As-Built – ${proyectoNombre}`,
    `Dossier Técnico As-Built`,
    `Proyecto: ${proyectoNombre}`,
    body,
    empresa,
  );
}

// ─── Print helper: Historial Bodega ────────────────────────────
function buildImpresionHistorialBodega(recepciones: RecepcionConDetalle[], proyectoNombre: string, proyectoId: string) {
  const empresa = getEmpresaConfig(proyectoId);
  let body = `<h2>Historial de Recepción en Bodega</h2>`;
  body +=
    `<table><thead><tr>` +
    `<th>Material</th><th>Código</th><th>Proveedor</th>` +
    `<th>Remisión / Lote</th><th style="text-align:right">Recibido</th>` +
    `<th>Marca / SKU</th><th>Responsable</th><th>Fecha</th>` +
    `</tr></thead><tbody>`;
  recepciones.forEach((r, idx) => {
    const marcaSKU = [r.marca, r.modeloSKU].filter(Boolean).join(" · ") || "—";
    const remLote = [r.nroRemision, r.nroLote ? `Lote: ${r.nroLote}` : ""].filter(Boolean).join(" / ") || "—";
    body +=
      `<tr class="${idx % 2 === 1 ? "even-row" : ""}">`+
      `<td>${r.material.nombre}</td>`+
      `<td style="font-family:monospace">${r.material.codigo}</td>`+
      `<td>${r.proveedor?.razonSocial ?? "—"}</td>`+
      `<td style="font-family:monospace">${remLote}</td>`+
      `<td style="text-align:right;font-family:monospace">${r.cantidadRecibida} ${r.material.unidadMedida.simbolo}</td>`+
      `<td>${marcaSKU}</td>`+
      `<td>${r.responsableReceptor ?? "—"}</td>`+
      `<td>${fmtFecha(r.fechaRecepcion)}</td>`+
      `</tr>`;
  });
  body += `</tbody></table>`;
  openBrandedPrintWindow(
    `Historial Bodega – ${proyectoNombre}`,
    `Historial de Recepción en Bodega`,
    `Proyecto: ${proyectoNombre} · Total registros: ${recepciones.length}`,
    body,
    empresa,
  );
}

// ─── Print helper: Insumos Consolidados ─────────────────────────
function buildImpresionInsumosConsolidados(filas: FilaControlStock[], proyectoNombre: string, proyectoId: string) {
  const empresa = getEmpresaConfig(proyectoId);
  let body = `<h2>Insumos Consolidados</h2>`;
  body += `<p style="color:#888;font-size:8.5pt;margin-bottom:12pt">Consumo calculado según avances de obra registrados en el módulo de Cómputo</p>`;
  body +=
    `<table><thead><tr>`+
    `<th>Material</th><th>Unidad</th>`+
    `<th style="text-align:right">Total Recibido</th>`+
    `<th style="text-align:right">Consumo (Avance Obra)</th>`+
    `<th style="text-align:right">Stock Disponible</th>`+
    `</tr></thead><tbody>`;
  filas.forEach((f, idx) => {
    const stockColor = f.stockTeorico < 0 ? "color:#dc2626" : "color:#16a34a";
    body +=
      `<tr class="${idx % 2 === 1 ? "even-row" : ""}">` +
      `<td>${f.materialNombre}</td>`+
      `<td>${f.unidad}</td>`+
      `<td style="text-align:right;font-family:monospace">${f.recibidoBodega.toFixed(2)}</td>`+
      `<td style="text-align:right;font-family:monospace">${f.consumoTeorico.toFixed(2)}</td>`+
      `<td style="text-align:right;font-family:monospace;${stockColor};font-weight:700">${f.stockTeorico.toFixed(2)}</td>`+
      `</tr>`;
  });
  body += `</tbody></table>`;
  openBrandedPrintWindow(
    `Insumos Consolidados – ${proyectoNombre}`,
    `Insumos Consolidados`,
    `Proyecto: ${proyectoNombre}`,
    body,
    empresa,
  );
}

// ─── Modal Detalle: Recepción ─────────────────────────────────

function ModalDetalleRecepcion({
  recepcion,
  proyectoNombre,
  proyectoId,
  onClose,
}: {
  recepcion: RecepcionConDetalle;
  proyectoNombre: string;
  proyectoId: string;
  onClose: () => void;
}) {
  const stock = calcStock(recepcion);
  const instalado = recepcion.cantidadRecibida - stock;
  const stockPct = recepcion.cantidadRecibida > 0 ? (stock / recepcion.cantidadRecibida) * 100 : 0;

  const filas: [string, string][] = [
    ["Material", `${recepcion.material.nombre}`],
    ["Código", recepcion.material.codigo],
    ["Proveedor", recepcion.proveedor?.razonSocial ?? "—"],
    ["N° Remisión", recepcion.nroRemision ?? "—"],
    ["Responsable Receptor", recepcion.responsableReceptor ?? "—"],
    ["Fecha de Recepción", fmtFecha(recepcion.fechaRecepcion)],
    ["Marca", recepcion.marca ?? "—"],
    ["SKU / Modelo", recepcion.modeloSKU ?? "—"],
    ["N° Lote", recepcion.nroLote ?? "—"],
    ["Especificación Técnica", recepcion.especificacionTecnica ?? "—"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-blue-500" /> Detalle de Recepción
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => buildImpresionRecepcion(recepcion, proyectoNombre, proyectoId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* KPIs de stock */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recibido</p>
              <p className="text-base font-bold text-gray-900 dark:text-white font-mono">
                {recepcion.cantidadRecibida} <span className="text-xs font-normal">{recepcion.material.unidadMedida.simbolo}</span>
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Instalado</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                {instalado.toFixed(2)} <span className="text-xs font-normal">{recepcion.material.unidadMedida.simbolo}</span>
              </p>
            </div>
            <div className={`rounded-xl border p-3 text-center ${stock <= 0 ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : stock < recepcion.cantidadRecibida * 0.2 ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20" : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"}`}>
              <p className={`text-xs mb-1 ${stock <= 0 ? "text-red-600 dark:text-red-400" : stock < recepcion.cantidadRecibida * 0.2 ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"}`}>Stock</p>
              <p className={`text-base font-bold font-mono ${stock <= 0 ? "text-red-700 dark:text-red-300" : stock < recepcion.cantidadRecibida * 0.2 ? "text-orange-700 dark:text-orange-300" : "text-blue-700 dark:text-blue-300"}`}>
                {stock.toFixed(2)} <span className="text-xs font-normal">{recepcion.material.unidadMedida.simbolo}</span>
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Consumo</span>
              <span>{(100 - stockPct).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all"
                style={{ width: `${Math.min(100 - stockPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Tabla de datos */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filas.map(([k, v]) => (
                  <tr key={k} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-40">{k}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Detalle: As-Built ──────────────────────────────────

function ModalDetalleAsBuilt({
  registro,
  ambienteNombre,
  proyectoNombre,
  proyectoId,
  onClose,
}: {
  registro: AsBuiltConDetalle;
  ambienteNombre: string;
  proyectoNombre: string;
  proyectoId: string;
  onClose: () => void;
}) {
  const r = registro.recepcion;
  const filas: [string, string][] = [
    ["Ambiente", ambienteNombre],
    ["Material", r.material.nombre],
    ["Código", r.material.codigo],
    ["Proveedor", r.proveedor?.razonSocial ?? "—"],
    ["Marca", r.marca ?? "—"],
    ["SKU / Modelo", r.modeloSKU ?? "—"],
    ["N° Lote", r.nroLote ?? "—"],
    ["Especificación Técnica", r.especificacionTecnica ?? "—"],
    ["Cantidad Instalada", `${registro.cantidadInstalada} ${r.material.unidadMedida.simbolo}`],
    ["Dosificación / Mezcla", registro.dosificacionOMezcla ?? "—"],
    ["Mecanismo de Instalación", registro.mecanismoInstalacion ?? "—"],
    ["Fecha de Instalación", fmtFecha(registro.fechaInstalacion)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
            <ClipboardList className="w-4 h-4 text-lime-500" /> Detalle As-Built
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => buildImpresionAsBuilt(registro, ambienteNombre, proyectoNombre, proyectoId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-400 hover:bg-lime-100 dark:hover:bg-lime-500/20 border border-lime-200 dark:border-lime-500/20 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Badge de material */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800">
            <div className="w-8 h-8 rounded-lg bg-lime-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{r.material.nombre}</p>
              <p className="text-xs text-lime-600 dark:text-lime-400 font-mono font-bold">
                {registro.cantidadInstalada} {r.material.unidadMedida.simbolo} instalados
              </p>
            </div>
          </div>

          {/* Tabla de datos */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filas.map(([k, v]) => (
                  <tr key={k} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-44">{k}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Gestión de Ambientes ──────────────────────────────
function TabAmbientes({
  proyectoId, ambientes, onCreado, onEliminado,
}: {
  proyectoId: string;
  ambientes: AmbienteConCount[];
  onCreado: (a: AmbienteConCount) => void;
  onEliminado: (id: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    start(async () => {
      const res = await crearAmbiente(proyectoId, nombre);
      if (res.ok && res.ambiente) {
        toast.success(`Ambiente "${nombre}" creado`);
        onCreado({ ...res.ambiente, _count: { asBuiltRegistros: 0 } });
        setNombre("");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleEliminar(id: string) {
    start(async () => {
      const res = await eliminarAmbiente(proyectoId, id);
      if (res.ok) {
        toast.success("Ambiente eliminado");
        onEliminado(id);
        setConfirmDel(null);
      } else {
        toast.error(res.error);
        setConfirmDel(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Formulario nuevo ambiente */}
      <form onSubmit={handleCrear} className="flex gap-2">
        <input
          type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="Escribí el nombre del ambiente: Cocina, Baño Suite, Dormitorio 1…"
          autoFocus
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/40"
        />
        <button
          type="submit"
          disabled={pending || !nombre.trim()}
          title={!nombre.trim() ? "Escribí un nombre primero" : "Agregar ambiente"}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            nombre.trim() && !pending
              ? "bg-lime-600 hover:bg-lime-700 text-white cursor-pointer"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }`}
        >
          <Plus className="w-4 h-4" />
          {pending ? "Guardando…" : "Agregar"}
        </button>
      </form>

      {/* Lista de ambientes */}
      {ambientes.length === 0 ? (
        <p className="text-center py-10 text-sm text-gray-400">No hay ambientes. Creá el primero arriba.</p>
      ) : (
        <div className="space-y-2">
          {ambientes.map((a) => (
            <div key={a.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-500 to-green-500 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="flex-1 font-medium text-sm text-gray-900 dark:text-white">{a.nombre}</span>
              <span className="text-xs text-gray-400">{a._count.asBuiltRegistros} instalaciones</span>

              {confirmDel === a.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">¿Eliminar?</span>
                  <button onClick={() => handleEliminar(a.id)} disabled={pending}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                    Sí
                  </button>
                  <button onClick={() => setConfirmDel(null)}
                    className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300">
                    No
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(a.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Recepción y Bodega ────────────────────────────────
function TabBodega({
  proyectoId, proyectoNombre, recepciones, materiales, proveedores, onEliminada,
}: {
  proyectoId: string;
  proyectoNombre: string;
  recepciones: RecepcionConDetalle[];
  materiales: MaterialSelect[];
  proveedores: ProveedorSelect[];
  onCreada: (r: RecepcionConDetalle) => void;
  onEliminada: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [detalleItem, setDetalleItem] = useState<RecepcionConDetalle | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState<Partial<RecepcionData>>({
    fechaRecepcion: new Date().toISOString().slice(0, 10),
  });
  const pagBodega = usePagination(recepciones, 50);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function exportCSVBodega() {
    const header = "Material,Codigo,Proveedor,Remision,Lote,CantidadRecibida,Unidad,Marca,SKU,EspecificacionTecnica,Responsable,Fecha\n";
    const rows = recepciones.map((r) =>
      [
        r.material.nombre, r.material.codigo, r.proveedor?.razonSocial ?? "",
        r.nroRemision ?? "", r.nroLote ?? "", r.cantidadRecibida,
        r.material.unidadMedida.simbolo, r.marca ?? "", r.modeloSKU ?? "",
        r.especificacionTecnica ?? "", r.responsableReceptor ?? "",
        fmtFecha(r.fechaRecepcion),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-bodega-${proyectoNombre.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.materialId || !form.cantidadRecibida) {
      toast.error("Material y cantidad son requeridos");
      return;
    }
    start(async () => {
      const res = await crearRecepcion(proyectoId, form as RecepcionData);
      if (res.ok) {
        toast.success("Recepción registrada");
        // Refetch simplificado: recargar datos
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleEliminar(id: string) {
    start(async () => {
      const res = await eliminarRecepcion(proyectoId, id);
      if (res.ok) {
        toast.success("Recepción eliminada");
        onEliminada(id);
        setConfirmDel(null);
      } else {
        toast.error(res.error);
        setConfirmDel(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={exportCSVBodega}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => buildImpresionHistorialBodega(recepciones, proyectoNombre, proyectoId)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <Plus className="w-4 h-4" /> Registrar Remisión
        </button>
      </div>

      {/* Tabla de recepciones */}
      {recepciones.length === 0 ? (
        <p className="text-center py-10 text-sm text-gray-400">No hay materiales registrados en bodega.</p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Material</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Proveedor</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Remisión / Lote</th>
                <th className="text-right px-4 py-3">Recibido</th>
                <th className="text-right px-4 py-3">Fecha</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pagBodega.items.map((r) => {
                return (
                  <tr key={r.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{r.material.nombre}</p>
                      <p className="text-xs text-gray-400">{r.material.codigo}</p>
                      {r.marca && <p className="text-xs text-blue-400 mt-0.5">{r.marca} {r.modeloSKU && `· ${r.modeloSKU}`}</p>}
                      {r.especificacionTecnica && <p className="text-xs text-violet-400 mt-0.5">{r.especificacionTecnica}</p>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500 dark:text-gray-400">
                      {r.proveedor?.razonSocial ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 text-xs">
                      {r.nroRemision && <span className="font-mono">{r.nroRemision}</span>}
                      {r.nroLote && <span className="block text-gray-400">Lote: {r.nroLote}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                      {r.cantidadRecibida} {r.material.unidadMedida.simbolo}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">{fmtFecha(r.fechaRecepcion)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetalleItem(r)}
                          className="p-1 rounded-md text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {confirmDel === r.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEliminar(r.id)} disabled={pending}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">Sí</button>
                            <button onClick={() => setConfirmDel(null)}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDel(r.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <PaginationControls
            page={pagBodega.page}
            totalPages={pagBodega.totalPages}
            total={recepciones.length}
            pageSize={pagBodega.pageSize}
            onPage={pagBodega.setPage}
            onPageSize={pagBodega.setPageSize}
            threshold={50}
          />
        </div>
      )}

      {/* Modal: Registrar Remisión */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4" /> Registrar Recepción / Remisión
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-5">
              {/* Material y cantidad */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos Principales</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Material *</label>
                    <select value={form.materialId ?? ""} onChange={(e) => set("materialId", e.target.value)} className={inputCls} required>
                      <option value="">— Seleccionar material —</option>
                      {materiales.map((m) => (
                        <option key={m.id} value={m.id}>{m.codigo} · {m.nombre} ({m.unidadMedida.simbolo})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Cantidad Recibida *</label>
                    <input type="number" step="0.001" min="0.001" value={form.cantidadRecibida ?? ""}
                      onChange={(e) => set("cantidadRecibida", parseFloat(e.target.value))}
                      className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Fecha de Recepción *</label>
                    <input type="date" value={form.fechaRecepcion ?? ""} onChange={(e) => set("fechaRecepcion", e.target.value)} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Proveedor</label>
                    <select value={form.proveedorId ?? ""} onChange={(e) => set("proveedorId", e.target.value)} className={inputCls}>
                      <option value="">— Sin proveedor —</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>{p.razonSocial}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>N° Remisión</label>
                    <input type="text" value={form.nroRemision ?? ""} onChange={(e) => set("nroRemision", e.target.value)}
                      placeholder="Ej: REM-2026-0142" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Responsable de Recepción</label>
                    <input type="text" value={form.responsableReceptor ?? ""} onChange={(e) => set("responsableReceptor", e.target.value)}
                      placeholder="Nombre del capataz/encargado" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Trazabilidad de acabados */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Trazabilidad (Acabados)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Marca</label>
                    <input type="text" value={form.marca ?? ""} onChange={(e) => set("marca", e.target.value)}
                      placeholder="Ej: Porcelanato ROCA" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>SKU / Modelo</label>
                    <input type="text" value={form.modeloSKU ?? ""} onChange={(e) => set("modeloSKU", e.target.value)}
                      placeholder="Ej: PC-60-MARMOL" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>N° Lote</label>
                    <input type="text" value={form.nroLote ?? ""} onChange={(e) => set("nroLote", e.target.value)}
                      placeholder="Ej: LOT-2026-A" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Especificación técnica granel */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Especificación (Materiales a Granel)</p>
                <div>
                  <label className={labelCls}>Especificación Técnica</label>
                  <input type="text" value={form.especificacionTecnica ?? ""} onChange={(e) => set("especificacionTecnica", e.target.value)}
                    placeholder="Ej: Granulometría 4ta, Lavada de río, Portland IP-40" className={inputCls} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancelar
                </button>
                <button type="submit" disabled={pending}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                  <Save className="w-4 h-4" /> {pending ? "Guardando…" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Recepción */}
      {detalleItem && (
        <ModalDetalleRecepcion
          recepcion={detalleItem}
          proyectoNombre={proyectoNombre}
          proyectoId={proyectoId}
          onClose={() => setDetalleItem(null)}
        />
      )}
    </div>
  );
}

// ─── Tab 3: Matriz As-Built ───────────────────────────────────
function TabAsBuilt({
  proyectoId, proyectoNombre, ambientes, recepciones, asBuiltPorAmbiente,
}: {
  proyectoId: string;
  proyectoNombre: string;
  ambientes: AmbienteConCount[];
  recepciones: RecepcionConDetalle[];
  asBuiltPorAmbiente: AmbienteConAsBuilt[];
}) {
  const [ambienteSelId, setAmbienteSelId] = useState<string>(ambientes[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
  const [detalleRegistro, setDetalleRegistro] = useState<AsBuiltConDetalle | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState<Partial<AsBuiltData>>({
    fechaInstalacion: new Date().toISOString().slice(0, 10),
    ambienteId: ambienteSelId,
  });

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const ambienteData = asBuiltPorAmbiente.find((a) => a.id === ambienteSelId);

  // Solo recepciones con stock disponible
  const recepcionesConStock = recepciones.filter((r) => calcStock(r) > 0);

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recepcionId || !form.cantidadInstalada || !form.ambienteId) {
      toast.error("Ambiente, material y cantidad son requeridos");
      return;
    }
    start(async () => {
      const res = await crearAsBuilt(proyectoId, { ...form, ambienteId: ambienteSelId } as AsBuiltData);
      if (res.ok) {
        toast.success("Instalación registrada");
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleEliminar(registroId: string) {
    start(async () => {
      const res = await eliminarAsBuilt(proyectoId, registroId);
      if (res.ok) {
        toast.success("Registro eliminado");
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (ambientes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Primero creá los ambientes del proyecto en la pestaña <strong>Ambientes</strong>.</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Panel izquierdo: lista de ambientes */}
      <div className="lg:w-52 shrink-0 space-y-1">
        {ambientes.map((a) => (
          <button key={a.id}
            onClick={() => { setAmbienteSelId(a.id); setShowForm(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              ambienteSelId === a.id
                ? "bg-lime-600 text-white shadow"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <span className="block truncate">{a.nombre}</span>
            <span className="text-xs opacity-70">{a._count.asBuiltRegistros} items</span>
          </button>
        ))}
      </div>

      {/* Panel derecho: registros del ambiente */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {ambientes.find((a) => a.id === ambienteSelId)?.nombre ?? "Ambiente"}
          </h3>
          <button onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-600 hover:bg-lime-700 text-white text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Registrar instalación
          </button>
        </div>

        {/* Formulario inline */}
        {showForm && (
          <form onSubmit={handleGuardar}
            className="rounded-xl border border-lime-200 dark:border-lime-900/50 bg-lime-50/50 dark:bg-lime-900/10 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Material en Bodega (con stock) *</label>
                <select value={form.recepcionId ?? ""} onChange={(e) => set("recepcionId", e.target.value)} className={inputCls} required>
                  <option value="">— Seleccionar lote —</option>
                  {recepcionesConStock.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.material.nombre} {r.marca ? `· ${r.marca}` : ""} {r.nroLote ? `· Lote: ${r.nroLote}` : ""} — Stock: {calcStock(r).toFixed(2)} {r.material.unidadMedida.simbolo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Cantidad Instalada *</label>
                <input type="number" step="0.001" min="0.001" value={form.cantidadInstalada ?? ""}
                  onChange={(e) => set("cantidadInstalada", parseFloat(e.target.value))}
                  className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Fecha de Instalación</label>
                <input type="date" value={form.fechaInstalacion ?? ""} onChange={(e) => set("fechaInstalacion", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Dosificación / Mezcla</label>
                <input type="text" value={form.dosificacionOMezcla ?? ""} onChange={(e) => set("dosificacionOMezcla", e.target.value)}
                  placeholder="Ej: 3A + 1B, Pintura con 30cc entonador" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mecanismo de Instalación</label>
                <input type="text" value={form.mecanismoInstalacion ?? ""} onChange={(e) => set("mecanismoInstalacion", e.target.value)}
                  placeholder="Ej: Doble encolado, Soplete, Vaciado" className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="flex items-center gap-2 px-4 py-1.5 bg-lime-600 hover:bg-lime-700 text-white text-sm rounded-lg font-medium disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        )}

        {/* Registros del ambiente */}
        {!ambienteData || ambienteData.asBuiltRegistros.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400">Sin instalaciones registradas en este ambiente.</p>
        ) : (
          <div className="space-y-2">
            {ambienteData.asBuiltRegistros.map((reg) => (
              <div key={reg.id}
                className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {reg.recepcion.material.nombre}
                    </span>
                    {reg.recepcion.marca && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        {reg.recepcion.marca}
                      </span>
                    )}
                    {reg.recepcion.nroLote && (
                      <span className="text-xs text-gray-400 font-mono">Lote: {reg.recepcion.nroLote}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {reg.cantidadInstalada} {reg.recepcion.material.unidadMedida.simbolo}
                    </span>
                    {reg.dosificacionOMezcla && <span>Dosif: {reg.dosificacionOMezcla}</span>}
                    {reg.mecanismoInstalacion && <span>Mec: {reg.mecanismoInstalacion}</span>}
                    <span>{fmtFecha(reg.fechaInstalacion)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-start">
                  <button
                    onClick={() => setDetalleRegistro(reg)}
                    className="p-1 rounded-md text-lime-500 hover:text-lime-700 hover:bg-lime-50 dark:hover:bg-lime-500/10 transition-colors"
                    title="Ver detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEliminar(reg.id)} disabled={pending}
                    className="p-1 rounded-md text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Modal: Detalle As-Built */}
    {detalleRegistro && (
      <ModalDetalleAsBuilt
        registro={detalleRegistro}
        ambienteNombre={ambientes.find((a) => a.id === ambienteSelId)?.nombre ?? "Ambiente"}
        proyectoNombre={proyectoNombre}
        proyectoId={proyectoId}
        onClose={() => setDetalleRegistro(null)}
      />
    )}
    </>
  );
}

// ─── Tab 4: Exportar Dossier ──────────────────────────────────
function TabExportar({
  asBuiltPorAmbiente, proyectoNombre, proyectoId,
}: {
  asBuiltPorAmbiente: AmbienteConAsBuilt[];
  proyectoNombre: string;
  proyectoId: string;
}) {
  const [expandido, setExpandido] = useState<string | null>(null);

  function exportCSV() {
    const filas: string[] = [
      "Ambiente,Material,Codigo,Marca,SKU,Lote,Especificacion,Proveedor,Cantidad,Unidad,Dosificacion,Mecanismo,Fecha",
    ];
    asBuiltPorAmbiente.forEach((amb) => {
      amb.asBuiltRegistros.forEach((reg) => {
        const r = reg.recepcion;
        filas.push([
          amb.nombre,
          r.material.nombre,
          r.material.codigo,
          r.marca ?? "",
          r.modeloSKU ?? "",
          r.nroLote ?? "",
          r.especificacionTecnica ?? "",
          r.proveedor?.razonSocial ?? "",
          reg.cantidadInstalada,
          r.material.unidadMedida.simbolo,
          reg.dosificacionOMezcla ?? "",
          reg.mecanismoInstalacion ?? "",
          fmtFecha(reg.fechaInstalacion),
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
      });
    });
    const blob = new Blob([filas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asbuilt-${proyectoNombre.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportTXT() {
    let txt = `DOSSIER TÉCNICO AS-BUILT\nProyecto: ${proyectoNombre}\nGenerado: ${new Date().toLocaleString("es-PY")}\n\n`;
    asBuiltPorAmbiente.forEach((amb) => {
      txt += `═══════════════════════════════════════\nAMBIENTE: ${amb.nombre.toUpperCase()}\n═══════════════════════════════════════\n`;
      if (amb.asBuiltRegistros.length === 0) {
        txt += "  (Sin registros)\n\n";
        return;
      }
      amb.asBuiltRegistros.forEach((reg, i) => {
        const r = reg.recepcion;
        txt += `\n[${i + 1}] ${r.material.nombre} (${r.material.codigo})\n`;
        txt += `  Cantidad Instalada : ${reg.cantidadInstalada} ${r.material.unidadMedida.simbolo}\n`;
        if (r.marca) txt += `  Marca              : ${r.marca}\n`;
        if (r.modeloSKU) txt += `  SKU / Modelo       : ${r.modeloSKU}\n`;
        if (r.nroLote) txt += `  N° Lote            : ${r.nroLote}\n`;
        if (r.especificacionTecnica) txt += `  Especificación     : ${r.especificacionTecnica}\n`;
        if (r.proveedor) txt += `  Proveedor          : ${r.proveedor.razonSocial}\n`;
        if (reg.dosificacionOMezcla) txt += `  Dosificación/Mezcla: ${reg.dosificacionOMezcla}\n`;
        if (reg.mecanismoInstalacion) txt += `  Mecanismo          : ${reg.mecanismoInstalacion}\n`;
        txt += `  Fecha Instalación  : ${fmtFecha(reg.fechaInstalacion)}\n`;
      });
      txt += "\n";
    });
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asbuilt-${proyectoNombre.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalItems = asBuiltPorAmbiente.reduce((s, a) => s + a.asBuiltRegistros.length, 0);

  return (
    <div className="space-y-5">
      {/* Botones de exportación */}
      <div className="flex flex-wrap gap-3">
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20">
          <Download className="w-4 h-4" /> Exportar a CSV
        </button>
        <button onClick={exportTXT}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-lg shadow-violet-500/20">
          <FileText className="w-4 h-4" /> Generar TXT Raw Data
        </button>
        <button
          onClick={() => buildImpresionDossierCompleto(asBuiltPorAmbiente, proyectoNombre, proyectoId)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-medium transition-colors shadow-lg shadow-slate-500/20">
          <Printer className="w-4 h-4" /> Imprimir Dossier Completo
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{asBuiltPorAmbiente.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ambientes</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalItems}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Registros instalados</p>
        </div>
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {new Set(asBuiltPorAmbiente.flatMap((a) => a.asBuiltRegistros.map((r) => r.recepcion.materialId))).size}
          </p>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">Materiales distintos</p>
        </div>
      </div>

      {/* Tabla agrupada por ambiente */}
      <div className="space-y-3">
        {asBuiltPorAmbiente.map((amb) => (
          <div key={amb.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setExpandido(expandido === amb.id ? null : amb.id)}
            >
              <MapPin className="w-4 h-4 text-lime-500 shrink-0" />
              <span className="font-semibold text-sm text-gray-900 dark:text-white flex-1 text-left">{amb.nombre}</span>
              <span className="text-xs text-gray-400 mr-2">{amb.asBuiltRegistros.length} items</span>
              {expandido === amb.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {expandido === amb.id && (
              <div className="overflow-x-auto">
                {amb.asBuiltRegistros.length === 0 ? (
                  <p className="text-center py-6 text-sm text-gray-400">Sin registros</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-2">Material</th>
                        <th className="text-left px-4 py-2">Marca / SKU / Lote</th>
                        <th className="text-left px-4 py-2">Especificación</th>
                        <th className="text-left px-4 py-2">Proveedor</th>
                        <th className="text-right px-4 py-2">Cantidad</th>
                        <th className="text-left px-4 py-2">Dosificación</th>
                        <th className="text-left px-4 py-2">Mecanismo</th>
                        <th className="text-right px-4 py-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {amb.asBuiltRegistros.map((reg) => {
                        const r = reg.recepcion;
                        return (
                          <tr key={reg.id} className="bg-white dark:bg-gray-900">
                            <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                              {r.material.nombre}
                              <span className="block text-gray-400 font-mono">{r.material.codigo}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                              {[r.marca, r.modeloSKU, r.nroLote ? `Lote: ${r.nroLote}` : ""].filter(Boolean).join(" · ") || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.especificacionTecnica ?? "—"}</td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.proveedor?.razonSocial ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {reg.cantidadInstalada} {r.material.unidadMedida.simbolo}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{reg.dosificacionOMezcla ?? "—"}</td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{reg.mecanismoInstalacion ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{fmtFecha(reg.fechaInstalacion)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 4b: Insumos Consolidados ──────────────────────────────
function TabInsumosConsolidados({ proyectoId, proyectoNombre }: { proyectoId: string; proyectoNombre: string }) {
  const [filas, setFilas] = useState<FilaControlStock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDatos = useCallback(async () => {
    const data = await getControlStock(proyectoId);
    const sorted = [...data].sort((a, b) => a.materialNombre.localeCompare(b.materialNombre));
    setFilas(sorted);
    setLoading(false);
  }, [proyectoId]);

  const cargarDatos = useCallback(() => {
    setLoading(true);
    void fetchDatos();
  }, [fetchDatos]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch: setState after await
  useEffect(() => { void fetchDatos(); }, [fetchDatos]);

  function exportCSV() {
    const header = "Material,Unidad,Total Recibido,Consumo (Avance Obra),Stock Disponible\n";
    const rows = filas.map((f) =>
      [f.materialNombre, f.unidad, f.recibidoBodega.toFixed(2), f.consumoTeorico.toFixed(2), f.stockTeorico.toFixed(2)]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insumos-consolidados-${proyectoNombre.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalMateriales = filas.length;
  const materialesConDeficit = filas.filter((f) => f.stockTeorico < 0).length;
  const materialesConStock = filas.filter((f) => f.stockTeorico >= 0).length;

  return (
    <div className="space-y-4">
      {/* Export bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
          <Download className="w-4 h-4" /> CSV
        </button>
        <button
          onClick={() => !loading && filas.length > 0 && buildImpresionInsumosConsolidados(filas, proyectoNombre, proyectoId)}
          disabled={loading || filas.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
        <button onClick={cargarDatos} title="Actualizar datos"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPIs */}
      {!loading && totalMateriales > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMateriales}</p>
            <p className="text-xs text-gray-500 mt-0.5">Materiales</p>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{materialesConStock}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Con stock positivo</p>
          </div>
          <div className={`rounded-xl border p-4 text-center col-span-2 sm:col-span-1 ${materialesConDeficit > 0 ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"}`}>
            <p className={`text-2xl font-bold ${materialesConDeficit > 0 ? "text-red-700 dark:text-red-300" : "text-gray-400"}`}>{materialesConDeficit}</p>
            <p className={`text-xs mt-0.5 ${materialesConDeficit > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>Con déficit</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-14 text-sm text-gray-400">Cargando datos…</div>
      ) : filas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay datos. Registrá recepciones en Bodega y avances de obra en el módulo de Cómputo.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Material</th>
                <th className="text-left px-4 py-3">Unidad</th>
                <th className="text-right px-4 py-3">Total Recibido</th>
                <th className="text-right px-4 py-3">Consumo (Avance Obra)</th>
                <th className="text-right px-4 py-3">Stock Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filas.map((f) => (
                <tr key={f.materialNombre}
                  className={f.stockTeorico < 0
                    ? "bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20"
                    : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{f.materialNombre}</p>
                    {f.rubrosRelacionados.length > 0 && (
                      <p className="text-xs text-blue-400 mt-0.5 truncate max-w-[250px]" title={f.rubrosRelacionados.join(", ")}>
                        {f.rubrosRelacionados.slice(0, 2).join(", ")}{f.rubrosRelacionados.length > 2 ? ` +${f.rubrosRelacionados.length - 2}` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{f.unidad}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                    {f.recibidoBodega.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
                    {f.consumoTeorico.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    <span className={f.stockTeorico < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {f.stockTeorico.toFixed(2)}
                    </span>
                    {f.stockTeorico < 0 && (
                      <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-normal">
                        déficit
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Control de Stock ─────────────────────────────────
function TabControlStock({ proyectoId }: { proyectoId: string }) {
  const [filas, setFilas] = useState<FilaControlStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMaterial, setModalMaterial] = useState<string | null>(null);
  const [conteoForm, setConteoForm] = useState<{ cantidad: string; fecha: string; nota: string; unidad: string }>({
    cantidad: "", fecha: new Date().toISOString().slice(0, 10), nota: "", unidad: "",
  });
  const [pending, start] = useTransition();

  const fetchDatos = useCallback(async () => {
    const data = await getControlStock(proyectoId);
    setFilas(data);
    setLoading(false);
  }, [proyectoId]);

  const cargarDatos = useCallback(() => {
    setLoading(true);
    void fetchDatos();
  }, [fetchDatos]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch: setState after await
  useEffect(() => { void fetchDatos(); }, [fetchDatos]);

  function abrirModal(fila: FilaControlStock) {
    setConteoForm({ cantidad: "", fecha: new Date().toISOString().slice(0, 10), nota: "", unidad: fila.unidad });
    setModalMaterial(fila.materialNombre);
  }

  function handleGuardarConteo(e: React.FormEvent) {
    e.preventDefault();
    if (!modalMaterial || !conteoForm.cantidad) return;
    start(async () => {
      const res = await crearConteoFisico(proyectoId, {
        materialNombre: modalMaterial,
        unidad: conteoForm.unidad,
        cantidad: parseFloat(conteoForm.cantidad),
        fecha: conteoForm.fecha,
        nota: conteoForm.nota || undefined,
      });
      if (res.ok) {
        toast.success("Conteo registrado");
        setModalMaterial(null);
        await cargarDatos();
      } else {
        toast.error(res.error);
      }
    });
  }

  const alertCount = filas.filter((f) => f.alertar).length;

  return (
    <div className="space-y-4">
      {/* Aviso interno */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          INTERNO — Solo uso de la constructora. Esta vista no se incluye en el dossier al cliente.
        </p>
        <button onClick={cargarDatos} title="Actualizar datos" className="ml-auto text-amber-500 hover:text-amber-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI resumen */}
      {!loading && filas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{filas.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Materiales</p>
          </div>
          <div className={`rounded-xl border p-4 text-center ${alertCount > 0 ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"}`}>
            <p className={`text-2xl font-bold ${alertCount > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>{alertCount}</p>
            <p className={`text-xs mt-0.5 ${alertCount > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>Alertas</p>
          </div>
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{filas.filter((f) => f.conteoFisico !== null).length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Con conteo</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{filas.filter((f) => f.conteoFisico === null).length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Sin conteo</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-14 text-sm text-gray-400">Cargando datos…</div>
      ) : filas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay datos. Registrá avances de obra en el módulo de Presupuesto y recepciones en Bodega.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Material</th>
                <th className="text-right px-4 py-3">Recibido</th>
                <th className="text-right px-4 py-3">Consumo Teórico</th>
                <th className="text-right px-4 py-3">Stock Teórico</th>
                <th className="text-right px-4 py-3">Conteo Físico</th>
                <th className="text-right px-4 py-3">Varianza</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filas.map((fila) => (
                <tr
                  key={fila.materialNombre}
                  className={fila.alertar
                    ? "bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20"
                    : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40"}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{fila.materialNombre}</p>
                    <p className="text-xs text-gray-400">{fila.unidad}</p>
                    {fila.rubrosRelacionados.length > 0 && (
                      <p className="text-xs text-blue-400 mt-0.5 truncate max-w-[200px]" title={fila.rubrosRelacionados.join(", ")}>
                        {fila.rubrosRelacionados.slice(0, 2).join(", ")}{fila.rubrosRelacionados.length > 2 ? ` +${fila.rubrosRelacionados.length - 2}` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                    {fila.recibidoBodega.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
                    {fila.consumoTeorico.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    <span className={fila.stockTeorico < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {fila.stockTeorico.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {fila.conteoFisico !== null ? (
                      <span className="text-gray-900 dark:text-white">{fila.conteoFisico.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Sin conteo</span>
                    )}
                    {fila.fechaConteo && (
                      <span className="block text-xs text-gray-400">{fmtFecha(fila.fechaConteo)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {fila.varianza !== null ? (
                      <span className={fila.varianza < 0 ? "text-red-600 dark:text-red-400" : fila.varianza > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}>
                        {fila.varianza > 0 ? "+" : ""}{fila.varianza.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fila.alertar ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-3 h-3" /> Alerta
                      </span>
                    ) : fila.varianza !== null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrirModal(fila)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 font-medium transition-colors"
                    >
                      Registrar Conteo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Registrar Conteo Físico */}
      {modalMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Conteo Físico de Bodega
              </h2>
              <button onClick={() => setModalMaterial(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGuardarConteo} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Material</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white mt-0.5">{modalMaterial}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Cantidad contada *</label>
                  <input
                    type="number" step="0.001" min="0"
                    value={conteoForm.cantidad}
                    onChange={(e) => setConteoForm((p) => ({ ...p, cantidad: e.target.value }))}
                    className={inputCls} required autoFocus
                  />
                </div>
                <div>
                  <label className={labelCls}>Fecha del conteo</label>
                  <input
                    type="date"
                    value={conteoForm.fecha}
                    onChange={(e) => setConteoForm((p) => ({ ...p, fecha: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Nota (opcional)</label>
                <input
                  type="text"
                  value={conteoForm.nota}
                  onChange={(e) => setConteoForm((p) => ({ ...p, nota: e.target.value }))}
                  placeholder="Ej: Conteo post-lluvia, revisión semanal…"
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setModalMaterial(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancelar
                </button>
                <button type="submit" disabled={pending || !conteoForm.cantidad}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50">
                  <Save className="w-4 h-4" /> {pending ? "Guardando…" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────
export function InventarioClient({
  proyectoId, proyectoNombre,
  ambientes: initialAmbientes,
  recepciones,
  asBuiltPorAmbiente,
  materiales,
  proveedores,
}: Props) {
  const TABS = [
    { id: "ambientes", label: "Ambientes", icon: MapPin },
    { id: "bodega",    label: "Recepción y Bodega", icon: Package },
    { id: "insumos",   label: "Insumos Consolidados", icon: Layers },
    { id: "asbuilt",  label: "Matriz As-Built", icon: BarChart3 },
    { id: "exportar", label: "Exportar Dossier", icon: Download },
    { id: "control",  label: "Control de Stock", icon: ShieldAlert },
  ] as const;

  type TabId = typeof TABS[number]["id"];
  const [tab, setTab] = useState<TabId>("bodega");
  const [ambientes, setAmbientes] = useState(initialAmbientes);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido del tab */}
      {tab === "ambientes" && (
        <TabAmbientes
          proyectoId={proyectoId}
          ambientes={ambientes}
          onCreado={(a) => setAmbientes((p) => [...p, a])}
          onEliminado={(id) => setAmbientes((p) => p.filter((a) => a.id !== id))}
        />
      )}
      {tab === "bodega" && (
        <TabBodega
          proyectoId={proyectoId}
          proyectoNombre={proyectoNombre}
          recepciones={recepciones}
          materiales={materiales}
          proveedores={proveedores}
          onCreada={() => {}}
          onEliminada={() => {}}
        />
      )}
      {tab === "insumos" && (
        <TabInsumosConsolidados proyectoId={proyectoId} proyectoNombre={proyectoNombre} />
      )}
      {tab === "asbuilt" && (
        <TabAsBuilt
          proyectoId={proyectoId}
          proyectoNombre={proyectoNombre}
          ambientes={ambientes}
          recepciones={recepciones}
          asBuiltPorAmbiente={asBuiltPorAmbiente}
        />
      )}
      {tab === "exportar" && (
        <TabExportar
          asBuiltPorAmbiente={asBuiltPorAmbiente}
          proyectoNombre={proyectoNombre}
          proyectoId={proyectoId}
        />
      )}
      {tab === "control" && (
        <TabControlStock proyectoId={proyectoId} />
      )}
    </div>
  );
}
