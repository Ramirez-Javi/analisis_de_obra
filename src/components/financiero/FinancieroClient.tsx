"use client";

import { useState, useTransition, useMemo, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Wallet, CircleDollarSign,
  Plus, X, Trash2, Landmark, CreditCard, BarChart2, Download, Search, FileText,
  Eye, Printer, Pencil,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getEmpresaConfig, openBrandedPrintWindow } from "@/lib/reportHeader";
import { fmtFechaCorta as fmtFecha } from "@/lib/fmtFecha";
import { crearMovimiento, eliminarMovimiento, actualizarMovimiento } from "@/app/proyectos/[id]/financiero/actions";
import type { NuevoMovimientoData } from "@/app/proyectos/[id]/financiero/actions";
import type { MovimientoFinanciero, Proveedor } from "@prisma/client";

type MovimientoConProveedor = Omit<MovimientoFinanciero, "monto"> & {
  monto: number;
  proveedor: Pick<Proveedor, "razonSocial" | "ruc"> | null;
};

interface Props {
  proyectoId: string;
  montoContrato: number | null;
  movimientos: MovimientoConProveedor[];
}

const TIPOS_MOVIMIENTO = [
  { value: "INGRESO_CLIENTE",  label: "↑ Ingreso de Cliente" },
  { value: "EGRESO_PROVEEDOR", label: "↓ Egreso Proveedor" },
  { value: "EGRESO_PERSONAL",  label: "↓ Egreso Personal" },
  { value: "EGRESO_MAQUINARIA",label: "↓ Egreso Maquinaria" },
  { value: "EGRESO_HONORARIO", label: "↓ Honorario Profesional" },
  { value: "EGRESO_CAJA_CHICA",label: "↓ Caja Chica" },
  { value: "EGRESO_OTRO",      label: "↓ Otro Egreso" },
];

const METODOS = [
  { value: "EFECTIVO",       label: "Efectivo" },
  { value: "CHEQUE",         label: "Cheque" },
  { value: "TRANSFERENCIA",  label: "Transferencia bancaria" },
  { value: "GIRO",           label: "Giro" },
  { value: "OTRO",           label: "Otro (especificar)" },
];

function fmtGs(n: number) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency", currency: "PYG", maximumFractionDigits: 0,
  }).format(n);
}



// ─── KPI Card ───────────────────────────────────────────────
function KPI({ label, value, color, icon: Icon }: {
  label: string; value: string;
  color: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Modal Nuevo Movimiento ──────────────────────────────────
function ModalNuevoMovimiento({
  proyectoId,
  onClose,
  onCreado,
}: {
  proyectoId: string;
  onClose: () => void;
  onCreado: (m: MovimientoConProveedor) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Partial<NuevoMovimientoData> & { tipo: string; metodoPago: string }>({
    tipo: "EGRESO_OTRO",
    metodoPago: "EFECTIVO",
    fecha: new Date().toISOString().split("T")[0],
  });

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto || !form.beneficiario || !form.monto) {
      toast.error("Completá concepto, beneficiario y monto");
      return;
    }
    startTransition(async () => {
      const res = await crearMovimiento(proyectoId, form as NuevoMovimientoData);
      if (res.ok) {
        toast.success("Movimiento registrado");
        // Construir movimiento optimista provisionario
        onCreado({
          id: `opt-${Date.now()}`,
          proyectoId,
          fecha: new Date(form.fecha ?? Date.now()),
          tipo: (form.tipo ?? "EGRESO_OTRO") as MovimientoConProveedor["tipo"],
          concepto: form.concepto ?? "",
          beneficiario: form.beneficiario ?? "",
          monto: Number(form.monto ?? 0),
          metodoPago: (form.metodoPago ?? "EFECTIVO") as MovimientoConProveedor["metodoPago"],
          nroComprobante: form.nroComprobante ?? null,
          autorizadoPor: form.autorizadoPor ?? null,
          realizadoPor: form.realizadoPor ?? null,
          codigoPersonal: null,
          otroMetodoDetalle: form.otroMetodoDetalle ?? null,
          nroCheque: form.nroCheque ?? null,
          bancoCheque: form.bancoCheque ?? null,
          fechaEmisionCheque: null,
          fechaCobroCheque: null,
          nroTransaccion: form.nroTransaccion ?? null,
          bancoTransfer: form.bancoTransfer ?? null,
          observacion: form.observacion ?? null,
          tipoComprobante: null,
          proveedorId: null,
          cuotaPagoId: null,
          contratoManoObraId: null,
          autorizadoPorUsuarioId: null,
          proveedor: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Registrar Movimiento
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
            <select value={form.tipo ?? "EGRESO_OTRO"} onChange={(e) => set("tipo", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {TIPOS_MOVIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
            <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
          </div>

          {/* Concepto + Beneficiario */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Concepto (por qué se realizó) *</label>
            <input type="text" value={form.concepto ?? ""} onChange={(e) => set("concepto", e.target.value)}
              placeholder="Ej: Pago parcial contrato MO estructura"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Beneficiario (a quién) *</label>
              <input type="text" value={form.beneficiario ?? ""} onChange={(e) => set("beneficiario", e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto (Gs.) *</label>
              <input type="number" min={0} step="1" value={form.monto ?? ""} onChange={(e) => set("monto", parseFloat(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
          </div>

          {/* Comprobante + Autorizó */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° Comprobante / Recibo</label>
              <input type="text" value={form.nroComprobante ?? ""} onChange={(e) => set("nroComprobante", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Autorizó el pago</label>
              <input type="text" value={form.autorizadoPor ?? ""} onChange={(e) => set("autorizadoPor", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Realizado por */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Realizado por (quien ejecutó el pago)</label>
            <input type="text" value={form.realizadoPor ?? ""} onChange={(e) => set("realizadoPor", e.target.value)}
              placeholder="Ej: Carlos Rodríguez — Tesorero"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Medio de Pago *</label>
            <select value={form.metodoPago} onChange={(e) => set("metodoPago", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Campos condicionales — CHEQUE */}
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha de Emisión del Cheque</label>
                <input type="date" value={form.fechaEmisionCheque ?? ""} onChange={(e) => set("fechaEmisionCheque", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha de Cobro del Cheque</label>
                <input type="date" value={form.fechaCobroCheque ?? ""} onChange={(e) => set("fechaCobroCheque", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {/* Campos condicionales — TRANSFERENCIA / GIRO */}
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

          {/* Campos condicionales — OTRO */}
          {form.metodoPago === "OTRO" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Especificar medio de pago</label>
              <input type="text" value={form.otroMetodoDetalle ?? ""} onChange={(e) => set("otroMetodoDetalle", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          )}

          {/* Observación */}
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
              {pending ? "Guardando…" : "Guardar Movimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Editar Movimiento ────────────────────────────────
function ModalEditarMovimiento({
  m, onClose, onActualizado, proyectoId,
}: {
  m: MovimientoConProveedor;
  onClose: () => void;
  onActualizado: () => void;
  proyectoId: string;
}) {
  const [pending, startTransition] = useTransition();
  const toDateInput = (d: Date | string | null) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  const [form, setForm] = useState<Partial<NuevoMovimientoData> & { tipo: string; metodoPago: string }>({
    tipo: m.tipo,
    metodoPago: m.metodoPago,
    fecha: toDateInput(m.fecha),
    concepto: m.concepto,
    beneficiario: m.beneficiario,
    monto: m.monto,
    nroComprobante: m.nroComprobante ?? "",
    autorizadoPor: m.autorizadoPor ?? "",
    realizadoPor: m.realizadoPor ?? "",
    otroMetodoDetalle: m.otroMetodoDetalle ?? "",
    nroCheque: m.nroCheque ?? "",
    bancoCheque: m.bancoCheque ?? "",
    fechaEmisionCheque: toDateInput(m.fechaEmisionCheque),
    fechaCobroCheque: toDateInput(m.fechaCobroCheque),
    nroTransaccion: m.nroTransaccion ?? "",
    bancoTransfer: m.bancoTransfer ?? "",
    observacion: m.observacion ?? "",
  });
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto || !form.beneficiario || !form.monto) {
      toast.error("Completá concepto, beneficiario y monto");
      return;
    }
    startTransition(async () => {
      const res = await actualizarMovimiento(proyectoId, m.id, form as NuevoMovimientoData);
      if (res.ok) {
        toast.success("Movimiento actualizado");
        onActualizado();
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Editar Movimiento
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
            <select value={form.tipo ?? "EGRESO_OTRO"} onChange={(e) => set("tipo", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {TIPOS_MOVIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
            <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Concepto *</label>
            <input type="text" value={form.concepto ?? ""} onChange={(e) => set("concepto", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Beneficiario *</label>
              <input type="text" value={form.beneficiario ?? ""} onChange={(e) => set("beneficiario", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto (Gs.) *</label>
              <input type="number" min={0} step="1" value={form.monto ?? ""} onChange={(e) => set("monto", parseFloat(e.target.value))}
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Medio de Pago *</label>
            <select value={form.metodoPago} onChange={(e) => set("metodoPago", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
              {METODOS.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
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
              <label className="block text-xs text-gray-500 mb-1">Especificar medio de pago</label>
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
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
              {pending ? "Guardando…" : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Detalle de Movimiento ────────────────────────────
type FilaConSaldo = MovimientoConProveedor & { saldoAcumulado: number };

function ModalDetalleMovimiento({
  m, onClose, onEditar, proyectoId,
}: {
  m: FilaConSaldo;
  onClose: () => void;
  onEditar: () => void;
  proyectoId: string;
}) {
  const tipoLabel = TIPOS_MOVIMIENTO.find((t) => t.value === m.tipo)?.label ?? m.tipo;
  const esIngreso = m.tipo === "INGRESO_CLIENTE";
  const metodoLabel: Record<string, string> = {
    EFECTIVO: "Efectivo", CHEQUE: "Cheque",
    TRANSFERENCIA: "Transferencia Bancaria", GIRO: "Giro", OTRO: "Otro",
  };

  function imprimirComprobante() {
    const empresa = getEmpresaConfig(proyectoId);
    const colorMonto = esIngreso ? "#065f46" : "#991b1b";
    const colorSaldo = m.saldoAcumulado >= 0 ? "#1d40ae" : "#c2410c";

    // Rows helper
    function row(label: string, value: string, bold = false) {
      return `<tr><td style='width:160pt;padding:5pt 8pt 5pt 0;font-size:9pt;color:#6b7280;vertical-align:top'>${label}</td><td style='padding:5pt 0;font-size:9.5pt;color:#111;${bold ? "font-weight:700" : ""}'>${value}</td></tr>`;
    }
    function section(title: string, content: string) {
      return `<div style='margin-bottom:14pt'><div style='font-size:8pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5pt solid #d1d5db;padding-bottom:4pt;margin-bottom:8pt'>${title}</div><table style='width:100%;border-collapse:collapse'>${content}</table></div>`;
    }

    let metodoDetalle = metodoLabel[m.metodoPago] ?? m.metodoPago;
    if (m.metodoPago === "OTRO" && m.otroMetodoDetalle) metodoDetalle += " — " + m.otroMetodoDetalle;

    let medioPagoRows = row("Medio de Pago", metodoDetalle);
    if (m.metodoPago === "CHEQUE") {
      if (m.bancoCheque) medioPagoRows += row("Banco", m.bancoCheque);
      if (m.nroCheque) medioPagoRows += row("N° de Cheque", m.nroCheque);
      if (m.fechaEmisionCheque) medioPagoRows += row("Fecha de Emisión", new Date(m.fechaEmisionCheque).toLocaleDateString("es-PY"));
      if (m.fechaCobroCheque) medioPagoRows += row("Fecha de Cobro", new Date(m.fechaCobroCheque).toLocaleDateString("es-PY"));
    }
    if (m.metodoPago === "TRANSFERENCIA" || m.metodoPago === "GIRO") {
      if (m.bancoTransfer) medioPagoRows += row("Banco", m.bancoTransfer);
      if (m.nroTransaccion) medioPagoRows += row("N° Transacción", m.nroTransaccion);
    }

    const bodyContent =
      section("Identificación del Movimiento",
        row("Tipo", tipoLabel, true) +
        row("Fecha", new Date(m.fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })) +
        (m.nroComprobante ? row("N° Comprobante", m.nroComprobante) : ""),
      ) +
      section("Datos del Pago",
        row("Concepto", m.concepto) +
        row("Beneficiario", m.beneficiario, true) +
        (m.proveedor ? row("Razón Social", m.proveedor.razonSocial) : "") +
        (m.proveedor?.ruc ? row("RUC / Cédula", m.proveedor.ruc) : "") +
        row(esIngreso ? "Importe Cobrado" : "Importe Pagado",
          `<span style='color:${colorMonto};font-weight:700;font-size:11pt'>${fmtGs(m.monto)}</span>`) +
        row("Saldo Acumulado", `<span style='color:${colorSaldo};font-weight:700'>${fmtGs(m.saldoAcumulado)}</span>`),
      ) +
      section("Medio de Pago", medioPagoRows) +
      (m.autorizadoPor || m.realizadoPor ?
        section("Autorización y Firma",
          (m.autorizadoPor ? row("Autorizó el Pago", m.autorizadoPor, true) : "") +
          (m.realizadoPor ? row("Realizado por", m.realizadoPor) : ""),
        ) : "") +
      (m.observacion ?
        section("Observaciones",
          `<tr><td colspan='2' style='font-size:9pt;color:#374151;padding:4pt 0;font-style:italic'>${m.observacion}</td></tr>`,
        ) : "") +
      `<div style='margin-top:24pt;padding-top:12pt;border-top:1pt solid #d1d5db;display:flex;gap:40pt'>` +
        `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Conforme — Beneficiario</div></div>` +
        `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Firma Autorizante</div></div>` +
        `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Sello de la Empresa</div></div>` +
      `</div>`;

    openBrandedPrintWindow(
      `Comprobante de Pago — ${m.beneficiario}`,
      esIngreso ? "COMPROBANTE DE INGRESO" : "COMPROBANTE DE EGRESO",
      `${new Date(m.fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })} · ${tipoLabel}`,
      bodyContent,
      empresa,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${
              esIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}>{tipoLabel}</p>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{m.concepto}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Monto destacado */}
          <div className={`rounded-xl p-4 flex items-center justify-between ${
            esIngreso
              ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{esIngreso ? "Importe Cobrado" : "Importe Pagado"}</p>
              <p className={`text-2xl font-bold ${
                esIngreso ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
              }`}>{fmtGs(m.monto)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Saldo acumulado</p>
              <p className={`text-sm font-semibold ${
                m.saldoAcumulado >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
              }`}>{fmtGs(m.saldoAcumulado)}</p>
            </div>
          </div>

          {/* Detalle en grilla */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Beneficiario</p>
              <p className="font-semibold text-gray-900 dark:text-white">{m.beneficiario}</p>
              {m.proveedor && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {m.proveedor.razonSocial}
                  {m.proveedor.ruc && <span className="ml-1">· RUC {m.proveedor.ruc}</span>}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(m.fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            {m.nroComprobante && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">N° Comprobante</p>
                <p className="font-mono text-gray-900 dark:text-white">{m.nroComprobante}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Medio de Pago</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {m.metodoPago === "OTRO" && m.otroMetodoDetalle ? m.otroMetodoDetalle : (metodoLabel[m.metodoPago] ?? m.metodoPago)}
              </p>
            </div>
          </div>

          {/* Cheque */}
          {m.metodoPago === "CHEQUE" && (m.bancoCheque || m.nroCheque) && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 space-y-1">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Datos del Cheque</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {m.bancoCheque && <div><span className="text-xs text-gray-500">Banco: </span><span className="font-medium text-gray-900 dark:text-white">{m.bancoCheque}</span></div>}
                {m.nroCheque && <div><span className="text-xs text-gray-500">N° Cheque: </span><span className="font-mono text-gray-900 dark:text-white">{m.nroCheque}</span></div>}
                {m.fechaEmisionCheque && <div><span className="text-xs text-gray-500">Emisión: </span><span className="text-gray-900 dark:text-white">{new Date(m.fechaEmisionCheque).toLocaleDateString("es-PY")}</span></div>}
                {m.fechaCobroCheque && <div><span className="text-xs text-gray-500">Cobro: </span><span className="text-gray-900 dark:text-white">{new Date(m.fechaCobroCheque).toLocaleDateString("es-PY")}</span></div>}
              </div>
            </div>
          )}

          {/* Transferencia */}
          {(m.metodoPago === "TRANSFERENCIA" || m.metodoPago === "GIRO") && (m.bancoTransfer || m.nroTransaccion) && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 space-y-1">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Datos de la Transferencia</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {m.bancoTransfer && <div><span className="text-xs text-gray-500">Banco: </span><span className="font-medium text-gray-900 dark:text-white">{m.bancoTransfer}</span></div>}
                {m.nroTransaccion && <div><span className="text-xs text-gray-500">N° TX: </span><span className="font-mono text-gray-900 dark:text-white">{m.nroTransaccion}</span></div>}
              </div>
            </div>
          )}

          {/* Autorización */}
          {(m.autorizadoPor || m.realizadoPor) && (
            <div className="grid grid-cols-2 gap-x-6 text-sm">
              {m.autorizadoPor && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Autorizó el Pago</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{m.autorizadoPor}</p>
                </div>
              )}
              {m.realizadoPor && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Realizado por</p>
                  <p className="font-medium text-gray-900 dark:text-white">{m.realizadoPor}</p>
                </div>
              )}
            </div>
          )}

          {/* Observación */}
          {m.observacion && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{m.observacion}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cerrar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEditar(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={imprimirComprobante}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Etiqueta de método de pago ──────────────────────────────
function BadgeMetodo({ metodo, detalle }: { metodo: string; detalle?: string | null }) {
  const map: Record<string, string> = {
    EFECTIVO: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    CHEQUE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    TRANSFERENCIA: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    GIRO: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    OTRO: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };
  const labels: Record<string, string> = {
    EFECTIVO: "Efectivo", CHEQUE: "Cheque",
    TRANSFERENCIA: "Transferencia", GIRO: "Giro", OTRO: "Otro",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[metodo] ?? map.OTRO}`}>
      {metodo === "OTRO" && detalle ? detalle : labels[metodo] ?? metodo}
    </span>
  );
}

// ─── Componente principal ────────────────────────────────────
export function FinancieroClient({ proyectoId, montoContrato, movimientos: initial }: Props) {
  const router = useRouter();
  const [optimisticMovs, addOptimistic] = useOptimistic(
    initial,
    (state: MovimientoConProveedor[], nuevo: MovimientoConProveedor) => [...state, nuevo],
  );
  const [showModal, setShowModal] = useState(false);
  const [detalleMovimiento, setDetalleMovimiento] = useState<FilaConSaldo | null>(null);
  const [editarMovimiento, setEditarMovimiento] = useState<FilaConSaldo | null>(null);
  const [tab, setTab] = useState<"libro" | "graficos">("libro");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [, startTransition] = useTransition();

  // Calcular totales en runtime
  const { totalIngresado, totalEgresado, saldo, saldoPorCobrar } = useMemo(() => {
    let ing = 0, egr = 0;
    optimisticMovs.forEach((m) => {
      if (m.tipo === "INGRESO_CLIENTE") ing += m.monto;
      else egr += m.monto;
    });
    return {
      totalIngresado: ing,
      totalEgresado: egr,
      saldo: ing - egr,
      saldoPorCobrar: montoContrato !== null ? montoContrato - ing : null,
    };
  }, [optimisticMovs, montoContrato]);

  // Calcular saldo acumulado por fila (sobre todos, sin filtro)
  const filasConSaldo = useMemo(() => {
    return optimisticMovs.reduce<(typeof optimisticMovs[0] & { saldoAcumulado: number })[]>(
      (acc, m) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].saldoAcumulado : 0;
        const delta = m.tipo === "INGRESO_CLIENTE" ? m.monto : -m.monto;
        return [...acc, { ...m, saldoAcumulado: prev + delta }];
      },
      []
    );
  }, [optimisticMovs]);

  // Aplicar filtro y búsqueda
  const filas = useMemo(() => {
    return filasConSaldo.filter((m) => {
      const pasaTipo = filtroTipo === "TODOS" || m.tipo === filtroTipo;
      const q = busqueda.toLowerCase().trim();
      const pasaBusqueda = !q || m.concepto.toLowerCase().includes(q) || m.beneficiario.toLowerCase().includes(q);
      return pasaTipo && pasaBusqueda;
    });
  }, [filasConSaldo, filtroTipo, busqueda]);

  // Porcentajes sobre contrato
  const pctCobrado = montoContrato && montoContrato > 0
    ? Math.min(100, (totalIngresado / montoContrato) * 100) : null;
  const pctPorCobrar = montoContrato && montoContrato > 0 && saldoPorCobrar !== null
    ? Math.max(0, (saldoPorCobrar / montoContrato) * 100) : null;

  // Datos para gráficos
  const dataCobro = [
    { name: "Contrato",     value: montoContrato ?? 0,              fill: "#6b7280" },
    { name: "Cobrado",      value: totalIngresado,                  fill: "#059669" },
    { name: "Por Cobrar",   value: Math.max(0, saldoPorCobrar ?? 0), fill: "#0d9488" },
  ];
  const dataEgresos = [
    { name: "Egresado",   value: totalEgresado,          fill: "#dc2626" },
    { name: "Saldo Caja", value: Math.max(0, saldo),     fill: saldo >= 0 ? "#2563eb" : "#f97316" },
  ];

  function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    startTransition(async () => {
      const res = await eliminarMovimiento(proyectoId, id);
      if (res.ok) {
        toast.success("Movimiento eliminado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function exportPDF() {
    const empresa = getEmpresaConfig(proyectoId);
    const saldoColor = saldo >= 0 ? "#1d40ae" : "#c2410c";

    const filasPDF = filasConSaldo.map((m) => {
      const esIngreso = m.tipo === "INGRESO_CLIENTE";
      const tipoLabel = TIPOS_MOVIMIENTO.find((t) => t.value === m.tipo)?.label ?? m.tipo;
      const tdColor = esIngreso ? "#065f46" : "#991b1b";
      const tdSaldoColor = m.saldoAcumulado >= 0 ? "#1d40ae" : "#c2410c";
      const autorizadoHtml = m.autorizadoPor
        ? "<br><small style='color:#6b7280'>Autorizó: " + m.autorizadoPor + "</small>"
        : "";
      return (
        "<tr>" +
        "<td>" + new Date(m.fecha).toLocaleDateString("es-PY") + "</td>" +
        "<td style='color:" + tdColor + ";font-weight:600'>" + tipoLabel + "</td>" +
        "<td>" + m.concepto + autorizadoHtml + "</td>" +
        "<td>" + m.beneficiario + "</td>" +
        "<td>" + m.metodoPago + "</td>" +
        "<td>" + (m.nroComprobante ?? "—") + "</td>" +
        "<td style='text-align:right;color:#065f46;font-weight:600'>" + (esIngreso ? fmtGs(m.monto) : "—") + "</td>" +
        "<td style='text-align:right;color:#991b1b;font-weight:600'>" + (!esIngreso ? fmtGs(m.monto) : "—") + "</td>" +
        "<td style='text-align:right;color:" + tdSaldoColor + ";font-weight:700'>" + fmtGs(m.saldoAcumulado) + "</td>" +
        "</tr>"
      );
    }).join("");

    const kpiContrato = montoContrato
      ? "<div class='kpi'><div class='label'>Monto Contrato</div><div class='value' style='color:#374151'>" + fmtGs(montoContrato) + "</div></div>"
      : "";
    const kpiPorCobrar = saldoPorCobrar !== null
      ? "<div class='kpi'><div class='label'>Por Cobrar al Propietario</div><div class='value' style='color:#0f766e'>" + fmtGs(saldoPorCobrar) + "</div></div>"
      : "";

    const bodyContent =
      "<div class='kpis'>" +
        kpiContrato +
        "<div class='kpi'><div class='label'>Total Cobrado</div><div class='value' style='color:#065f46'>" + fmtGs(totalIngresado) + "</div></div>" +
        "<div class='kpi'><div class='label'>Total Egresado</div><div class='value' style='color:#991b1b'>" + fmtGs(totalEgresado) + "</div></div>" +
        "<div class='kpi'><div class='label'>Saldo en Caja</div><div class='value' style='color:" + saldoColor + "'>" + fmtGs(saldo) + "</div></div>" +
        kpiPorCobrar +
      "</div>" +
      "<h2>Libro Mayor de Movimientos</h2>" +
      "<table><thead><tr>" +
        "<th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Beneficiario</th><th>Medio Pago</th><th>Comprobante</th>" +
        "<th style='text-align:right'>Ingreso</th><th style='text-align:right'>Egreso</th><th style='text-align:right'>Saldo Acum.</th>" +
      "</tr></thead>" +
      "<tbody>" + filasPDF + "</tbody></table>";

    const proyNombre = document.title.replace(" — TEKÓGA", "");
    openBrandedPrintWindow(
      "Estado Financiero — " + proyNombre,
      "ESTADO FINANCIERO",
      proyNombre,
      bodyContent,
      empresa,
    );
  }

  function exportCSV() {
    const header = ["Fecha", "Tipo", "Concepto", "Beneficiario", "Medio de Pago", "Comprobante", "Ingreso (Gs.)", "Egreso (Gs.)", "Saldo Acumulado (Gs.)"];
    const rows = filasConSaldo.map((m) => [
      new Date(m.fecha).toLocaleDateString("es-PY"),
      TIPOS_MOVIMIENTO.find((t) => t.value === m.tipo)?.label ?? m.tipo,
      `"${m.concepto.replace(/"/g, '""')}"`,
      `"${m.beneficiario.replace(/"/g, '""')}"`,
      m.metodoPago,
      m.nroComprobante ?? "",
      m.tipo === "INGRESO_CLIENTE" ? m.monto : "",
      m.tipo !== "INGRESO_CLIENTE" ? m.monto : "",
      m.saldoAcumulado,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financiero-${proyectoId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportChartsPDF() {
    const empresa = getEmpresaConfig(proyectoId);
    const proyNombre = document.title.replace(" — TEKÓGA", "");

    // Helper: build a printable horizontal bar chart using CSS
    function buildBarChart(
      title: string,
      subtitle: string,
      items: { name: string; value: number; fill: string }[],
    ): string {
      const maxVal = Math.max(...items.map((d) => d.value), 1);
      const rows = items
        .map((d) => {
          const pct = Math.min(100, (d.value / maxVal) * 100).toFixed(1);
          return (
            `<tr>` +
            `<td style='width:110pt;font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;white-space:nowrap;vertical-align:middle'>${d.name}</td>` +
            `<td style='vertical-align:middle;padding:4pt 0'>` +
              `<div style='width:100%;background:#f3f4f6;border-radius:4pt;height:18pt;overflow:hidden'>` +
                `<div style='width:${pct}%;background:${d.fill};height:100%;border-radius:4pt;display:flex;align-items:center;padding-left:6pt;box-sizing:border-box;min-width:2pt'></div>` +
              `</div>` +
            `</td>` +
            `<td style='width:90pt;text-align:right;font-size:9pt;font-weight:700;color:#111;padding:5pt 0 5pt 8pt;white-space:nowrap;vertical-align:middle'>${fmtGs(d.value)}</td>` +
            `</tr>`
          );
        })
        .join("");
      return (
        `<div style='margin-bottom:18pt'>` +
          `<div style='margin-bottom:6pt'>` +
            `<span style='font-size:10pt;font-weight:700;color:#111'>${title}</span>` +
            `<span style='font-size:8.5pt;color:#6b7280;margin-left:8pt'>${subtitle}</span>` +
          `</div>` +
          `<table style='width:100%;border-collapse:collapse'>` +
            `<tbody>${rows}</tbody>` +
          `</table>` +
        `</div>`
      );
    }

    // KPIs
    const saldoColor = saldo >= 0 ? "#1d40ae" : "#c2410c";
    const kpiHtml =
      `<div style='display:flex;gap:10pt;flex-wrap:wrap;margin-bottom:18pt'>` +
        (montoContrato ? `<div class='kpi'><div class='label'>Monto Contrato</div><div class='value' style='color:#374151'>${fmtGs(montoContrato)}</div></div>` : "") +
        `<div class='kpi'><div class='label'>Total Cobrado</div><div class='value' style='color:#065f46'>${fmtGs(totalIngresado)}</div></div>` +
        `<div class='kpi'><div class='label'>Total Egresado</div><div class='value' style='color:#991b1b'>${fmtGs(totalEgresado)}</div></div>` +
        `<div class='kpi'><div class='label'>Saldo en Caja</div><div class='value' style='color:${saldoColor}'>${fmtGs(saldo)}</div></div>` +
        (saldoPorCobrar !== null ? `<div class='kpi'><div class='label'>Por Cobrar al Propietario</div><div class='value' style='color:#0f766e'>${fmtGs(saldoPorCobrar)}</div></div>` : "") +
      `</div>`;

    // Porcentajes
    const pctHtml = (montoContrato && montoContrato > 0 && pctCobrado !== null)
      ? `<div style='margin-bottom:16pt;padding:8pt 10pt;background:#f9fafb;border:0.5pt solid #e5e7eb;border-radius:5pt;font-size:8.5pt;color:#374151'>` +
          `Avance contractual: <strong style='color:#059669'>${pctCobrado.toFixed(1)}% cobrado</strong>` +
          (pctPorCobrar !== null ? ` &nbsp;·&nbsp; <strong style='color:#0d9488'>${pctPorCobrar.toFixed(1)}% pendiente de cobro</strong>` : "") +
        `</div>`
      : "";

    const chart1 = buildBarChart(
      "Contrato · Cobrado · Saldo por Cobrar",
      "Comparación del monto de contrato con lo cobrado y el saldo pendiente del propietario",
      dataCobro,
    );
    const chart2 = buildBarChart(
      "Total Egresado · Saldo en Caja",
      "Egresos registrados (proveedores, personal, etc.) y saldo disponible",
      dataEgresos,
    );

    const bodyContent =
      `<h2>Resumen Financiero</h2>` +
      kpiHtml +
      pctHtml +
      `<h2>Análisis Gráfico</h2>` +
      chart1 +
      chart2;

    openBrandedPrintWindow(
      "Gráficos Financieros — " + proyNombre,
      "ESTADO FINANCIERO — GRÁFICOS",
      proyNombre,
      bodyContent,
      empresa,
    );
  }

  return (
    <div className="space-y-5">
      {/* FILA 1: Monto Contrato | Total Cobrado | Saldo por Cobrar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Monto Contrato */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
          <div className="rounded-lg p-2 bg-gray-500 flex-shrink-0"><CircleDollarSign className="w-5 h-5 text-white" /></div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Monto Contrato</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{montoContrato ? fmtGs(montoContrato) : "No definido"}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Base del acuerdo</p>
          </div>
        </div>
        {/* Total Cobrado */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
          <div className="rounded-lg p-2 bg-emerald-600 flex-shrink-0"><TrendingUp className="w-5 h-5 text-white" /></div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Cobrado</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtGs(totalIngresado)}</p>
            {pctCobrado !== null ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{pctCobrado.toFixed(1)}% del contrato</p>
            ) : <p className="text-xs text-gray-400 mt-0.5">Sin monto de contrato</p>}
          </div>
        </div>
        {/* Saldo por Cobrar */}
        <div className={`rounded-xl border-2 p-4 flex items-center gap-3 ${
          saldoPorCobrar === null ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          : saldoPorCobrar > 0 ? "border-teal-400 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20"
          : saldoPorCobrar === 0 ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
          : "border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20"
        }`}>
          <div className={`rounded-lg p-2 flex-shrink-0 ${
            saldoPorCobrar === null ? "bg-gray-400" : saldoPorCobrar >= 0 ? "bg-teal-600" : "bg-orange-500"
          }`}>
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Saldo por Cobrar al Propietario</p>
            <p className={`text-sm font-semibold ${
              saldoPorCobrar === null ? "text-gray-400"
              : saldoPorCobrar > 0 ? "text-teal-700 dark:text-teal-400"
              : saldoPorCobrar === 0 ? "text-emerald-700 dark:text-emerald-400"
              : "text-orange-600 dark:text-orange-400"
            }`}>
              {saldoPorCobrar === null ? "Sin monto de contrato" : fmtGs(saldoPorCobrar)}
            </p>
            {pctPorCobrar !== null && (
              <p className={`text-xs font-medium mt-0.5 ${
                (saldoPorCobrar ?? 0) > 0 ? "text-teal-600 dark:text-teal-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>{pctPorCobrar.toFixed(1)}% pendiente</p>
            )}
          </div>
        </div>
      </div>

      {/* FILA 2: Total Egresado | Saldo en Caja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <KPI label="Total Egresado" value={fmtGs(totalEgresado)} color="bg-red-600"                                    icon={TrendingDown} />
        <KPI label="Saldo en Caja"  value={fmtGs(saldo)}         color={saldo >= 0 ? "bg-blue-600" : "bg-orange-600"} icon={Wallet} />
      </div>

      {/* TABS */}
      <div>
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 mb-5">
          {(["libro", "graficos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t === "libro"
                ? <><Landmark className="w-4 h-4" /> Libro Mayor</>
                : <><BarChart2 className="w-4 h-4" /> Gráficos</>}
            </button>
          ))}
          <div className="ml-auto mb-1 flex items-center gap-2">
            {tab === "libro" && (
              <>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Exportar Libro Mayor a CSV"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Exportar / Imprimir Estado Financiero en PDF"
                >
                  <FileText className="w-4 h-4" /> PDF
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Registrar Movimiento
                </button>
              </>
            )}
            {tab === "graficos" && (
              <button
                onClick={exportChartsPDF}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Exportar / Imprimir Gráficos Financieros"
              >
                <FileText className="w-4 h-4" /> Exportar PDF
              </button>
            )}
          </div>
        </div>

        {/* ── Filtros del Libro Mayor ── */}
        {tab === "libro" && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar concepto o beneficiario…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Filtro tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="py-2 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los tipos</option>
              {TIPOS_MOVIMIENTO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {(filtroTipo !== "TODOS" || busqueda) && (
              <button
                onClick={() => { setFiltroTipo("TODOS"); setBusqueda(""); }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                Limpiar filtros
              </button>
            )}
            {(filtroTipo !== "TODOS" || busqueda) && (
              <span className="text-xs text-gray-400">{filas.length} resultado{filas.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        )}

        {/* ── TAB: Libro Mayor ── */}
        {tab === "libro" && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Beneficiario</th>
                    <th className="px-4 py-3 text-left">Medio de Pago</th>
                    <th className="px-4 py-3 text-left">Comprobante</th>
                    <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">Ingreso</th>
                    <th className="px-4 py-3 text-right text-red-600 dark:text-red-400">Egreso</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-400 dark:text-gray-500">
                        No hay movimientos registrados. Comenzá por registrar el primer anticipo.
                      </td>
                    </tr>
                  ) : (
                    filas.map((m) => (
                      <tr key={m.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtFecha(m.fecha)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.tipo === "INGRESO_CLIENTE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {TIPOS_MOVIMIENTO.find((t) => t.value === m.tipo)?.label ?? m.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white max-w-[200px]">
                          <p className="truncate">{m.concepto}</p>
                          {m.autorizadoPor && <p className="text-xs text-gray-400">Autorizó: {m.autorizadoPor}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{m.beneficiario}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <BadgeMetodo metodo={m.metodoPago} detalle={m.otroMetodoDetalle} />
                          {m.metodoPago === "CHEQUE" && m.nroCheque && (
                            <p className="text-xs text-gray-400 mt-0.5">#{m.nroCheque} · {m.bancoCheque}</p>
                          )}
                          {(m.metodoPago === "TRANSFERENCIA" || m.metodoPago === "GIRO") && m.nroTransaccion && (
                            <p className="text-xs text-gray-400 mt-0.5">TX: {m.nroTransaccion} · {m.bancoTransfer}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{m.nroComprobante ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {m.tipo === "INGRESO_CLIENTE" ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtGs(m.monto)}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {m.tipo !== "INGRESO_CLIENTE" ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">{fmtGs(m.monto)}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">
                          <span className={m.saldoAcumulado >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}>
                            {fmtGs(m.saldoAcumulado)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDetalleMovimiento(m)}
                              title="Ver detalle del movimiento"
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:text-blue-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEliminar(m.id)}
                              title="Eliminar movimiento"
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: Gráficos ── */}
        {tab === "graficos" && (
          <div className="space-y-5">
            {/* Gráfico 1: Cobro */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-500" /> Contrato · Cobrado · Saldo por Cobrar
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Comparación del monto de contrato con lo cobrado y el saldo pendiente del propietario</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dataCobro} layout="vertical" margin={{ left: 10, right: 50, top: 4, bottom: 4 }}>
                  <XAxis type="number" tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip formatter={(v) => [fmtGs(Number(v ?? 0)), "Monto"]} cursor={{ fill: "rgba(100,116,139,0.08)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, formatter: (v: unknown) => Number(v) > 0 ? `${(Number(v)/1_000_000).toFixed(1)}M` : "" }}>
                    {dataCobro.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {montoContrato && montoContrato > 0 && (
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Cobrado: <strong className="text-emerald-600 dark:text-emerald-400">{pctCobrado?.toFixed(1)}%</strong></span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-600 inline-block" /> Por cobrar: <strong className="text-teal-600 dark:text-teal-400">{pctPorCobrar?.toFixed(1)}%</strong></span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-500 inline-block" /> Contrato total: <strong className="text-gray-600 dark:text-gray-300">{fmtGs(montoContrato)}</strong></span>
                </div>
              )}
            </div>

            {/* Gráfico 2: Egresos */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Total Egresado · Saldo en Caja
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Total de egresos registrados (pagos a proveedores, personal, etc.) y saldo disponible en caja</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={dataEgresos} layout="vertical" margin={{ left: 10, right: 50, top: 4, bottom: 4 }}>
                  <XAxis type="number" tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip formatter={(v) => [fmtGs(Number(v ?? 0)), "Monto"]} cursor={{ fill: "rgba(100,116,139,0.08)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, formatter: (v: unknown) => Number(v) > 0 ? `${(Number(v)/1_000_000).toFixed(1)}M` : "" }}>
                    {dataEgresos.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ModalNuevoMovimiento
          proyectoId={proyectoId}
          onClose={() => setShowModal(false)}
          onCreado={(m) => {
            startTransition(() => {
              addOptimistic(m);
              router.refresh();
            });
          }}
        />
      )}
      {detalleMovimiento && (
        <ModalDetalleMovimiento
          m={detalleMovimiento}
          proyectoId={proyectoId}
          onClose={() => setDetalleMovimiento(null)}
          onEditar={() => setEditarMovimiento(detalleMovimiento)}
        />
      )}
      {editarMovimiento && (
        <ModalEditarMovimiento
          m={editarMovimiento}
          proyectoId={proyectoId}
          onClose={() => setEditarMovimiento(null)}
          onActualizado={() => {
            setEditarMovimiento(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
