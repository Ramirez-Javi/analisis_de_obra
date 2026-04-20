"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { crearCostoIndirecto, eliminarCostoIndirecto } from "@/app/proyectos/[id]/logistica/actions";
import Link from "next/link";
import {
  ArrowLeft, Truck, Wrench, PackageOpen, Plus, Trash2,
  Eye, Printer, Download, FileText, X, CheckCircle2,
} from "lucide-react";
import { AsignarProyectoWidget } from "@/components/shared/AsignarProyectoWidget";
import type { ProyectoSimple } from "@/app/actions/proyectos";
import type { EquipoRubroDB, GastoLogisticoDB, RubroMockDB } from "@/app/actions/init-modulos";
import { getEmpresaConfig, openBrandedPrintWindow } from "@/lib/reportHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type Unidad = "Horas" | "Días" | "Meses" | "Viajes" | "Global" | "Unidad";

type MetodoPagoLocal = "EFECTIVO" | "CHEQUE" | "TRANSFERENCIA" | "GIRO" | "OTRO";

interface PagoLogistica {
  fecha: string;
  monto: number;
  metodoPago: MetodoPagoLocal;
  autorizadoPor?: string;
  realizadoPor?: string;
  nroComprobante?: string;
  observacion?: string;
  // CHEQUE
  nroCheque?: string;
  bancoCheque?: string;
  fechaEmisionCheque?: string;
  fechaCobroCheque?: string;
  // TRANSFERENCIA / GIRO
  nroTransaccion?: string;
  bancoTransfer?: string;
  // OTRO
  otroMetodoDetalle?: string;
}

interface EquipoRubro {
  id: string;
  rubroId: string;
  descripcion: string;
  unidad: Unidad;
  cantidad: number;
  costoUnitario: number;
  pago?: PagoLogistica;
}

interface GastoLogistico {
  id: string;
  descripcion: string;
  unidad: Unidad;
  cantidad: number;
  costoUnitario: number;
  pago?: PagoLogistica;
}

// ─── Payment constants ────────────────────────────────────────────────────────

const METODOS_PAGO: { value: MetodoPagoLocal; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
  { value: "GIRO", label: "Giro" },
  { value: "OTRO", label: "Otro (especificar)" },
];

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", CHEQUE: "Cheque",
  TRANSFERENCIA: "Transferencia Bancaria", GIRO: "Giro", OTRO: "Otro",
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const RUBROS_MOCK = [
  { id: "r1", nombre: "Excavación" },
  { id: "r2", nombre: "Losa de HºAº" },
  { id: "r3", nombre: "Mampostería" },
  { id: "r4", nombre: "Vigas y Columnas" },
  { id: "r5", nombre: "Revestimientos" },
  { id: "r6", nombre: "Cubierta" },
  { id: "r7", nombre: "Instalaciones Sanitarias" },
  { id: "r8", nombre: "Instalaciones Eléctricas" },
];

const UNIDADES: Unidad[] = ["Horas", "Días", "Meses", "Viajes", "Global", "Unidad"];

const EQUIPOS_INICIALES: EquipoRubro[] = [
  { id: "e1", rubroId: "r1", descripcion: "Retroexcavadora CAT 320", unidad: "Días", cantidad: 3, costoUnitario: 1_500_000 },
  { id: "e2", rubroId: "r2", descripcion: "Vibrador de concreto", unidad: "Días", cantidad: 8, costoUnitario: 120_000 },
  { id: "e3", rubroId: "r2", descripcion: "Hormigonera 180L", unidad: "Días", cantidad: 15, costoUnitario: 80_000 },
];

const GASTOS_INICIALES: GastoLogistico[] = [
  { id: "g1", descripcion: "Flete de materiales (general)", unidad: "Viajes", cantidad: 6, costoUnitario: 350_000 },
  { id: "g2", descripcion: "Baño portátil", unidad: "Meses", cantidad: 4, costoUnitario: 280_000 },
  { id: "g3", descripcion: "Volquete de escombros", unidad: "Viajes", cantidad: 4, costoUnitario: 220_000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGs(n: number) {
  return Math.round(n).toLocaleString("es-PY");
}

function subtotal(item: { cantidad: number; costoUnitario: number }) {
  return item.cantidad * item.costoUnitario;
}

// ─── Input numérico inline ────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  min = 0,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      value={value || ""}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full rounded-md px-2 py-1.5 text-xs tabular-nums dark:bg-slate-800 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${className}`}
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md px-2 py-1.5 text-xs dark:bg-slate-800 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${className}`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md px-2 py-1.5 text-xs dark:bg-slate-800 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Tab btn ──────────────────────────────────────────────────────────────────

// ─── Detalle row ─────────────────────────────────────────────────────────────

function DetalleRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b dark:border-white/[0.05] border-slate-100 last:border-0">
      <span className="text-xs dark:text-slate-400 text-slate-500">{label}</span>
      <span className={`text-xs font-medium ${value ? "dark:text-slate-200 text-slate-800" : "dark:text-slate-600 text-slate-400 italic"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Modal: Registrar Pago ────────────────────────────────────────────────────

function ModalRegistrarPagoLogistica({
  descripcion,
  costoTotal,
  onClose,
  onGuardar,
}: {
  descripcion: string;
  costoTotal: number;
  onClose: () => void;
  onGuardar: (pago: PagoLogistica) => void;
}) {
  const [form, setForm] = useState<Partial<PagoLogistica> & { metodoPago: MetodoPagoLocal }>({
    metodoPago: "EFECTIVO",
    fecha: new Date().toISOString().split("T")[0],
    monto: costoTotal,
  });
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fecha || !form.monto) {
      toast.error("Completá la fecha y el monto");
      return;
    }
    onGuardar({ ...form, monto: Number(form.monto) } as PagoLogistica);
    toast.success("Pago registrado");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-yellow-500" /> Registrar Pago
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{descripcion}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha de Pago *</label>
              <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monto Pagado (Gs.) *</label>
              <input type="number" min={0} step="1" value={form.monto ?? ""} onChange={(e) => set("monto", parseFloat(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">N° Comprobante</label>
              <input type="text" value={form.nroComprobante ?? ""} onChange={(e) => set("nroComprobante", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Autorizó el pago</label>
              <input type="text" value={form.autorizadoPor ?? ""} onChange={(e) => set("autorizadoPor", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Realizado por</label>
            <input type="text" value={form.realizadoPor ?? ""} onChange={(e) => set("realizadoPor", e.target.value)}
              placeholder="Ej: Carlos Rodríguez — Tesorero"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Medio de Pago *</label>
            <select value={form.metodoPago} onChange={(e) => set("metodoPago", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm">
              {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {form.metodoPago === "CHEQUE" && (
            <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 space-y-3">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Datos del Cheque</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Banco</label>
                  <input type="text" value={form.bancoCheque ?? ""} onChange={(e) => set("bancoCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">N° de Cheque</label>
                  <input type="text" value={form.nroCheque ?? ""} onChange={(e) => set("nroCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha de Emisión</label>
                  <input type="date" value={form.fechaEmisionCheque ?? ""} onChange={(e) => set("fechaEmisionCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha de Cobro</label>
                  <input type="date" value={form.fechaCobroCheque ?? ""} onChange={(e) => set("fechaCobroCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}
          {(form.metodoPago === "TRANSFERENCIA" || form.metodoPago === "GIRO") && (
            <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Datos de la Transferencia</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Banco</label>
                  <input type="text" value={form.bancoTransfer ?? ""} onChange={(e) => set("bancoTransfer", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">N° de Transacción</label>
                  <input type="text" value={form.nroTransaccion ?? ""} onChange={(e) => set("nroTransaccion", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}
          {form.metodoPago === "OTRO" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Especificar</label>
              <input type="text" value={form.otroMetodoDetalle ?? ""} onChange={(e) => set("otroMetodoDetalle", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Observación</label>
            <textarea rows={2} value={form.observacion ?? ""} onChange={(e) => set("observacion", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit"
              className="px-5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium">
              Guardar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Detalle de Pago ───────────────────────────────────────────────────

function buildComprobantePagoLogistica(
  descripcion: string,
  categoria: string,
  pago: PagoLogistica,
  proyectoId: string,
) {
  const empresa = getEmpresaConfig(proyectoId);
  const metodoStr = pago.metodoPago === "OTRO" && pago.otroMetodoDetalle
    ? pago.otroMetodoDetalle
    : (METODO_LABEL[pago.metodoPago] ?? pago.metodoPago);
  const val = (v?: string | null) => v ?? "—";

  function row(label: string, value: string) {
    const empty = value === "—";
    return `<tr><td style='width:160pt;padding:5pt 8pt 5pt 0;font-size:9pt;color:#6b7280;vertical-align:top'>${label}</td><td style='padding:5pt 0;font-size:9.5pt;color:${empty ? "#9ca3af" : "#111"};${empty ? "font-style:italic" : ""}'>${value}</td></tr>`;
  }
  function section(title: string, content: string) {
    return `<div style='margin-bottom:14pt'><div style='font-size:8pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5pt solid #d1d5db;padding-bottom:4pt;margin-bottom:8pt'>${title}</div><table style='width:100%;border-collapse:collapse'>${content}</table></div>`;
  }

  let medioPagoContent = row("Medio de Pago", metodoStr);
  if (pago.metodoPago === "CHEQUE") {
    medioPagoContent += row("Banco", val(pago.bancoCheque));
    medioPagoContent += row("N° de Cheque", val(pago.nroCheque));
    medioPagoContent += row("Fecha Emisión", val(pago.fechaEmisionCheque));
    medioPagoContent += row("Fecha Cobro", val(pago.fechaCobroCheque));
  } else if (pago.metodoPago === "TRANSFERENCIA" || pago.metodoPago === "GIRO") {
    medioPagoContent += row("Banco", val(pago.bancoTransfer));
    medioPagoContent += row("N° Transacción", val(pago.nroTransaccion));
  }

  const bodyContent =
    section("Ítem",
      row("Descripción", descripcion) +
      row("Categoría", categoria),
    ) +
    section("Datos del Pago",
      row("Fecha", pago.fecha) +
      row("Monto", `<span style='color:#92400e;font-weight:700;font-size:11pt'>${fmtGs(pago.monto)} Gs.</span>`) +
      row("N° Comprobante", val(pago.nroComprobante)),
    ) +
    section("Medio de Pago", medioPagoContent) +
    section("Autorización",
      row("Autorizó el Pago", val(pago.autorizadoPor)) +
      row("Realizado por", val(pago.realizadoPor)),
    ) +
    section("Observaciones",
      `<tr><td colspan='2' style='font-size:9pt;color:${pago.observacion ? "#374151" : "#9ca3af"};font-style:italic;padding:4pt 0'>${pago.observacion ?? "Sin observaciones"}</td></tr>`,
    ) +
    `<div style='margin-top:24pt;padding-top:12pt;border-top:1pt solid #d1d5db;display:flex;gap:40pt'>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Conforme — Proveedor</div></div>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Firma Autorizante</div></div>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Sello de la Empresa</div></div>` +
    `</div>`;

  openBrandedPrintWindow(
    `Comprobante de Pago — ${descripcion}`,
    "COMPROBANTE DE PAGO — MAQUINARIAS Y LOGÍSTICA",
    `${descripcion} · ${pago.fecha}`,
    bodyContent,
    empresa,
  );
}

function ModalDetallePagoLogistica({
  descripcion,
  categoria,
  pago,
  proyectoId,
  onClose,
}: {
  descripcion: string;
  categoria: string;
  pago: PagoLogistica;
  proyectoId: string;
  onClose: () => void;
}) {
  const metodoStr = pago.metodoPago === "OTRO" && pago.otroMetodoDetalle
    ? pago.otroMetodoDetalle
    : (METODO_LABEL[pago.metodoPago] ?? pago.metodoPago);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Detalle de Pago</p>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">{descripcion}</p>
            <p className="text-xs text-slate-400">{categoria}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Monto destacado */}
        <div className="px-6 pt-5">
          <div className="rounded-xl p-4 flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Monto del Pago</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">Gs. {fmtGs(pago.monto)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Fecha</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{pago.fecha}</p>
            </div>
          </div>
        </div>

        {/* Detalle completo */}
        <div className="px-6 py-5 space-y-5">
          {/* Identificación */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Identificación</p>
            <div className="space-y-0.5">
              <DetalleRow label="N° Comprobante" value={pago.nroComprobante} />
            </div>
          </div>

          {/* Medio de pago */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Medio de Pago</p>
            <div className="space-y-0.5">
              <DetalleRow label="Método" value={metodoStr} />
              {pago.metodoPago === "CHEQUE" && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 mt-2 space-y-0.5">
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Datos del Cheque</p>
                  <DetalleRow label="Banco" value={pago.bancoCheque} />
                  <DetalleRow label="N° de Cheque" value={pago.nroCheque} />
                  <DetalleRow label="Fecha Emisión" value={pago.fechaEmisionCheque} />
                  <DetalleRow label="Fecha Cobro" value={pago.fechaCobroCheque} />
                </div>
              )}
              {(pago.metodoPago === "TRANSFERENCIA" || pago.metodoPago === "GIRO") && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 mt-2 space-y-0.5">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Datos de la Transferencia</p>
                  <DetalleRow label="Banco" value={pago.bancoTransfer} />
                  <DetalleRow label="N° Transacción" value={pago.nroTransaccion} />
                </div>
              )}
            </div>
          </div>

          {/* Autorización */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Autorización</p>
            <div className="space-y-0.5">
              <DetalleRow label="Autorizó el pago" value={pago.autorizadoPor} />
              <DetalleRow label="Realizado por" value={pago.realizadoPor} />
            </div>
          </div>

          {/* Observación */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Observación</p>
            <p className={`text-sm rounded-lg p-3 ${pago.observacion ? "dark:bg-slate-800 bg-slate-50 dark:text-slate-300 text-slate-700" : "italic dark:text-slate-600 text-slate-400"}`}>
              {pago.observacion ?? "Sin observaciones"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cerrar</button>
          <button
            onClick={() => buildComprobantePagoLogistica(descripcion, categoria, pago, proyectoId)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-300 dark:border-yellow-700 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors font-medium"
          >
            <Printer className="w-4 h-4" /> Imprimir comprobante
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exportar / Imprimir módulo completo ─────────────────────────────────────

function exportarLogisticaCSV(
  equipos: EquipoRubro[],
  gastos: GastoLogistico[],
  rubrosMock: { id: string; nombre: string }[],
) {
  const esc = (s?: string | null) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const metodoStr = (p?: PagoLogistica) => {
    if (!p) return "";
    return p.metodoPago === "OTRO" && p.otroMetodoDetalle
      ? p.otroMetodoDetalle
      : (METODO_LABEL[p.metodoPago] ?? p.metodoPago);
  };
  const filas = [
    "Categoría,Rubro,Descripción,Unidad,Cantidad,Costo Unit.(Gs),Subtotal(Gs),Fecha Pago,Monto Pagado(Gs),Método Pago,N° Comprobante,Banco/Detalle,N° Cheque/Transacción,Autorizó,Realizado por,Observación"
  ];
  for (const e of equipos) {
    const rubro = rubrosMock.find((r) => r.id === e.rubroId)?.nombre ?? e.rubroId;
    const p = e.pago;
    const banco = p?.metodoPago === "CHEQUE" ? (p.bancoCheque ?? "") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.bancoTransfer ?? "") : "";
    const nroRef = p?.metodoPago === "CHEQUE" ? (p.nroCheque ?? "") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.nroTransaccion ?? "") : "";
    filas.push([
      "Equipos", esc(rubro), esc(e.descripcion), e.unidad, e.cantidad, e.costoUnitario, subtotal(e),
      p?.fecha ?? "", p?.monto ?? "", metodoStr(p), esc(p?.nroComprobante), esc(banco), esc(nroRef),
      esc(p?.autorizadoPor), esc(p?.realizadoPor), esc(p?.observacion),
    ].join(","));
  }
  for (const g of gastos) {
    const p = g.pago;
    const banco = p?.metodoPago === "CHEQUE" ? (p.bancoCheque ?? "") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.bancoTransfer ?? "") : "";
    const nroRef = p?.metodoPago === "CHEQUE" ? (p.nroCheque ?? "") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.nroTransaccion ?? "") : "";
    filas.push([
      "Logística Global", "", esc(g.descripcion), g.unidad, g.cantidad, g.costoUnitario, subtotal(g),
      p?.fecha ?? "", p?.monto ?? "", metodoStr(p), esc(p?.nroComprobante), esc(banco), esc(nroRef),
      esc(p?.autorizadoPor), esc(p?.realizadoPor), esc(p?.observacion),
    ].join(","));
  }
  const blob = new Blob(["\uFEFF" + filas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `maquinarias-logistica.csv`;
  a.click();
}

function imprimirLogistica(
  equipos: EquipoRubro[],
  gastos: GastoLogistico[],
  rubrosMock: { id: string; nombre: string }[],
  proyectoId: string,
) {
  const empresa = getEmpresaConfig(proyectoId);
  const totalEquipos = equipos.reduce((s, e) => s + subtotal(e), 0);
  const totalLogistica = gastos.reduce((s, g) => s + subtotal(g), 0);

  const metodoStr = (p?: PagoLogistica) => {
    if (!p) return "—";
    return p.metodoPago === "OTRO" && p.otroMetodoDetalle
      ? p.otroMetodoDetalle
      : (METODO_LABEL[p.metodoPago] ?? p.metodoPago);
  };

  const filasEquipos = equipos.map((e) => {
    const rubro = rubrosMock.find((r) => r.id === e.rubroId)?.nombre ?? e.rubroId;
    const p = e.pago;
    const banco = p?.metodoPago === "CHEQUE" ? (p.bancoCheque ?? "—") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.bancoTransfer ?? "—") : "—";
    const nroRef = p?.metodoPago === "CHEQUE" ? (p.nroCheque ?? "—") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.nroTransaccion ?? "—") : "—";
    return `<tr style='border-bottom:0.5pt solid #e5e7eb'>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${rubro}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${e.descripcion}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:center'>${e.unidad}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:right'>${e.cantidad}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:right'>${fmtGs(e.costoUnitario)}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:right;font-weight:600'>${fmtGs(subtotal(e))}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.fecha ?? "—"}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${metodoStr(p)}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${banco}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${nroRef}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.nroComprobante ?? "—"}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.autorizadoPor ?? "—"}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.realizadoPor ?? "—"}</td>
    </tr>`;
  }).join("");

  const filasGastos = gastos.map((g) => {
    const p = g.pago;
    const banco = p?.metodoPago === "CHEQUE" ? (p.bancoCheque ?? "—") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.bancoTransfer ?? "—") : "—";
    const nroRef = p?.metodoPago === "CHEQUE" ? (p.nroCheque ?? "—") : p?.metodoPago === "TRANSFERENCIA" || p?.metodoPago === "GIRO" ? (p.nroTransaccion ?? "—") : "—";
    return `<tr style='border-bottom:0.5pt solid #e5e7eb'>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${g.descripcion}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:center'>${g.unidad}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:right'>${g.cantidad}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:right'>${fmtGs(g.costoUnitario)}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt;text-align:right;font-weight:600'>${fmtGs(subtotal(g))}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.fecha ?? "—"}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${metodoStr(p)}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${banco}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${nroRef}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.nroComprobante ?? "—"}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.autorizadoPor ?? "—"}</td>
      <td style='padding:5pt 6pt;font-size:8.5pt'>${p?.realizadoPor ?? "—"}</td>
    </tr>`;
  }).join("");

  const cabecera = `<tr style='background:#f3f4f6;font-size:8pt'>`;
  const thE = (t: string) => `<th style='padding:5pt 6pt;text-align:left;white-space:nowrap'>${t}</th>`;
  const thR = (t: string) => `<th style='padding:5pt 6pt;text-align:right;white-space:nowrap'>${t}</th>`;
  const thC = (t: string) => `<th style='padding:5pt 6pt;text-align:center;white-space:nowrap'>${t}</th>`;

  const bodyContent =
    `<div style='display:flex;gap:12pt;margin-bottom:14pt'>` +
      `<div style='flex:1;padding:10pt;background:#fefce8;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#92400e'>Total Equipos</div><div style='font-size:13pt;font-weight:700;color:#78350f'>${fmtGs(totalEquipos)} Gs.</div></div>` +
      `<div style='flex:1;padding:10pt;background:#f0fdf4;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#15803d'>Total Logística</div><div style='font-size:13pt;font-weight:700;color:#065f46'>${fmtGs(totalLogistica)} Gs.</div></div>` +
      `<div style='flex:1;padding:10pt;background:#f8fafc;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#6b7280'>Total General</div><div style='font-size:13pt;font-weight:700;color:#1e3a8a'>${fmtGs(totalEquipos + totalLogistica)} Gs.</div></div>` +
    `</div>` +
    `<div style='font-size:9pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5pt solid #d1d5db;padding-bottom:4pt;margin-bottom:6pt'>Equipos asignados a rubros</div>` +
    `<table style='width:100%;border-collapse:collapse;font-size:8.5pt'>` +
      `<thead>${cabecera}${thE("Rubro")}${thE("Descripción")}${thC("Unidad")}${thR("Cant.")}${thR("Costo Unit.")}${thR("Subtotal")}${thE("Fecha Pago")}${thE("Método")}${thE("Banco")}${thE("N° Cheque/Transf.")}${thE("Comprobante")}${thE("Autorizó")}${thE("Realizado por")}</tr></thead>` +
      `<tbody>${filasEquipos || "<tr><td colspan='13' style='padding:8pt;text-align:center;color:#9ca3af;font-style:italic'>Sin equipos registrados</td></tr>"}</tbody>` +
    `</table>` +
    `<div style='font-size:9pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5pt solid #d1d5db;padding-bottom:4pt;margin:14pt 0 6pt'>Logística global</div>` +
    `<table style='width:100%;border-collapse:collapse;font-size:8.5pt'>` +
      `<thead>${cabecera}${thE("Descripción")}${thC("Unidad")}${thR("Cant.")}${thR("Costo Unit.")}${thR("Subtotal")}${thE("Fecha Pago")}${thE("Método")}${thE("Banco")}${thE("N° Cheque/Transf.")}${thE("Comprobante")}${thE("Autorizó")}${thE("Realizado por")}</tr></thead>` +
      `<tbody>${filasGastos || "<tr><td colspan='12' style='padding:8pt;text-align:center;color:#9ca3af;font-style:italic'>Sin gastos logísticos registrados</td></tr>"}</tbody>` +
    `</table>`;

  openBrandedPrintWindow(
    "Maquinarias y Logística",
    "MAQUINARIAS Y LOGÍSTICA",
    "Costos indirectos de obra",
    bodyContent,
    empresa,
  );
}

// ─── Tab btn ──────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon,
  label,
  total,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  total: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-yellow-500 dark:text-yellow-400 text-yellow-600"
          : "border-transparent dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
          active
            ? "dark:bg-yellow-500/10 bg-yellow-50 dark:text-yellow-400 text-yellow-700"
            : "dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400"
        }`}
      >
        Gs. {fmtGs(total)}
      </span>
    </button>
  );
}

// ─── TAB 1: Equipos asignados a rubros ───────────────────────────────────────

function TabEquipos({
  equipos,
  setEquipos,
  rubrosMock,
  proyectoId,
}: {
  equipos: EquipoRubro[];
  setEquipos: React.Dispatch<React.SetStateAction<EquipoRubro[]>>;
  rubrosMock: { id: string; nombre: string }[];
  proyectoId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [registrarPagoId, setRegistrarPagoId] = useState<string | null>(null);
  const [detallePagoItem, setDetallePagoItem] = useState<EquipoRubro | null>(null);
  const rubroOpts = rubrosMock.map((r) => ({ value: r.id, label: r.nombre }));
  const unidadOpts = UNIDADES.map((u) => ({ value: u, label: u }));

  const update = (id: string, field: keyof EquipoRubro, value: string | number) => {
    setEquipos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const setPago = (id: string, pago: PagoLogistica) => {
    setEquipos((prev) => prev.map((e) => (e.id === id ? { ...e, pago } : e)));
  };

  const add = () => {
    const rubroId = rubrosMock[0]?.id ?? "r1";
    const rubro = rubrosMock[0]?.nombre ?? "General";
    startTransition(async () => {
      try {
        const res = await crearCostoIndirecto(proyectoId, {
          descripcion: "",
          tipo: "ALQUILER_MAQUINARIA",
          monto: 0,
          proveedor: rubro,
        });
        setEquipos((prev) => [
          ...prev,
          {
            id: res.id,
            rubroId,
            descripcion: "",
            unidad: "Días",
            cantidad: 1,
            costoUnitario: 0,
          },
        ]);
      } catch {
        toast.error("Error al agregar equipo");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await eliminarCostoIndirecto(proyectoId, id);
        setEquipos((prev) => prev.filter((e) => e.id !== id));
      } catch {
        toast.error("Error al eliminar equipo");
      }
    });
  };

  // Agrupar por rubro para mostrar subtotales
  const grouped = useMemo(() => {
    const map = new Map<string, EquipoRubro[]>();
    for (const e of equipos) {
      const arr = map.get(e.rubroId) ?? [];
      arr.push(e);
      map.set(e.rubroId, arr);
    }
    return map;
  }, [equipos]);

  const registrarItem = registrarPagoId ? equipos.find((e) => e.id === registrarPagoId) : null;

  return (
    <div className="space-y-5">
      {/* Modales */}
      {registrarItem && (
        <ModalRegistrarPagoLogistica
          descripcion={registrarItem.descripcion || "Equipo sin descripción"}
          costoTotal={subtotal(registrarItem)}
          onClose={() => setRegistrarPagoId(null)}
          onGuardar={(pago) => { setPago(registrarItem.id, pago); setRegistrarPagoId(null); }}
        />
      )}
      {detallePagoItem?.pago && (
        <ModalDetallePagoLogistica
          descripcion={detallePagoItem.descripcion || "Equipo sin descripción"}
          categoria={rubrosMock.find((r) => r.id === detallePagoItem.rubroId)?.nombre ?? detallePagoItem.rubroId}
          pago={detallePagoItem.pago}
          proyectoId={proyectoId}
          onClose={() => setDetallePagoItem(null)}
        />
      )}

      {/* Tabla */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        {/* Cabecera de tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="dark:bg-slate-800/80 bg-slate-50 border-b dark:border-white/[0.06] border-slate-200">
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[160px]">
                  Rubro vinculado
                </th>
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  Descripción del equipo
                </th>
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[100px]">
                  Unidad
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[80px]">
                  Cant.
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Costo Unit. (Gs)
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Subtotal (Gs)
                </th>
                <th className="px-3 py-2.5 text-center dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[90px]">
                  Pago
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {equipos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center dark:text-slate-500 text-slate-400">
                    Sin equipos asignados
                  </td>
                </tr>
              )}
              {equipos.map((e) => (
                <tr
                  key={e.id}
                  className="border-t dark:border-white/[0.04] border-slate-100 dark:hover:bg-slate-800/20 hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-3 py-2">
                    <SelectInput
                      value={e.rubroId}
                      onChange={(v) => update(e.id, "rubroId", v)}
                      options={rubroOpts}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <TextInput
                      value={e.descripcion}
                      onChange={(v) => update(e.id, "descripcion", v)}
                      placeholder="Ej: Retroexcavadora, Vibrador…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <SelectInput
                      value={e.unidad}
                      onChange={(v) => update(e.id, "unidad", v as Unidad)}
                      options={unidadOpts}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={e.cantidad}
                      onChange={(v) => update(e.id, "cantidad", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={e.costoUnitario}
                      onChange={(v) => update(e.id, "costoUnitario", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-semibold text-xs dark:text-yellow-400 text-yellow-600 tabular-nums">
                      {fmtGs(subtotal(e))}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {e.pago ? (
                      <button
                        onClick={() => setDetallePagoItem(e)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700 dark:hover:bg-emerald-500/20 hover:bg-emerald-100 border dark:border-emerald-500/20 border-emerald-200 transition-colors"
                        title="Ver detalle de pago"
                      >
                        <Eye className="w-3 h-3" /> Ver
                      </button>
                    ) : (
                      <button
                        onClick={() => setRegistrarPagoId(e.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-400 text-slate-500 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"
                        title="Registrar pago"
                      >
                        <Plus className="w-3 h-3" /> Pago
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => remove(e.id)}
                      disabled={isPending}
                      className="p-1 rounded-md dark:text-red-400/50 text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {equipos.length > 0 && (
              <tfoot>
                <tr className="border-t dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/40 bg-slate-50">
                  <td colSpan={5} className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                    Total equipos
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-sm dark:text-yellow-400 text-yellow-600 tabular-nums">
                    {fmtGs(equipos.reduce((s, e) => s + subtotal(e), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Botón agregar */}
      <button
        onClick={add}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium dark:bg-yellow-500/10 bg-yellow-50 dark:text-yellow-400 text-yellow-600 dark:hover:bg-yellow-500/20 hover:bg-yellow-100 border dark:border-yellow-500/20 border-yellow-200 transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {isPending ? "Guardando…" : "Asignar equipo"}
      </button>

      {/* Resumen por rubro */}
      {grouped.size > 0 && (
        <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">
              Resumen por rubro
            </h3>
          </div>
          <div className="divide-y dark:divide-white/[0.04] divide-slate-100">
            {Array.from(grouped.entries()).map(([rubroId, items]) => {
              const rubro = rubrosMock.find((r) => r.id === rubroId);
              const total = items.reduce((s, e) => s + subtotal(e), 0);
              return (
                <div key={rubroId} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs font-medium dark:text-slate-200 text-slate-800">
                      {rubro?.nombre ?? rubroId}
                    </p>
                    <p className="text-[10px] dark:text-slate-500 text-slate-400">
                      {items.length} equipo{items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold dark:text-yellow-400 text-yellow-600 tabular-nums">
                    Gs. {fmtGs(total)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── TAB 2: Logística y costos globales ──────────────────────────────────────

function TabLogistica({
  gastos,
  setGastos,
  proyectoId,
}: {
  gastos: GastoLogistico[];
  setGastos: React.Dispatch<React.SetStateAction<GastoLogistico[]>>;
  proyectoId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [registrarPagoId, setRegistrarPagoId] = useState<string | null>(null);
  const [detallePagoItem, setDetallePagoItem] = useState<GastoLogistico | null>(null);
  const unidadOpts = UNIDADES.map((u) => ({ value: u, label: u }));

  const update = (id: string, field: keyof GastoLogistico, value: string | number) => {
    setGastos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const setPago = (id: string, pago: PagoLogistica) => {
    setGastos((prev) => prev.map((g) => (g.id === id ? { ...g, pago } : g)));
  };

  const add = () => {
    startTransition(async () => {
      try {
        const res = await crearCostoIndirecto(proyectoId, {
          descripcion: "",
          tipo: "OTRO",
          monto: 0,
        });
        setGastos((prev) => [
          ...prev,
          { id: res.id, descripcion: "", unidad: "Global", cantidad: 1, costoUnitario: 0 },
        ]);
      } catch {
        toast.error("Error al agregar gasto");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await eliminarCostoIndirecto(proyectoId, id);
        setGastos((prev) => prev.filter((g) => g.id !== id));
      } catch {
        toast.error("Error al eliminar gasto");
      }
    });
  };

  const registrarItem = registrarPagoId ? gastos.find((g) => g.id === registrarPagoId) : null;

  return (
    <div className="space-y-5">
      {/* Modales */}
      {registrarItem && (
        <ModalRegistrarPagoLogistica
          descripcion={registrarItem.descripcion || "Gasto sin descripción"}
          costoTotal={subtotal(registrarItem)}
          onClose={() => setRegistrarPagoId(null)}
          onGuardar={(pago) => { setPago(registrarItem.id, pago); setRegistrarPagoId(null); }}
        />
      )}
      {detallePagoItem?.pago && (
        <ModalDetallePagoLogistica
          descripcion={detallePagoItem.descripcion || "Gasto sin descripción"}
          categoria="Logística Global"
          pago={detallePagoItem.pago}
          proyectoId={proyectoId}
          onClose={() => setDetallePagoItem(null)}
        />
      )}

      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[580px]">
            <thead>
              <tr className="dark:bg-slate-800/80 bg-slate-50 border-b dark:border-white/[0.06] border-slate-200">
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  Descripción
                </th>
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[100px]">
                  Unidad
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[80px]">
                  Cant.
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Costo Unit. (Gs)
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Subtotal (Gs)
                </th>
                <th className="px-3 py-2.5 text-center dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[90px]">
                  Pago
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center dark:text-slate-500 text-slate-400">
                    Sin gastos logísticos registrados
                  </td>
                </tr>
              )}
              {gastos.map((g) => (
                <tr
                  key={g.id}
                  className="border-t dark:border-white/[0.04] border-slate-100 dark:hover:bg-slate-800/20 hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-3 py-2">
                    <TextInput
                      value={g.descripcion}
                      onChange={(v) => update(g.id, "descripcion", v)}
                      placeholder="Ej: Fletes, Volquete, Baño portátil…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <SelectInput
                      value={g.unidad}
                      onChange={(v) => update(g.id, "unidad", v as Unidad)}
                      options={unidadOpts}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={g.cantidad}
                      onChange={(v) => update(g.id, "cantidad", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={g.costoUnitario}
                      onChange={(v) => update(g.id, "costoUnitario", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-semibold text-xs dark:text-yellow-400 text-yellow-600 tabular-nums">
                      {fmtGs(subtotal(g))}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {g.pago ? (
                      <button
                        onClick={() => setDetallePagoItem(g)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700 dark:hover:bg-emerald-500/20 hover:bg-emerald-100 border dark:border-emerald-500/20 border-emerald-200 transition-colors"
                        title="Ver detalle de pago"
                      >
                        <Eye className="w-3 h-3" /> Ver
                      </button>
                    ) : (
                      <button
                        onClick={() => setRegistrarPagoId(g.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-400 text-slate-500 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"
                        title="Registrar pago"
                      >
                        <Plus className="w-3 h-3" /> Pago
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => remove(g.id)}
                      disabled={isPending}
                      className="p-1 rounded-md dark:text-red-400/50 text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {gastos.length > 0 && (
              <tfoot>
                <tr className="border-t dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/40 bg-slate-50">
                  <td colSpan={4} className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                    Total logística
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-sm dark:text-yellow-400 text-yellow-600 tabular-nums">
                    {fmtGs(gastos.reduce((s, g) => s + subtotal(g), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <button
        onClick={add}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium dark:bg-yellow-500/10 bg-yellow-50 dark:text-yellow-400 text-yellow-600 dark:hover:bg-yellow-500/20 hover:bg-yellow-100 border dark:border-yellow-500/20 border-yellow-200 transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {isPending ? "Guardando…" : "Agregar gasto logístico"}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface LogisticaClientProps {
  backHref: string;
  proyecto?: { id: string; codigo: string; nombre: string };
  stickyTop?: string;
  proyectosDisponibles?: ProyectoSimple[];
  initialEquipos?: EquipoRubroDB[];
  initialGastos?: GastoLogisticoDB[];
  initialRubrosMock?: RubroMockDB[];
}

export function LogisticaClient({
  backHref,
  proyecto,
  stickyTop = "top-0",
  proyectosDisponibles = [],
  initialEquipos,
  initialGastos,
  initialRubrosMock,
}: LogisticaClientProps) {
  const rubrosMock = initialRubrosMock?.length ? initialRubrosMock : RUBROS_MOCK;
  const [equipos, setEquipos] = useState<EquipoRubro[]>(
    initialEquipos?.length ? (initialEquipos as unknown as EquipoRubro[]) : EQUIPOS_INICIALES
  );
  const [gastos, setGastos] = useState<GastoLogistico[]>(
    initialGastos?.length ? (initialGastos as unknown as GastoLogistico[]) : GASTOS_INICIALES
  );
  const [activeTab, setActiveTab] = useState<"equipos" | "logistica">("equipos");

  const totalEquipos = useMemo(
    () => equipos.reduce((s, e) => s + subtotal(e), 0),
    [equipos]
  );
  const totalLogistica = useMemo(
    () => gastos.reduce((s, g) => s + subtotal(g), 0),
    [gastos]
  );
  const totalGlobal = totalEquipos + totalLogistica;

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] dark:bg-slate-950 bg-slate-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className={`sticky ${stickyTop} z-30 dark:bg-slate-950/95 bg-white/95 backdrop-blur-md border-b dark:border-white/[0.06] border-slate-200`}
      >
        {/* Breadcrumb + título */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 dark:text-slate-400 text-slate-500" />
          </Link>
          <div className="w-7 h-7 rounded-lg dark:bg-yellow-500/10 bg-yellow-50 flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5 dark:text-yellow-400 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold dark:text-slate-100 text-slate-900 leading-tight">
              Maquinarias y Logística
            </h1>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              {proyecto ? `${proyecto.codigo} · ` : ""}Costos indirectos de obra
            </p>
          </div>

          {!proyecto && proyectosDisponibles.length > 0 && (
            <AsignarProyectoWidget
              proyectos={proyectosDisponibles}
              mode="nav"
              moduloPath="logistica"
            />
          )}

          {/* Botones de exportación */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => exportarLogisticaCSV(equipos, gastos, rubrosMock)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => imprimirLogistica(equipos, gastos, rubrosMock, proyecto?.id ?? "")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"
              title="Exportar PDF"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={() => imprimirLogistica(equipos, gastos, rubrosMock, proyecto?.id ?? "")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"
              title="Imprimir"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
          </div>

          {/* KPI total global */}
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold">
              Total Logística
            </p>
            <p className="text-base font-bold tabular-nums dark:text-yellow-400 text-yellow-600 leading-tight">
              Gs. {fmtGs(totalGlobal)}
            </p>
          </div>
        </div>

        {/* Tabs + export mobile */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between border-t dark:border-white/[0.04] border-slate-100 -mt-px">
          <div className="flex overflow-x-auto">
          <TabBtn
            active={activeTab === "equipos"}
            onClick={() => setActiveTab("equipos")}
            icon={<Wrench className="w-3.5 h-3.5" />}
            label="Equipos por Rubro"
            total={totalEquipos}
          />
          <TabBtn
            active={activeTab === "logistica"}
            onClick={() => setActiveTab("logistica")}
            icon={<PackageOpen className="w-3.5 h-3.5" />}
            label="Logística Global"
            total={totalLogistica}
          />
          </div>
          {/* Mobile export buttons */}
          <div className="sm:hidden flex items-center gap-1 shrink-0 ml-2">
            <button onClick={() => exportarLogisticaCSV(equipos, gastos, rubrosMock)} className="p-1.5 rounded-lg dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500 transition-colors" title="CSV"><Download className="w-3.5 h-3.5" /></button>
            <button onClick={() => imprimirLogistica(equipos, gastos, rubrosMock, proyecto?.id ?? "")} className="p-1.5 rounded-lg dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500 transition-colors" title="Imprimir"><Printer className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Equipos asignados",
              val: equipos.length,
              unit: "items",
              color: "dark:text-yellow-400 text-yellow-600",
            },
            {
              label: "Gastos logísticos",
              val: gastos.length,
              unit: "items",
              color: "dark:text-amber-400 text-amber-600",
            },
            {
              label: "Subtotal equipos",
              val: `Gs. ${fmtGs(totalEquipos)}`,
              unit: "",
              color: "dark:text-yellow-400 text-yellow-600",
            },
            {
              label: "Subtotal logística",
              val: `Gs. ${fmtGs(totalLogistica)}`,
              unit: "",
              color: "dark:text-amber-400 text-amber-600",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold mb-0.5">
                {k.label}
              </p>
              <p className={`text-sm font-bold tabular-nums leading-tight ${k.color}`}>
                {k.val}
                {k.unit && (
                  <span className="text-[11px] font-normal dark:text-slate-500 text-slate-400 ml-1">
                    {k.unit}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Tab activo */}
        {activeTab === "equipos" ? (
          <TabEquipos equipos={equipos} setEquipos={setEquipos} rubrosMock={rubrosMock} proyectoId={proyecto?.id ?? ""} />
        ) : (
          <TabLogistica gastos={gastos} setGastos={setGastos} proyectoId={proyecto?.id ?? ""} />
        )}
      </div>
    </div>
  );
}