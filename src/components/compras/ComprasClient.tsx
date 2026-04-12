"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus, X, Trash2, CheckCircle, Ban, ChevronDown, ChevronUp,
  FileText, Building2, AlertTriangle, ExternalLink, Receipt,
} from "lucide-react";
import { crearFactura, actualizarEstadoFactura, eliminarFactura } from "@/app/proyectos/[id]/compras/actions";
import type { NuevaFacturaData } from "@/app/proyectos/[id]/compras/actions";
import type { FacturaProveedor, Proveedor, EstadoFactura } from "@prisma/client";
import Link from "next/link";

type FacturaConMonto = Omit<FacturaProveedor, "monto" | "montoPagado"> & { monto: number; montoPagado: number };
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

// ─── Fila de proveedor (expandible con sus facturas) ─────────
function FilaProveedor({
  proyectoId,
  proveedor,
  onFacturaActualizada,
  onFacturaEliminada,
  onCargarFactura,
}: {
  proyectoId: string;
  proveedor: ProveedorConFacturas;
  onFacturaActualizada: (provId: string, factId: string, estado: EstadoFactura) => void;
  onFacturaEliminada: (provId: string, factId: string) => void;
  onCargarFactura: (proveedorId: string) => void;
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
                        {f.estado === "PENDIENTE" && (
                          <button
                            onClick={() => handleCambiarEstado(f.id, "PAGADA")}
                            title="Marcar como pagada"
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

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-500" />
          Proveedores en este proyecto
        </h2>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Cargar Factura
        </button>
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

      {modal !== null && (
        <ModalCargarFactura
          proyectoId={proyectoId}
          proveedoresDisponibles={proveedoresDisponibles}
          proveedorPreseleccionado={modal.proveedorId}
          onClose={() => setModal(null)}
          onCreada={() => { /* handled via reload */ }}
        />
      )}
    </div>
  );
}

