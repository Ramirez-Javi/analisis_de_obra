"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus, X, Trash2, CheckCircle, Ban, ChevronDown, ChevronUp,
  FileText, Building2, AlertTriangle, ExternalLink, Receipt,
  Eye, Pencil, Printer, Download, BarChart2,
} from "lucide-react";
import {
  crearFactura, actualizarEstadoFactura, eliminarFactura,
  actualizarFactura, registrarPagoFactura,
} from "@/app/proyectos/[id]/compras/actions";
import type {
  NuevaFacturaData, ActualizarFacturaData, RegistrarPagoData,
} from "@/app/proyectos/[id]/compras/actions";
import type { FacturaProveedor, Proveedor, EstadoFactura } from "@prisma/client";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer,
} from "recharts";
import { getEmpresaConfig, openBrandedPrintWindow } from "@/lib/reportHeader";

type MovimientoPago = {
  id: string;
  fecha: Date;
  metodoPago: string;
  otroMetodoDetalle: string | null;
  nroCheque: string | null;
  bancoCheque: string | null;
  fechaEmisionCheque: Date | null;
  fechaCobroCheque: Date | null;
  nroTransaccion: string | null;
  bancoTransfer: string | null;
  autorizadoPor: string | null;
  realizadoPor: string | null;
  observacion: string | null;
  nroComprobante: string | null;
};
type FacturaConMonto = Omit<FacturaProveedor, "monto" | "montoPagado"> & {
  monto: number;
  montoPagado: number;
  movimiento: MovimientoPago | null;
};
type ProveedorConFacturas = Proveedor & { facturas: FacturaConMonto[] };
type ProveedorSelect = { id: string; razonSocial: string; ruc: string | null };

interface Props {
  proyectoId: string;
  proveedores: ProveedorConFacturas[];
  proveedoresDisponibles: ProveedorSelect[];
}

function fmtGs(n: number) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency", currency: "PYG", maximumFractionDigits: 0,
  }).format(n);
}
function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Helpers de impresi\u00f3n ───────────────────────────────────────
const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", CHEQUE: "Cheque",
  TRANSFERENCIA: "Transferencia Bancaria", GIRO: "Giro", OTRO: "Otro",
};

function buildComprobanteFactura(
  proveedor: ProveedorConFacturas,
  factura: FacturaConMonto,
  proyectoId: string,
): string {
  const empresa = getEmpresaConfig(proyectoId);
  const m = factura.movimiento;
  const metodoStr = m
    ? (m.metodoPago === "OTRO" && m.otroMetodoDetalle
        ? m.otroMetodoDetalle
        : (METODO_LABEL[m.metodoPago] ?? m.metodoPago))
    : "—";

  function row(label: string, value: string, bold = false) {
    return `<tr><td style='width:160pt;padding:5pt 8pt 5pt 0;font-size:9pt;color:#6b7280;vertical-align:top'>${label}</td><td style='padding:5pt 0;font-size:9.5pt;color:#111;${bold ? "font-weight:700" : ""}'>${value}</td></tr>`;
  }
  function section(title: string, content: string) {
    return `<div style='margin-bottom:14pt'><div style='font-size:8pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5pt solid #d1d5db;padding-bottom:4pt;margin-bottom:8pt'>${title}</div><table style='width:100%;border-collapse:collapse'>${content}</table></div>`;
  }

  let medioPagoContent = row("Medio de Pago", metodoStr);
  if (m?.metodoPago === "CHEQUE") {
    if (m.bancoCheque) medioPagoContent += row("Banco", m.bancoCheque);
    if (m.nroCheque) medioPagoContent += row("N\u00b0 de Cheque", m.nroCheque);
    if (m.fechaEmisionCheque) medioPagoContent += row("Fecha de Emisi\u00f3n", new Date(m.fechaEmisionCheque).toLocaleDateString("es-PY"));
    if (m.fechaCobroCheque) medioPagoContent += row("Fecha de Cobro", new Date(m.fechaCobroCheque).toLocaleDateString("es-PY"));
  }
  if (m?.metodoPago === "TRANSFERENCIA" || m?.metodoPago === "GIRO") {
    if (m.bancoTransfer) medioPagoContent += row("Banco", m.bancoTransfer);
    if (m.nroTransaccion) medioPagoContent += row("N\u00b0 Transacci\u00f3n", m.nroTransaccion);
  }

  const bodyContent =
    section("Datos del Proveedor",
      row("Raz\u00f3n Social", proveedor.razonSocial, true) +
      (proveedor.ruc ? row("RUC / C\u00e9dula", proveedor.ruc) : ""),
    ) +
    section("Datos de la Factura",
      row("N\u00b0 Factura", factura.nroFactura) +
      row("Fecha", fmtFecha(factura.fecha)) +
      row("Concepto", factura.concepto) +
      row("Importe", `<span style='color:#991b1b;font-weight:700;font-size:11pt'>${fmtGs(factura.monto)}</span>`) +
      row("Estado", factura.estado),
    ) +
    section("Medio de Pago", medioPagoContent) +
    (m?.autorizadoPor || m?.realizadoPor
      ? section("Autorizaci\u00f3n",
          (m?.autorizadoPor ? row("Autoriz\u00f3 el Pago", m.autorizadoPor, true) : "") +
          (m?.realizadoPor ? row("Realizado por", m.realizadoPor) : ""),
        )
      : "") +
    (factura.observacion || m?.observacion
      ? section("Observaciones",
          `<tr><td colspan='2' style='font-size:9pt;color:#374151;padding:4pt 0;font-style:italic'>${factura.observacion ?? m?.observacion ?? ""}</td></tr>`,
        )
      : "") +
    `<div style='margin-top:24pt;padding-top:12pt;border-top:1pt solid #d1d5db;display:flex;gap:40pt'>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Conforme \u2014 Proveedor</div></div>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Firma Autorizante</div></div>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Sello de la Empresa</div></div>` +
    `</div>`;

  openBrandedPrintWindow(
    `Comprobante de Pago \u2014 ${proveedor.razonSocial}`,
    "COMPROBANTE DE PAGO A PROVEEDOR",
    `Factura ${factura.nroFactura} \u00b7 ${fmtFecha(factura.fecha)}`,
    bodyContent,
    empresa,
  );
  return "";
}

function imprimirReporteProveedor(
  proveedor: ProveedorConFacturas,
  proyectoId: string,
) {
  const empresa = getEmpresaConfig(proyectoId);
  const totalFacturado = proveedor.facturas.reduce((a, f) => a + f.monto, 0);
  const totalPagado = proveedor.facturas.filter((f) => f.estado === "PAGADA").reduce((a, f) => a + (f.montoPagado > 0 ? f.montoPagado : f.monto), 0);
  const pendiente = proveedor.facturas.filter((f) => f.estado === "PENDIENTE").reduce((a, f) => a + f.monto, 0);

  const filas = proveedor.facturas.map((f) => {
    const m = f.movimiento;
    const metodo = m ? (m.metodoPago === "OTRO" && m.otroMetodoDetalle ? m.otroMetodoDetalle : (METODO_LABEL[m.metodoPago] ?? m.metodoPago)) : "—";
    const estadoColor = f.estado === "PAGADA" ? "#065f46" : f.estado === "ANULADA" ? "#6b7280" : "#92400e";
    return `<tr style='border-bottom:0.5pt solid #e5e7eb'>
      <td style='padding:6pt 8pt;font-size:9pt'>${fmtFecha(f.fecha)}</td>
      <td style='padding:6pt 8pt;font-size:9pt;font-family:monospace'>${f.nroFactura}</td>
      <td style='padding:6pt 8pt;font-size:9pt;max-width:160pt'>${f.concepto}</td>
      <td style='padding:6pt 8pt;font-size:9pt;text-align:right;font-weight:600;color:#991b1b'>${fmtGs(f.monto)}</td>
      <td style='padding:6pt 8pt;font-size:9pt;text-align:center'><span style='color:${estadoColor};font-weight:600'>${f.estado}</span></td>
      <td style='padding:6pt 8pt;font-size:9pt'>${metodo}</td>
      <td style='padding:6pt 8pt;font-size:9pt'>${m?.autorizadoPor ?? "—"}</td>
    </tr>`;
  }).join("");

  const bodyContent =
    `<div style='margin-bottom:12pt;display:flex;gap:24pt'>` +
      `<div style='flex:1;padding:10pt;background:#f9fafb;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#6b7280'>Total Facturado</div><div style='font-size:13pt;font-weight:700;color:#1e3a8a'>${fmtGs(totalFacturado)}</div></div>` +
      `<div style='flex:1;padding:10pt;background:#f0fdf4;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#15803d'>Total Pagado</div><div style='font-size:13pt;font-weight:700;color:#065f46'>${fmtGs(totalPagado)}</div></div>` +
      `<div style='flex:1;padding:10pt;background:#fefce8;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#92400e'>Saldo Pendiente</div><div style='font-size:13pt;font-weight:700;color:#78350f'>${fmtGs(pendiente)}</div></div>` +
    `</div>` +
    `<div style='margin-bottom:8pt;font-size:9pt'><b>RUC / C\u00e9dula:</b> ${proveedor.ruc ?? "—"} &nbsp; <b>Facturas:</b> ${proveedor.facturas.length}</div>` +
    `<table style='width:100%;border-collapse:collapse;font-size:9pt'>` +
      `<thead><tr style='background:#f3f4f6'><th style='padding:6pt 8pt;text-align:left'>Fecha</th><th style='padding:6pt 8pt;text-align:left'>N\u00b0 Factura</th><th style='padding:6pt 8pt;text-align:left'>Concepto</th><th style='padding:6pt 8pt;text-align:right'>Importe</th><th style='padding:6pt 8pt;text-align:center'>Estado</th><th style='padding:6pt 8pt;text-align:left'>Medio Pago</th><th style='padding:6pt 8pt;text-align:left'>Autoriz\u00f3</th></tr></thead>` +
      `<tbody>${filas}</tbody>` +
    `</table>`;

  openBrandedPrintWindow(
    `Reporte de Pagos \u2014 ${proveedor.razonSocial}`,
    "REPORTE DE PAGOS A PROVEEDOR",
    proveedor.razonSocial + (proveedor.ruc ? ` \u00b7 RUC ${proveedor.ruc}` : ""),
    bodyContent,
    empresa,
  );
}

function imprimirReporteTodosProveedores(
  proveedores: ProveedorConFacturas[],
  proyectoId: string,
) {
  const empresa = getEmpresaConfig(proyectoId);
  const grandTotal = proveedores.flatMap((p) => p.facturas).reduce((a, f) => a + f.monto, 0);
  const grandPagado = proveedores.flatMap((p) => p.facturas).filter((f) => f.estado === "PAGADA").reduce((a, f) => a + (f.montoPagado > 0 ? f.montoPagado : f.monto), 0);
  const grandPendiente = proveedores.flatMap((p) => p.facturas).filter((f) => f.estado === "PENDIENTE").reduce((a, f) => a + f.monto, 0);

  const bloques = proveedores.map((p) => {
    const filas = p.facturas.map((f) => {
      const m = f.movimiento;
      const metodo = m ? (m.metodoPago === "OTRO" && m.otroMetodoDetalle ? m.otroMetodoDetalle : (METODO_LABEL[m.metodoPago] ?? m.metodoPago)) : "—";
      const estadoColor = f.estado === "PAGADA" ? "#065f46" : f.estado === "ANULADA" ? "#6b7280" : "#92400e";
      return `<tr style='border-bottom:0.5pt solid #e5e7eb'>
        <td style='padding:5pt 6pt;font-size:8.5pt'>${fmtFecha(f.fecha)}</td>
        <td style='padding:5pt 6pt;font-size:8.5pt;font-family:monospace'>${f.nroFactura}</td>
        <td style='padding:5pt 6pt;font-size:8.5pt;max-width:140pt'>${f.concepto}</td>
        <td style='padding:5pt 6pt;font-size:8.5pt;text-align:right;color:#991b1b;font-weight:600'>${fmtGs(f.monto)}</td>
        <td style='padding:5pt 6pt;font-size:8.5pt;text-align:center;color:${estadoColor};font-weight:600'>${f.estado}</td>
        <td style='padding:5pt 6pt;font-size:8.5pt'>${metodo}</td>
      </tr>`;
    }).join("");
    const totProv = p.facturas.reduce((a, f) => a + f.monto, 0);
    return `<div style='margin-bottom:18pt'>
      <div style='background:#f3f4f6;padding:6pt 8pt;border-radius:4pt;margin-bottom:4pt;display:flex;justify-content:space-between'>
        <span style='font-size:10pt;font-weight:700;color:#1e3a8a'>${p.razonSocial}</span>
        <span style='font-size:9pt;color:#6b7280'>${p.ruc ? `RUC: ${p.ruc} \u00b7 ` : ""}${p.facturas.length} facturas \u00b7 Total: <b>${fmtGs(totProv)}</b></span>
      </div>
      <table style='width:100%;border-collapse:collapse'>
        <thead><tr style='background:#f9fafb;font-size:8pt;color:#6b7280'><th style='padding:4pt 6pt;text-align:left'>Fecha</th><th style='padding:4pt 6pt;text-align:left'>N\u00b0 Factura</th><th style='padding:4pt 6pt;text-align:left'>Concepto</th><th style='padding:4pt 6pt;text-align:right'>Importe</th><th style='padding:4pt 6pt;text-align:center'>Estado</th><th style='padding:4pt 6pt;text-align:left'>Medio Pago</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
  }).join("");

  const bodyContent =
    `<div style='margin-bottom:14pt;display:flex;gap:20pt'>` +
      `<div style='flex:1;padding:8pt;background:#f9fafb;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#6b7280'>Proveedores</div><div style='font-size:14pt;font-weight:700;color:#111'>${proveedores.length}</div></div>` +
      `<div style='flex:1;padding:8pt;background:#f9fafb;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#6b7280'>Total Facturado</div><div style='font-size:12pt;font-weight:700;color:#1e3a8a'>${fmtGs(grandTotal)}</div></div>` +
      `<div style='flex:1;padding:8pt;background:#f0fdf4;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#15803d'>Total Pagado</div><div style='font-size:12pt;font-weight:700;color:#065f46'>${fmtGs(grandPagado)}</div></div>` +
      `<div style='flex:1;padding:8pt;background:#fefce8;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#92400e'>Saldo Pendiente</div><div style='font-size:12pt;font-weight:700;color:#78350f'>${fmtGs(grandPendiente)}</div></div>` +
    `</div>` + bloques;

  openBrandedPrintWindow(
    "Reporte General de Proveedores y Pagos",
    "REPORTE GENERAL DE PROVEEDORES Y PAGOS",
    `${proveedores.length} proveedor${proveedores.length !== 1 ? "es" : ""} \u00b7 ${proveedores.flatMap((p) => p.facturas).length} facturas`,
    bodyContent,
    empresa,
  );
}

// ─── Badge de estado ──────────────────────────────────────────
function BadgeEstado({ estado }: { estado: EstadoFactura }) {
  const map: Record<EstadoFactura, { label: string; cls: string }> = {
    PENDIENTE: { label: "Pendiente", cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
    PAGADA:    { label: "Pagada",    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
    ANULADA:   { label: "Anulada",   cls: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 line-through" },
  };
  const cfg = map[estado] ?? map.PENDIENTE;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Modal: Detalle de Factura ─────────────────────────────────
function ModalDetalleFactura({
  factura, proveedor, proyectoId, onClose, onEditar, onRegistrarPago,
}: {
  factura: FacturaConMonto;
  proveedor: ProveedorConFacturas;
  proyectoId: string;
  onClose: () => void;
  onEditar: () => void;
  onRegistrarPago: () => void;
}) {
  const m = factura.movimiento;
  const metodoStr = m
    ? (m.metodoPago === "OTRO" && m.otroMetodoDetalle ? m.otroMetodoDetalle : (METODO_LABEL[m.metodoPago] ?? m.metodoPago))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Factura {factura.nroFactura}</p>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{factura.concepto}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Importe */}
          <div className="rounded-xl p-4 flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Importe de Factura</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{fmtGs(factura.monto)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
              <BadgeEstado estado={factura.estado} />
            </div>
          </div>

          {/* Info básica */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Proveedor</p>
              <p className="font-semibold text-gray-900 dark:text-white">{proveedor.razonSocial}</p>
              {proveedor.ruc && <p className="text-xs text-gray-400 mt-0.5">RUC {proveedor.ruc}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
              <p className="font-medium text-gray-900 dark:text-white">{new Date(factura.fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
            {factura.fechaVencimiento && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Vencimiento</p>
                <p className="font-medium text-gray-900 dark:text-white">{new Date(factura.fechaVencimiento).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}</p>
              </div>
            )}
          </div>

          {/* Pago registrado */}
          {m ? (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Datos del Pago</p>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 space-y-3 text-sm">
                  {/* Fila 1: fecha + comprobante */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Fecha de Pago</p>
                      <p className="font-medium text-gray-900 dark:text-white">{new Date(m.fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">N° Comprobante</p>
                      <p className={`font-mono ${m.nroComprobante ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 italic"}`}>{m.nroComprobante ?? "—"}</p>
                    </div>
                  </div>
                  {/* Fila 2: método */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Medio de Pago</p>
                      <p className="font-medium text-gray-900 dark:text-white">{metodoStr ?? "—"}</p>
                    </div>
                  </div>
                  {/* Sub-sección CHEQUE */}
                  {m.metodoPago === "CHEQUE" && (
                    <div className="rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-2 space-y-1">
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Cheque</p>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-xs text-gray-500">Banco: <span className={`font-medium ${m.bancoCheque ? "text-gray-900 dark:text-white" : "text-gray-400 italic"}`}>{m.bancoCheque ?? "—"}</span></span>
                        <span className="text-xs text-gray-500">N°: <span className={`font-mono ${m.nroCheque ? "text-gray-900 dark:text-white" : "text-gray-400 italic"}`}>{m.nroCheque ?? "—"}</span></span>
                        <span className="text-xs text-gray-500">Emisión: <span className={m.fechaEmisionCheque ? "text-gray-900 dark:text-white" : "text-gray-400 italic"}>{m.fechaEmisionCheque ? new Date(m.fechaEmisionCheque).toLocaleDateString("es-PY") : "—"}</span></span>
                        <span className="text-xs text-gray-500">Cobro: <span className={m.fechaCobroCheque ? "text-gray-900 dark:text-white" : "text-gray-400 italic"}>{m.fechaCobroCheque ? new Date(m.fechaCobroCheque).toLocaleDateString("es-PY") : "—"}</span></span>
                      </div>
                    </div>
                  )}
                  {/* Sub-sección TRANSFERENCIA/GIRO */}
                  {(m.metodoPago === "TRANSFERENCIA" || m.metodoPago === "GIRO") && (
                    <div className="rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 space-y-1">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Transferencia</p>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-xs text-gray-500">Banco: <span className={`font-medium ${m.bancoTransfer ? "text-gray-900 dark:text-white" : "text-gray-400 italic"}`}>{m.bancoTransfer ?? "—"}</span></span>
                        <span className="text-xs text-gray-500">N° TX: <span className={`font-mono ${m.nroTransaccion ? "text-gray-900 dark:text-white" : "text-gray-400 italic"}`}>{m.nroTransaccion ?? "—"}</span></span>
                      </div>
                    </div>
                  )}
                  {/* Autorización */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Autorizó el pago</p>
                      <p className={`font-semibold text-sm ${m.autorizadoPor ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 italic"}`}>{m.autorizadoPor ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Realizado por</p>
                      <p className={`font-medium text-sm ${m.realizadoPor ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 italic"}`}>{m.realizadoPor ?? "—"}</p>
                    </div>
                  </div>
                  {/* Observación */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Observación</p>
                    <p className={`text-xs rounded p-2 ${m.observacion ? "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 italic" : "text-gray-400 dark:text-gray-500 italic"}`}>
                      {m.observacion ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : factura.estado === "PENDIENTE" ? (
            <div className="rounded-lg border border-dashed border-yellow-300 dark:border-yellow-700 p-4 text-center">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Sin pago registrado</p>
              <p className="text-xs text-gray-400 mt-1">Esta factura está pendiente. Podés registrar el pago con los datos del medio utilizado.</p>
              <button
                onClick={() => { onClose(); onRegistrarPago(); }}
                className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
              >
                Registrar Pago
              </button>
            </div>
          ) : null}

          {factura.observacion && !factura.movimiento?.observacion && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Observaciones de factura</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{factura.observacion}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cerrar</button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEditar(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
            {factura.estado !== "PENDIENTE" || factura.movimiento ? (
              <button
                onClick={() => { buildComprobanteFactura(proveedor, factura, proyectoId); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Editar Factura ──────────────────────────────────────
function ModalEditarFactura({
  factura, proyectoId, onClose, onActualizada,
}: {
  factura: FacturaConMonto;
  proyectoId: string;
  onClose: () => void;
  onActualizada: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const toDateInput = (d: Date | string | null) => d ? new Date(d).toISOString().split("T")[0] : "";
  const [form, setForm] = useState<Partial<ActualizarFacturaData>>({
    nroFactura: factura.nroFactura,
    fecha: toDateInput(factura.fecha),
    concepto: factura.concepto,
    monto: factura.monto,
    fechaVencimiento: toDateInput(factura.fechaVencimiento ?? null),
    observacion: factura.observacion ?? "",
  });
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nroFactura || !form.concepto || !form.monto) {
      toast.error("Completá los campos obligatorios");
      return;
    }
    startTransition(async () => {
      const res = await actualizarFactura(proyectoId, factura.id, form as ActualizarFacturaData);
      if (res.ok) {
        toast.success("Factura actualizada");
        onActualizada();
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Editar Factura
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° Factura *</label>
              <input type="text" value={form.nroFactura ?? ""} onChange={(e) => set("nroFactura", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
              <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Concepto *</label>
            <input type="text" value={form.concepto ?? ""} onChange={(e) => set("concepto", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto (Gs.) *</label>
              <input type="number" min={0} step="1" value={form.monto ?? ""} onChange={(e) => set("monto", parseFloat(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vencimiento</label>
              <input type="date" value={form.fechaVencimiento ?? ""} onChange={(e) => set("fechaVencimiento", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observación</label>
            <textarea rows={2} value={form.observacion ?? ""} onChange={(e) => set("observacion", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
              {pending ? "Guardando…" : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Registrar Pago ─────────────────────────────────────
const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
  { value: "GIRO", label: "Giro" },
  { value: "OTRO", label: "Otro (especificar)" },
];

function ModalRegistrarPago({
  factura, proveedor, proyectoId, onClose, onPagado,
}: {
  factura: FacturaConMonto;
  proveedor: ProveedorConFacturas;
  proyectoId: string;
  onClose: () => void;
  onPagado: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Partial<RegistrarPagoData> & { metodoPago: string }>({
    metodoPago: "EFECTIVO",
    fecha: new Date().toISOString().split("T")[0],
    montoPagado: factura.monto,
  });
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fecha || !form.montoPagado) {
      toast.error("Completá la fecha y el monto");
      return;
    }
    startTransition(async () => {
      const res = await registrarPagoFactura(
        proyectoId,
        factura.id,
        proveedor.id,
        proveedor.razonSocial,
        factura.concepto,
        form as RegistrarPagoData,
      );
      if (res.ok) {
        toast.success("Pago registrado");
        onPagado();
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Registrar Pago
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{proveedor.razonSocial} — Factura {factura.nroFactura}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha de Pago *</label>
              <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto Pagado (Gs.) *</label>
              <input type="number" min={0} step="1" value={form.montoPagado ?? ""} onChange={(e) => set("montoPagado", parseFloat(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° Comprobante</label>
              <input type="text" value={form.nroComprobante ?? ""} onChange={(e) => set("nroComprobante", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Autorizó el pago</label>
              <input type="text" value={form.autorizadoPor ?? ""} onChange={(e) => set("autorizadoPor", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Realizado por</label>
            <input type="text" value={form.realizadoPor ?? ""} onChange={(e) => set("realizadoPor", e.target.value)}
              placeholder="Ej: Carlos Rodríguez — Tesorero"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Medio de Pago *</label>
            <select value={form.metodoPago} onChange={(e) => set("metodoPago", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {form.metodoPago === "CHEQUE" && (
            <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 space-y-3">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Datos del Cheque</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Banco</label>
                  <input type="text" value={form.bancoCheque ?? ""} onChange={(e) => set("bancoCheque", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">N° de Cheque</label>
                  <input type="text" value={form.nroCheque ?? ""} onChange={(e) => set("nroCheque", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de Emisión</label>
                  <input type="date" value={form.fechaEmisionCheque ?? ""} onChange={(e) => set("fechaEmisionCheque", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de Cobro</label>
                  <input type="date" value={form.fechaCobroCheque ?? ""} onChange={(e) => set("fechaCobroCheque", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}
          {(form.metodoPago === "TRANSFERENCIA" || form.metodoPago === "GIRO") && (
            <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Datos de la Transferencia</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Banco</label>
                  <input type="text" value={form.bancoTransfer ?? ""} onChange={(e) => set("bancoTransfer", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">N° de Transacción</label>
                  <input type="text" value={form.nroTransaccion ?? ""} onChange={(e) => set("nroTransaccion", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}
          {form.metodoPago === "OTRO" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Especificar</label>
              <input type="text" value={form.otroMetodoDetalle ?? ""} onChange={(e) => set("otroMetodoDetalle", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observación</label>
            <textarea rows={2} value={form.observacion ?? ""} onChange={(e) => set("observacion", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
              {pending ? "Registrando…" : "Confirmar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Cargar Factura ─────────────────────────────────────
function ModalCargarFactura({
  proyectoId,
  proveedoresDisponibles,
  proveedorPreseleccionado,
  onClose,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCreada: _onCreada,
}: {
  proyectoId: string;
  proveedoresDisponibles: ProveedorSelect[];
  proveedorPreseleccionado?: string;
  onClose: () => void;
  onCreada: (factura: FacturaProveedor, proveedorId: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Partial<NuevaFacturaData>>({
    fecha: new Date().toISOString().split("T")[0],
    proveedorId: proveedorPreseleccionado ?? "",
  });
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.proveedorId || !form.nroFactura || !form.concepto || !form.monto) {
      toast.error("Completá todos los campos obligatorios");
      return;
    }
    startTransition(async () => {
      const res = await crearFactura(proyectoId, form as NuevaFacturaData);
      if (res.ok) {
        toast.success("Factura cargada");
        // Recargar la página para reflejar el nuevo estado del servidor
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Cargar Factura
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Proveedor *</label>
            <select
              value={form.proveedorId ?? ""}
              onChange={(e) => set("proveedorId", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
              required
            >
              <option value="">— Seleccioná un proveedor —</option>
              {proveedoresDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razonSocial}{p.ruc ? ` — ${p.ruc}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              ¿No encontrás el proveedor?{" "}
              <Link href="/compras" className="text-blue-500 hover:underline">
                Ir a Directorio de Proveedores →
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° Factura *</label>
              <input type="text" value={form.nroFactura ?? ""} onChange={(e) => set("nroFactura", e.target.value)}
                placeholder="001-001-0001234"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
              <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Concepto *</label>
            <input type="text" value={form.concepto ?? ""} onChange={(e) => set("concepto", e.target.value)}
              placeholder="Ej: Materiales de construcción — cemento, arena"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto (Gs.) *</label>
              <input type="number" min={0} step="1" value={form.monto ?? ""} onChange={(e) => set("monto", parseFloat(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vencimiento</label>
              <input type="date" value={form.fechaVencimiento ?? ""} onChange={(e) => set("fechaVencimiento", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observación</label>
            <textarea rows={2} value={form.observacion ?? ""} onChange={(e) => set("observacion", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
              {pending ? "Guardando…" : "Cargar Factura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Colores para gráfico de torta (UI y print) ─────────────
const PIE_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ec4899", "#06b6d4", "#84cc16", "#6366f1", "#14b8a6",
];

// ─── Imprimir / Exportar PDF: análisis de pagos ─────────────
function imprimirAnalisisPagos(
  proveedores: ProveedorConFacturas[],
  proyectoId: string,
) {
  const empresa = getEmpresaConfig(proyectoId);

  const data = proveedores
    .map((p) => ({
      nombre: p.razonSocial,
      ruc: p.ruc ?? null,
      pagado: p.facturas
        .filter((f) => f.estado === "PAGADA")
        .reduce((a, f) => a + (f.montoPagado > 0 ? f.montoPagado : f.monto), 0),
      facturasPagadas: p.facturas.filter((f) => f.estado === "PAGADA").length,
      totalFacturas: p.facturas.length,
    }))
    .filter((p) => p.pagado > 0)
    .sort((a, b) => b.pagado - a.pagado);

  const totalPagado = data.reduce((a, p) => a + p.pagado, 0);
  if (totalPagado === 0) return;

  // Colores sólidos aptos para impresión
  const PRINT_COLORS = [
    "#ea580c","#2563eb","#16a34a","#7c3aed","#d97706",
    "#db2777","#0891b2","#65a30d","#4f46e5","#0d9488",
  ];

  const barras = data.map((p, i) => {
    const pct = (p.pagado / totalPagado) * 100;
    const color = PRINT_COLORS[i % PRINT_COLORS.length];
    return `<div style='margin-bottom:9pt'>` +
      `<div style='display:flex;align-items:center;gap:8pt;margin-bottom:3pt'>` +
        `<div style='width:9pt;height:9pt;border-radius:2pt;background:${color};flex-shrink:0'></div>` +
        `<span style='font-size:9pt;font-weight:600;flex:1;color:#111'>${p.nombre}</span>` +
        `<span style='font-size:9pt;font-weight:700;color:${color};width:46pt;text-align:right'>${pct.toFixed(1)}%</span>` +
        `<span style='font-size:9pt;width:115pt;text-align:right;color:#374151'>${fmtGs(p.pagado)}</span>` +
      `</div>` +
      `<div style='height:9pt;background:#f3f4f6;border-radius:4pt;overflow:hidden;margin-left:17pt;border:0.3pt solid #e5e7eb'>` +
        `<div style='height:100%;width:${pct}%;background:${color};border-radius:4pt'></div>` +
      `</div>` +
    `</div>`;
  }).join("");

  const filas = data.map((p, i) => {
    const pct = (p.pagado / totalPagado) * 100;
    const color = PRINT_COLORS[i % PRINT_COLORS.length];
    const bg = i % 2 === 1 ? "background:#f8fafc;" : "";
    return `<tr style='${bg}border-bottom:0.5pt solid #e5e7eb'>` +
      `<td style='padding:5pt 6pt;text-align:center'>` +
        `<div style='width:17pt;height:17pt;border-radius:50%;background:${color};color:white;font-size:7.5pt;font-weight:700;text-align:center;line-height:17pt;margin:0 auto'>${i + 1}</div>` +
      `</td>` +
      `<td style='padding:5pt 6pt;font-weight:600;color:#111'>` +
        p.nombre + (p.ruc ? `<br><span style='font-size:7.5pt;color:#6b7280;font-weight:400'>RUC ${p.ruc}</span>` : "") +
      `</td>` +
      `<td style='padding:5pt 6pt;text-align:right;color:#374151'>${p.facturasPagadas} / ${p.totalFacturas}</td>` +
      `<td style='padding:5pt 6pt;text-align:right;font-weight:700;color:#991b1b'>${fmtGs(p.pagado)}</td>` +
      `<td style='padding:5pt 6pt;text-align:right;font-weight:700;color:${color}'>${pct.toFixed(2)}%</td>` +
      `<td style='padding:5pt 6pt;min-width:80pt'>` +
        `<div style='height:8pt;background:#f3f4f6;border-radius:4pt;overflow:hidden;border:0.3pt solid #e5e7eb'>` +
          `<div style='height:100%;width:${pct}%;background:${color};border-radius:4pt'></div>` +
        `</div>` +
      `</td>` +
    `</tr>`;
  }).join("");

  const totalFact = data.reduce((a, p) => a + p.facturasPagadas, 0);

  const bodyContent =
    `<div class='kpis'>` +
      `<div class='kpi'><div class='label'>Total Desembolsado</div><div class='value' style='color:#991b1b'>${fmtGs(totalPagado)}</div></div>` +
      `<div class='kpi'><div class='label'>Proveedores con Pagos</div><div class='value'>${data.length}</div></div>` +
      `<div class='kpi'><div class='label'>Facturas Pagadas</div><div class='value'>${totalFact}</div></div>` +
    `</div>` +
    `<h2>Distribución Visual de Pagos</h2>` +
    `<div style='padding:12pt;border:0.5pt solid #d1d5db;border-radius:6pt;background:#fafafa;margin-bottom:12pt'>` +
      barras +
    `</div>` +
    `<h2>Planilla de Distribución por Proveedor</h2>` +
    `<table>` +
      `<thead><tr style='background:#f3f4f6'>` +
        `<th style='text-align:center;width:22pt'>#</th>` +
        `<th style='text-align:left'>Proveedor</th>` +
        `<th style='text-align:right;width:70pt'>Fact. pagadas</th>` +
        `<th style='text-align:right;width:100pt'>Total Pagado (Gs.)</th>` +
        `<th style='text-align:right;width:55pt'>% del Total</th>` +
        `<th style='text-align:left;min-width:80pt'>Participación</th>` +
      `</tr></thead>` +
      `<tbody>${filas}</tbody>` +
      `<tfoot><tr style='background:#f3f4f6;border-top:1pt solid #9ca3af'>` +
        `<td></td>` +
        `<td style='padding:6pt;font-weight:700'>Total desembolsado</td>` +
        `<td style='padding:6pt;text-align:right;font-weight:700'>${totalFact} facturas</td>` +
        `<td style='padding:6pt;text-align:right;font-weight:700;color:#991b1b'>${fmtGs(totalPagado)}</td>` +
        `<td style='padding:6pt;text-align:right;font-weight:700'>100%</td>` +
        `<td></td>` +
      `</tr></tfoot>` +
    `</table>`;

  openBrandedPrintWindow(
    "Análisis de Pagos a Proveedores",
    "ANÁLISIS DE PAGOS A PROVEEDORES",
    `${data.length} proveedor${data.length !== 1 ? "es" : ""} \u00b7 ${totalFact} facturas pagadas`,
    bodyContent,
    empresa,
  );
}

// ─── Tab: Análisis de pagos por proveedor ─────────────────────
function TabGraficos({ proveedores, proyectoId }: { proveedores: ProveedorConFacturas[]; proyectoId: string }) {
  const data = useMemo(() => {
    return proveedores
      .map((p) => ({
        nombre: p.razonSocial,
        ruc: p.ruc ?? null,
        pagado: p.facturas
          .filter((f) => f.estado === "PAGADA")
          .reduce((a, f) => a + (f.montoPagado > 0 ? f.montoPagado : f.monto), 0),
        facturasPagadas: p.facturas.filter((f) => f.estado === "PAGADA").length,
        totalFacturas: p.facturas.length,
      }))
      .filter((p) => p.pagado > 0)
      .sort((a, b) => b.pagado - a.pagado);
  }, [proveedores]);

  const totalPagado = useMemo(
    () => data.reduce((a, p) => a + p.pagado, 0),
    [data],
  );

  if (totalPagado === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500 space-y-2">
        <BarChart2 className="w-10 h-10 mx-auto text-gray-200 dark:text-gray-700" />
        <p className="font-medium">Sin pagos registrados</p>
        <p className="text-xs">
          Registrá pagos a proveedores para ver el análisis de distribución aquí.
        </p>
      </div>
    );
  }

  // Botones de descarga/impresión (inline JSX, no component)
  const botonesExport = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => imprimirAnalisisPagos(proveedores, proyectoId)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Imprimir reporte"
      >
        <Printer className="w-4 h-4" /> Imprimir
      </button>
      <button
        onClick={() => imprimirAnalisisPagos(proveedores, proyectoId)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Exportar como PDF (guardar como PDF en el diálogo de impresión)"
      >
        <Download className="w-4 h-4" /> Exportar PDF
      </button>
    </div>
  );

  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({
    cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0,
  }: {
    cx?: number; cy?: number; midAngle?: number;
    innerRadius?: number; outerRadius?: number; percent?: number;
  }) => {
    if (percent < 0.04) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x} y={y} fill="white"
        textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight={700}
      >
        {(percent * 100).toFixed(1)}%
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de torta + leyenda */}
      <section className="rounded-xl border dark:border-gray-700 border-gray-200 dark:bg-gray-900 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b dark:border-gray-700 border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold dark:text-white text-gray-900">
              Distribución de pagos a proveedores
            </h3>
            <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5">
              Total desembolsado:{" "}
              <span className="font-semibold dark:text-gray-200 text-gray-700">
                {fmtGs(totalPagado)}
              </span>
            </p>
          </div>
          {botonesExport}
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 p-6">
          {/* Donut chart */}
          <div className="w-full md:w-[280px] shrink-0">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="pagado"
                  nameKey="nombre"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <ChartTooltip
                  formatter={(value, name) => [fmtGs(Number(value)), String(name)]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#e2e8f0", fontWeight: 700 }}
                  itemStyle={{ color: "#94a3b8" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda lateral */}
          <div className="flex-1 space-y-3 w-full">
            {data.map((p, i) => {
              const pct = (p.pagado / totalPagado) * 100;
              const color = PIE_COLORS[i % PIE_COLORS.length];
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs dark:text-gray-300 text-gray-700 flex-1 truncate font-medium">
                      {p.nombre}
                    </span>
                    <span className="text-xs font-bold tabular-nums shrink-0" style={{ color }}>
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-xs font-mono dark:text-gray-400 text-gray-500 shrink-0 w-[110px] text-right">
                      {fmtGs(p.pagado)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full dark:bg-gray-700 bg-gray-100 overflow-hidden ml-5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planilla de distribución */}
      <section className="rounded-xl border dark:border-gray-700 border-gray-200 dark:bg-gray-900 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b dark:border-gray-700 border-gray-100">
          <h3 className="text-sm font-bold dark:text-white text-gray-900">Planilla de distribución</h3>
          <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5">
            Montos y porcentajes basados en pagos efectuados (facturas en estado PAGADA)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="dark:bg-gray-800/50 bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5 text-center w-8">#</th>
                <th className="px-4 py-2.5 text-left">Proveedor</th>
                <th className="px-4 py-2.5 text-right">Fact. pagadas</th>
                <th className="px-4 py-2.5 text-right">Total pagado (Gs)</th>
                <th className="px-4 py-2.5 text-right w-24">% del total</th>
                <th className="px-4 py-2.5 text-left min-w-[140px]">Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800 divide-gray-100">
              {data.map((p, i) => {
                const pct = (p.pagado / totalPagado) * 100;
                const color = PIE_COLORS[i % PIE_COLORS.length];
                return (
                  <tr key={i} className="dark:hover:bg-gray-800/30 hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold dark:text-white text-gray-900 leading-tight">{p.nombre}</p>
                      {p.ruc && (
                        <p className="text-xs dark:text-gray-500 text-gray-400">RUC {p.ruc}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-medium dark:text-gray-300 text-gray-600 tabular-nums">
                        {p.facturasPagadas}
                        <span className="dark:text-gray-600 text-gray-300"> / {p.totalFacturas}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold dark:text-white text-gray-900 whitespace-nowrap">
                      {fmtGs(p.pagado)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold tabular-nums" style={{ color }}>
                        {pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2 rounded-full dark:bg-gray-700 bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 dark:border-gray-600 border-gray-300 dark:bg-gray-800/60 bg-gray-50">
                <td />
                <td className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider dark:text-gray-400 text-gray-500">
                  Total desembolsado a proveedores
                </td>
                <td className="px-4 py-3.5 text-right text-xs dark:text-gray-400 text-gray-500 font-medium tabular-nums">
                  {data.reduce((a, p) => a + p.facturasPagadas, 0)} facturas
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold text-base dark:text-white text-gray-900 whitespace-nowrap">
                  {fmtGs(totalPagado)}
                </td>
                <td className="px-4 py-3.5 text-right font-bold dark:text-gray-200 text-gray-700">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Fila de proveedor (expandible con sus facturas) ─────────
function FilaProveedor({
  proyectoId,
  proveedor,
  onFacturaActualizada,
  onFacturaEliminada,
  onCargarFactura,
  onVerDetalle,
  onEditar,
  onRegistrarPago,
}: {
  proyectoId: string;
  proveedor: ProveedorConFacturas;
  onFacturaActualizada: (provId: string, factId: string, estado: EstadoFactura) => void;
  onFacturaEliminada: (provId: string, factId: string) => void;
  onCargarFactura: (proveedorId: string) => void;
  onVerDetalle: (f: FacturaConMonto) => void;
  onEditar: (f: FacturaConMonto) => void;
  onRegistrarPago: (f: FacturaConMonto) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const totalFacturado = proveedor.facturas.reduce((a, f) => a + f.monto, 0);
  const totalPagado = proveedor.facturas
    .filter((f) => f.estado === "PAGADA")
    .reduce((a, f) => a + (f.montoPagado > 0 ? f.montoPagado : f.monto), 0);
  const saldoPendiente = proveedor.facturas
    .filter((f) => f.estado === "PENDIENTE")
    .reduce((a, f) => a + f.monto, 0);
  const tienePendientes = saldoPendiente > 0;

  function handleCambiarEstado(facturaId: string, estado: EstadoFactura) {
    const label = estado === "PAGADA" ? "marcar como pagada" : "anular";
    if (!confirm(`¿Querés ${label} esta factura?`)) return;
    startTransition(async () => {
      const res = await actualizarEstadoFactura(proyectoId, facturaId, estado);
      if (res.ok) {
        onFacturaActualizada(proveedor.id, facturaId, estado);
        toast.success("Factura actualizada");
      } else toast.error(res.error);
    });
  }

  function handleEliminar(facturaId: string) {
    if (!confirm("¿Eliminar esta factura definitivamente?")) return;
    startTransition(async () => {
      const res = await eliminarFactura(proyectoId, facturaId);
      if (res.ok) {
        onFacturaEliminada(proveedor.id, facturaId);
        toast.success("Factura eliminada");
      } else toast.error(res.error);
    });
  }

  return (
    <div className={`rounded-xl border transition-colors ${
      tienePendientes
        ? "border-yellow-200 dark:border-yellow-800"
        : "border-gray-200 dark:border-gray-700"
    } bg-white dark:bg-gray-900`}>
      {/* Cabecera del proveedor */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{proveedor.razonSocial}</p>
          {proveedor.ruc && <p className="text-xs text-gray-400">RUC: {proveedor.ruc}</p>}
        </div>

        {/* Resumen */}
        <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
          <div>
            <p className="text-xs text-gray-400">Facturas</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">{proveedor.facturas.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{fmtGs(totalFacturado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Pagado</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{fmtGs(totalPagado)}</p>
          </div>
          {tienePendientes && (
            <div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Pendiente</p>
              <p className="font-bold text-yellow-700 dark:text-yellow-300 text-sm">{fmtGs(saldoPendiente)}</p>
            </div>
          )}
        </div>

        {tienePendientes && (
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); imprimirReporteProveedor(proveedor, proyectoId); }}
          title="Imprimir reporte de pagos"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
        >
          <Printer className="w-4 h-4" />
        </button>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </div>

      {/* Panel expandido: facturas */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Resumen mobile */}
          <div className="sm:hidden grid grid-cols-3 gap-2 p-4 pb-0 text-center text-sm">
            <div>
              <p className="text-xs text-gray-400">Total Facturado</p>
              <p className="font-semibold text-gray-900 dark:text-white">{fmtGs(totalFacturado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pagado</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtGs(totalPagado)}</p>
            </div>
            <div>
              <p className="text-xs text-yellow-500">Pendiente</p>
              <p className="font-bold text-yellow-700 dark:text-yellow-300">{fmtGs(saldoPendiente)}</p>
            </div>
          </div>

          {/* Tabla de facturas */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">N° Factura</th>
                  <th className="px-4 py-2 text-left">Concepto</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2 text-center">Estado</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {proveedor.facturas.map((f) => (
                  <tr key={f.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${f.estado === "ANULADA" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">{fmtFecha(f.fecha)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{f.nroFactura}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[220px]">
                      <p className="truncate">{f.concepto}</p>
                      {f.observacion && <p className="text-xs text-gray-400 truncate">{f.observacion}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {fmtGs(f.monto)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <BadgeEstado estado={f.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onVerDetalle(f)}
                          title="Ver detalle"
                          className="text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditar(f)}
                          title="Editar factura"
                          className="text-gray-300 hover:text-indigo-500 dark:text-gray-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {f.estado === "PENDIENTE" && (
                          <button
                            onClick={() => onRegistrarPago(f)}
                            title="Registrar pago"
                            className="text-gray-300 hover:text-emerald-500 dark:text-gray-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {f.estado !== "ANULADA" && (
                          <button
                            onClick={() => handleCambiarEstado(f.id, "ANULADA")}
                            title="Anular factura"
                            className="text-gray-300 hover:text-orange-500 dark:text-gray-600 dark:hover:text-orange-400 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminar(f.id)}
                          title="Eliminar"
                          className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Acción: nueva factura a este proveedor */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => onCargarFactura(proveedor.id)}
              className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Cargar factura de {proveedor.razonSocial}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function ComprasClient({ proyectoId, proveedores: initial, proveedoresDisponibles }: Props) {
  const [proveedores, setProveedores] = useState(initial);
  const [modal, setModal] = useState<{ proveedorId?: string } | null>(null);
  const [detalleFactura, setDetalleFactura] = useState<{ factura: FacturaConMonto; proveedor: ProveedorConFacturas } | null>(null);
  const [editarFactura, setEditarFactura] = useState<{ factura: FacturaConMonto; proveedor: ProveedorConFacturas } | null>(null);
  const [pagarFactura, setPagarFactura] = useState<{ factura: FacturaConMonto; proveedor: ProveedorConFacturas } | null>(null);
  const [activeTab, setActiveTab] = useState<"proveedores" | "graficos">("proveedores");

  const totalProveedores = proveedores.length;
  const totalFacturado = proveedores.flatMap((p) => p.facturas).reduce((a, f) => a + f.monto, 0);
  const totalPagado = proveedores.flatMap((p) => p.facturas)
    .filter((f) => f.estado === "PAGADA")
    .reduce((a, f) => a + (f.montoPagado > 0 ? f.montoPagado : f.monto), 0);
  const totalPendiente = proveedores.flatMap((p) => p.facturas)
    .filter((f) => f.estado === "PENDIENTE")
    .reduce((a, f) => a + f.monto, 0);

  function handleFacturaActualizada(provId: string, factId: string, estado: EstadoFactura) {
    setProveedores((prev) =>
      prev.map((p) =>
        p.id === provId
          ? { ...p, facturas: p.facturas.map((f) => f.id === factId ? { ...f, estado } : f) }
          : p
      )
    );
  }

  function handleFacturaEliminada(provId: string, factId: string) {
    setProveedores((prev) =>
      prev.map((p) =>
        p.id === provId
          ? { ...p, facturas: p.facturas.filter((f) => f.id !== factId) }
          : p
      ).filter((p) => p.facturas.length > 0)
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Proveedores</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProveedores}</p>
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <p className="text-xs text-blue-600 dark:text-blue-400">Total Facturado</p>
          <p className="text-lg font-bold text-blue-800 dark:text-blue-200 truncate">{fmtGs(totalFacturado)}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">Por Pagar</p>
          <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200 truncate">{fmtGs(totalPendiente)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Pagado</p>
          <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200 truncate">{fmtGs(totalPagado)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-800 border-gray-200">
        <button
          onClick={() => setActiveTab("proveedores")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
            activeTab === "proveedores"
              ? "border-orange-500 dark:text-orange-400 text-orange-600"
              : "border-transparent dark:text-gray-400 text-gray-500 dark:hover:text-gray-200 hover:text-gray-700"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Proveedores
        </button>
        <button
          onClick={() => setActiveTab("graficos")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
            activeTab === "graficos"
              ? "border-orange-500 dark:text-orange-400 text-orange-600"
              : "border-transparent dark:text-gray-400 text-gray-500 dark:hover:text-gray-200 hover:text-gray-700"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Análisis de Pagos
        </button>
      </div>

      {activeTab === "proveedores" && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Proveedores en este proyecto
            </h2>
            <div className="flex items-center gap-2">
              {proveedores.length > 0 && (
                <button
                  onClick={() => imprimirReporteTodosProveedores(proveedores, proyectoId)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Download className="w-4 h-4" /> Imprimir Reporte
                </button>
              )}
              <button
                onClick={() => setModal({})}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Cargar Factura
              </button>
            </div>
          </div>

          {/* Lista de proveedores agrupados */}
          <div className="space-y-2">
            {proveedores.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500 space-y-2">
                <Building2 className="w-10 h-10 mx-auto text-gray-200 dark:text-gray-700" />
                <p>No hay facturas cargadas para este proyecto.</p>
                <p className="text-xs">
                  Cargá la primera factura de un proveedor con el botón de arriba.
                </p>
              </div>
            ) : (
              proveedores.map((p) => (
                <FilaProveedor
                  key={p.id}
                  proyectoId={proyectoId}
                  proveedor={p}
                  onFacturaActualizada={handleFacturaActualizada}
                  onFacturaEliminada={handleFacturaEliminada}
                  onCargarFactura={(provId) => setModal({ proveedorId: provId })}
                  onVerDetalle={(f) => setDetalleFactura({ factura: f, proveedor: p })}
                  onEditar={(f) => setEditarFactura({ factura: f, proveedor: p })}
                  onRegistrarPago={(f) => setPagarFactura({ factura: f, proveedor: p })}
                />
              ))
            )}
          </div>

          {/* Nota sobre directorio global */}
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center text-sm text-gray-400 dark:text-gray-500">
            Para ver todos los proveedores y agregar nuevos,{" "}
            <Link href="/compras" className="text-blue-500 hover:underline font-medium">
              ir al Directorio Global de Proveedores
              <ExternalLink className="inline w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </>
      )}

      {activeTab === "graficos" && (
        <TabGraficos proveedores={proveedores} proyectoId={proyectoId} />
      )}

      {modal !== null && (
        <ModalCargarFactura
          proyectoId={proyectoId}
          proveedoresDisponibles={proveedoresDisponibles}
          proveedorPreseleccionado={modal.proveedorId}
          onClose={() => setModal(null)}
          onCreada={() => { /* handled via reload */ }}
        />
      )}

      {detalleFactura && (
        <ModalDetalleFactura
          factura={detalleFactura.factura}
          proveedor={detalleFactura.proveedor}
          proyectoId={proyectoId}
          onClose={() => setDetalleFactura(null)}
          onEditar={() => { setEditarFactura(detalleFactura); setDetalleFactura(null); }}
          onRegistrarPago={() => { setPagarFactura(detalleFactura); setDetalleFactura(null); }}
        />
      )}

      {editarFactura && (
        <ModalEditarFactura
          factura={editarFactura.factura}
          proyectoId={proyectoId}
          onClose={() => setEditarFactura(null)}
          onActualizada={() => { setEditarFactura(null); window.location.reload(); }}
        />
      )}

      {pagarFactura && (
        <ModalRegistrarPago
          factura={pagarFactura.factura}
          proveedor={pagarFactura.proveedor}
          proyectoId={proyectoId}
          onClose={() => setPagarFactura(null)}
          onPagado={() => { setPagarFactura(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}

