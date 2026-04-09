"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Wallet, CircleDollarSign,
  Plus, X, ChevronDown, Trash2, Landmark, CreditCard, BarChart2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { crearMovimiento, eliminarMovimiento } from "@/app/proyectos/[id]/financiero/actions";
import type { NuevoMovimientoData } from "@/app/proyectos/[id]/financiero/actions";
import type { MovimientoFinanciero, Proveedor } from "@prisma/client";

type MovimientoConProveedor = MovimientoFinanciero & {
  proveedor: Pick<Proveedor, "razonSocial"> | null;
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

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PY", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
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
        onClose();
        // Refrescar recargando la página (Server Component refetch via router)
        window.location.reload();
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
  const [movimientos, setMovimientos] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<"libro" | "graficos">("libro");
  const [, startTransition] = useTransition();

  // Calcular totales en runtime
  const { totalIngresado, totalEgresado, saldo, saldoPorCobrar } = useMemo(() => {
    let ing = 0, egr = 0;
    movimientos.forEach((m) => {
      if (m.tipo === "INGRESO_CLIENTE") ing += m.monto;
      else egr += m.monto;
    });
    return {
      totalIngresado: ing,
      totalEgresado: egr,
      saldo: ing - egr,
      saldoPorCobrar: montoContrato !== null ? montoContrato - ing : null,
    };
  }, [movimientos, montoContrato]);

  // Calcular saldo acumulado por fila
  const filas = useMemo(() => {
    let acc = 0;
    return movimientos.map((m) => {
      acc += m.tipo === "INGRESO_CLIENTE" ? m.monto : -m.monto;
      return { ...m, saldoAcumulado: acc };
    });
  }, [movimientos]);

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
        setMovimientos((prev) => prev.filter((m) => m.id !== id));
        toast.success("Movimiento eliminado");
      } else {
        toast.error(res.error);
      }
    });
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
          {tab === "libro" && (
            <button
              onClick={() => setShowModal(true)}
              className="ml-auto mb-1 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar Movimiento
            </button>
          )}
        </div>

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
                          <button
                            onClick={() => handleEliminar(m.id)}
                            title="Eliminar movimiento"
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          onCreado={() => {}}
        />
      )}
    </div>
  );
}
