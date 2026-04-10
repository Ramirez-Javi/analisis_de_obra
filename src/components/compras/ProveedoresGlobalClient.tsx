"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus, X, ChevronDown, ChevronUp, ShieldOff, Shield,
  Pencil, Save, Users, Phone, Mail, Building2, CreditCard, Search, Trash2,
} from "lucide-react";
import {
  crearProveedorGlobal,
  actualizarProveedorGlobal,
  toggleActivarProveedor,
  eliminarProveedorGlobal,
} from "@/app/compras/actions";
import type { ProveedorData } from "@/app/compras/actions";
import type { Proveedor } from "@prisma/client";

type ProveedorConCount = Proveedor & { _count: { facturas: number } };

interface Props {
  proveedores: ProveedorConCount[];
}

const inputCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors";

const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

// ─── Formulario de proveedor (shared para crear y editar) ────
function FormProveedor({
  initial,
  onCancel,
  onSubmit,
  submitLabel,
  pending,
}: {
  initial: Partial<ProveedorData>;
  onCancel: () => void;
  onSubmit: (data: ProveedorData) => void;
  submitLabel: string;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<ProveedorData>>(initial);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razonSocial?.trim()) { toast.error("La razón social es obligatoria"); return; }
    onSubmit(form as ProveedorData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos legales */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Datos Legales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Razón Social *</label>
            <input type="text" value={form.razonSocial ?? ""} onChange={(e) => set("razonSocial", e.target.value)}
              placeholder="Ej: Ferretería San José S.A." className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>RUC / CUIT</label>
            <input type="text" value={form.ruc ?? ""} onChange={(e) => set("ruc", e.target.value)}
              placeholder="80012345-6" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo de Persona</label>
            <select value={form.tipoPersona ?? "JURIDICA"} onChange={(e) => set("tipoPersona", e.target.value)} className={inputCls}>
              <option value="JURIDICA">Jurídica (empresa)</option>
              <option value="FISICA">Física (persona)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Dirección</label>
            <input type="text" value={form.direccion ?? ""} onChange={(e) => set("direccion", e.target.value)}
              placeholder="Ej: Av. Santa Teresa 1234, Asunción" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email corporativo</label>
            <input type="email" value={form.emailEmpresa ?? ""} onChange={(e) => set("emailEmpresa", e.target.value)}
              placeholder="ventas@empresa.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Vendedores de contacto</label>
            <input type="text" value={form.vendedores ?? ""} onChange={(e) => set("vendedores", e.target.value)}
              placeholder="Ej: Juan García, María López" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Contacto Principal</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre del contacto</label>
            <input type="text" value={form.contactoNombre ?? ""} onChange={(e) => set("contactoNombre", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input type="text" value={form.contactoTelefono ?? ""} onChange={(e) => set("contactoTelefono", e.target.value)}
              placeholder="0981 123 456" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email del contacto</label>
            <input type="email" value={form.contactoEmail ?? ""} onChange={(e) => set("contactoEmail", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Datos bancarios */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Datos Bancarios</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Banco</label>
            <input type="text" value={form.banco ?? ""} onChange={(e) => set("banco", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo de Cuenta</label>
            <select value={form.tipoCuenta ?? ""} onChange={(e) => set("tipoCuenta", e.target.value)} className={inputCls}>
              <option value="">— Tipo —</option>
              <option value="CORRIENTE">Corriente</option>
              <option value="AHORRO">Ahorro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Número de Cuenta</label>
            <input type="text" value={form.numeroCuenta ?? ""} onChange={(e) => set("numeroCuenta", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className={labelCls}>Observaciones</label>
        <textarea rows={2} value={form.observaciones ?? ""} onChange={(e) => set("observaciones", e.target.value)}
          className={`${inputCls} resize-none`} />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
          <Save className="w-4 h-4" /> {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Fila expandible de proveedor ────────────────────────────
function FilaProveedor({ proveedor, onToggle, onUpdated, onEliminar }: {
  proveedor: ProveedorConCount;
  onToggle: (id: string) => void;
  onUpdated: (p: ProveedorConCount) => void;
  onEliminar: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleEliminar() {
    startTransition(async () => {
      const res = await eliminarProveedorGlobal(proveedor.id);
      if (res.ok) {
        toast.success(`Proveedor "${proveedor.razonSocial}" eliminado`);
        onEliminar(proveedor.id);
      } else {
        toast.error(res.error ?? "Error al eliminar");
        setConfirmDelete(false);
      }
    });
  }

  function handleSave(data: ProveedorData) {
    startTransition(async () => {
      const res = await actualizarProveedorGlobal(proveedor.id, data);
      if (res.ok) {
        toast.success("Proveedor actualizado");
        const updated: ProveedorConCount = {
          ...proveedor,
          razonSocial: data.razonSocial,
          ruc: data.ruc ?? null,
          tipoPersona: data.tipoPersona ?? "JURIDICA",
          direccion: data.direccion ?? null,
          emailEmpresa: data.emailEmpresa ?? null,
          vendedores: data.vendedores ?? null,
          contactoNombre: data.contactoNombre ?? null,
          contactoTelefono: data.contactoTelefono ?? null,
          contactoEmail: data.contactoEmail ?? null,
          banco: data.banco ?? null,
          tipoCuenta: data.tipoCuenta ?? null,
          numeroCuenta: data.numeroCuenta ?? null,
          observaciones: data.observaciones ?? null,
        };
        onUpdated(updated);
        setEditMode(false);
        setExpanded(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className={`rounded-xl border transition-colors ${
      proveedor.activo
        ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60"
    }`}>
      {/* Cabecera de la fila */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
        onClick={() => { setExpanded((p) => !p); setEditMode(false); }}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">
            {proveedor.razonSocial.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{proveedor.razonSocial}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {proveedor.ruc && (
              <span className="text-xs text-gray-400">RUC: {proveedor.ruc}</span>
            )}
            {proveedor.contactoTelefono && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Phone className="w-3 h-3" /> {proveedor.contactoTelefono}
              </span>
            )}
            {proveedor.contactoNombre && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3 h-3" /> {proveedor.contactoNombre}
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {proveedor._count.facturas} {proveedor._count.facturas === 1 ? "factura" : "facturas"}
          </span>
          <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            proveedor.activo
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}>
            {proveedor.activo ? "Activo" : "Inactivo"}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Panel expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
          {editMode ? (
            <FormProveedor
              initial={{
                razonSocial: proveedor.razonSocial,
                ruc: proveedor.ruc ?? undefined,
                tipoPersona: proveedor.tipoPersona,
                direccion: proveedor.direccion ?? undefined,
                emailEmpresa: proveedor.emailEmpresa ?? undefined,
                vendedores: proveedor.vendedores ?? undefined,
                contactoNombre: proveedor.contactoNombre ?? undefined,
                contactoTelefono: proveedor.contactoTelefono ?? undefined,
                contactoEmail: proveedor.contactoEmail ?? undefined,
                banco: proveedor.banco ?? undefined,
                tipoCuenta: proveedor.tipoCuenta ?? undefined,
                numeroCuenta: proveedor.numeroCuenta ?? undefined,
                observaciones: proveedor.observaciones ?? undefined,
              }}
              onCancel={() => setEditMode(false)}
              onSubmit={handleSave}
              submitLabel="Guardar Cambios"
              pending={pending}
            />
          ) : (
            <>
              {/* Vista de detalles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {proveedor.direccion && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dirección</p>
                    <p className="text-gray-700 dark:text-gray-300">{proveedor.direccion}</p>
                  </div>
                )}
                {proveedor.emailEmpresa && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Email corporativo</p>
                    <p className="text-gray-700 dark:text-gray-300">{proveedor.emailEmpresa}</p>
                  </div>
                )}
                {proveedor.vendedores && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Vendedores</p>
                    <p className="text-gray-700 dark:text-gray-300">{proveedor.vendedores}</p>
                  </div>
                )}
                {proveedor.contactoEmail && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Email contacto</p>
                    <p className="text-gray-700 dark:text-gray-300">{proveedor.contactoEmail}</p>
                  </div>
                )}
                {(proveedor.banco || proveedor.numeroCuenta) && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Cuenta bancaria</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {[proveedor.banco, proveedor.tipoCuenta, proveedor.numeroCuenta].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}
                {proveedor.observaciones && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Observaciones</p>
                    <p className="text-gray-700 dark:text-gray-300">{proveedor.observaciones}</p>
                  </div>
                )}
              </div>
              {/* Acciones */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => onToggle(proveedor.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    proveedor.activo
                      ? "border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      : "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  }`}
                >
                  {proveedor.activo ? <><ShieldOff className="w-3.5 h-3.5" /> Desactivar</> : <><Shield className="w-3.5 h-3.5" /> Activar</>}
                </button>

                {/* Eliminar */}
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                ) : (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">¿Eliminar definitivamente?</span>
                    <button
                      onClick={handleEliminar}
                      disabled={pending}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {pending ? "Eliminando…" : "Confirmar"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal: Nuevo Proveedor ──────────────────────────────────
function ModalNuevoProveedor({ onClose, onCreado }: {
  onClose: () => void;
  onCreado: (p: ProveedorConCount) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(data: ProveedorData) {
    startTransition(async () => {
      const res = await crearProveedorGlobal(data);
      if (res.ok && res.proveedor) {
        toast.success(`Proveedor "${data.razonSocial}" creado`);
        onCreado({ ...res.proveedor, _count: { facturas: 0 } });
        onClose();
      } else {
        toast.error(res.error ?? "Error al crear proveedor");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Nuevo Proveedor
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <FormProveedor
            initial={{ tipoPersona: "JURIDICA" }}
            onCancel={onClose}
            onSubmit={handleSubmit}
            submitLabel="Crear Proveedor"
            pending={pending}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────
export function ProveedoresGlobalClient({ proveedores: initial }: Props) {
  const [proveedores, setProveedores] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(false);

  const filtrados = proveedores
    .filter((p) => !soloActivos || p.activo)
    .filter((p) =>
      !busqueda ||
      p.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.ruc ?? "").includes(busqueda) ||
      (p.contactoNombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
    );

  function handleToggle(id: string) {
    startTransition(async () => {
      const res = await toggleActivarProveedor(id);
      if (res.ok) {
        setProveedores((prev) =>
          prev.map((p) => p.id === id ? { ...p, activo: res.nuevoEstado! } : p)
        );
        toast.success(res.nuevoEstado ? "Proveedor activado" : "Proveedor desactivado");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleUpdated(updated: ProveedorConCount) {
    setProveedores((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  }

  function handleEliminar(id: string) {
    setProveedores((prev) => prev.filter((p) => p.id !== id));
  }

  const activos = proveedores.filter((p) => p.activo).length;
  const inactivos = proveedores.length - activos;

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{proveedores.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activos}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Activos</p>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{inactivos}</p>
          <p className="text-xs text-gray-400 mt-0.5">Inactivos</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por razón social, RUC o contacto…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        {/* Filtro activos */}
        <button
          onClick={() => setSoloActivos((p) => !p)}
          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            soloActivos
              ? "bg-emerald-600 text-white border-emerald-600"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
          }`}
        >
          Solo activos
        </button>
        {/* Nuevo proveedor */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            {proveedores.length === 0
              ? "No hay proveedores registrados. Creá el primero con el botón de arriba."
              : "No se encontraron proveedores con ese criterio de búsqueda."}
          </div>
        ) : (
          filtrados.map((p) => (
            <FilaProveedor
              key={p.id}
              proveedor={p}
              onToggle={handleToggle}
              onUpdated={handleUpdated}
              onEliminar={handleEliminar}
            />
          ))
        )}
      </div>

      {showModal && (
        <ModalNuevoProveedor
          onClose={() => setShowModal(false)}
          onCreado={(p) => setProveedores((prev) => [p, ...prev])}
        />
      )}
    </div>
  );
}
