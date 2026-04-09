"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Wallet, CircleDollarSign,
  Plus, X, ChevronDown, Trash2, Landmark,
} from "lucide-react";
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

const CATEGORIAS = [
  { value: "ANTICIPO_PROPIETARIO",   label: "Anticipo de propietario" },
  { value: "CUOTA_PROPIETARIO",      label: "Cuota de propietario" },
  { value: "PAGO_MANO_OBRA",         label: "Pago de mano de obra" },
  { value: "PAGO_PROVEEDOR",         label: "Pago a proveedor" },
  { value: "HONORARIO_PROFESIONAL",  label: "Honorario profesional" },
  { value: "GASTO_ADMINISTRATIVO",   label: "Gasto administrativo" },
  { value: "DEVOLUCION",             label: "Devolución" },
  { value: "OTRO",                   label: "Otro" },
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
    tipo: "EGRESO",
    metodoPago: "EFECTIVO",
    fecha: new Date().toISOString().split("T")[0],
    categoria: "OTRO",
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
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {["INGRESO", "EGRESO"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("tipo", t)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.tipo === t
                    ? t === "INGRESO"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-red-600 text-white border-red-600"
                    : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                }`}
              >
                {t === "INGRESO" ? "↑ Ingreso" : "↓ Egreso"}
              </button>
            ))}
          </div>

          {/* Fecha + Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
              <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría *</label>
              <select value={form.categoria ?? "OTRO"} onChange={(e) => set("categoria", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
                {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
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
  const [, startTransition] = useTransition();

  // Calcular totales en runtime
  const { totalIngresado, totalEgresado, saldo } = useMemo(() => {
    let ing = 0, egr = 0;
    movimientos.forEach((m) => {
      if (m.tipo === "INGRESO") ing += m.monto;
      else egr += m.monto;
    });
    return { totalIngresado: ing, totalEgresado: egr, saldo: ing - egr };
  }, [movimientos]);

  // Calcular saldo acumulado por fila
  const filas = useMemo(() => {
    let acc = 0;
    return movimientos.map((m) => {
      acc += m.tipo === "INGRESO" ? m.monto : -m.monto;
      return { ...m, saldoAcumulado: acc };
    });
  }, [movimientos]);

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
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Monto Contrato"    value={montoContrato ? fmtGs(montoContrato) : "No definido"} color="bg-gray-500"    icon={CircleDollarSign} />
        <KPI label="Total Ingresado"   value={fmtGs(totalIngresado)}  color="bg-emerald-600"  icon={TrendingUp} />
        <KPI label="Total Egresado"    value={fmtGs(totalEgresado)}   color="bg-red-600"      icon={TrendingDown} />
        <KPI label="Saldo Disponible"  value={fmtGs(saldo)}           color={saldo >= 0 ? "bg-blue-600" : "bg-orange-600"} icon={Wallet} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-500" /> Libro Mayor
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Registrar Movimiento
        </button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
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
                  <td colSpan={9} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    No hay movimientos registrados. Comenzá por registrar el primer anticipo.
                  </td>
                </tr>
              ) : (
                filas.map((m) => (
                  <tr key={m.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtFecha(m.fecha)}</td>
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
                      {m.tipo === "INGRESO" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtGs(m.monto)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {m.tipo === "EGRESO" ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">{fmtGs(m.monto)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">
                      <span className={m.saldoAcumulado >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}>
                        {fmtGs(m.saldoAcumulado)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleEliminar(m.id)}
                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
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
