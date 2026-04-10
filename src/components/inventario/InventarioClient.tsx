"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Package, Plus, Trash2, X, Save, MapPin, ClipboardList,
  Download, FileText, ChevronDown, ChevronUp, BarChart3,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
  crearAmbiente, eliminarAmbiente,
  crearRecepcion, eliminarRecepcion,
  crearAsBuilt, eliminarAsBuilt,
  type RecepcionData, type AsBuiltData,
} from "@/app/proyectos/[id]/inventario/actions";
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

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function calcStock(r: RecepcionConDetalle) {
  const salida = r.asBuiltRegistros.reduce((s, a) => s + a.cantidadInstalada, 0);
  return r.cantidadRecibida - salida;
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
  proyectoId, recepciones, materiales, proveedores, onCreada, onEliminada,
}: {
  proyectoId: string;
  recepciones: RecepcionConDetalle[];
  materiales: MaterialSelect[];
  proveedores: ProveedorSelect[];
  onCreada: (r: RecepcionConDetalle) => void;
  onEliminada: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState<Partial<RecepcionData>>({
    fechaRecepcion: new Date().toISOString().slice(0, 10),
  });

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

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
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <Plus className="w-4 h-4" /> Registrar Remisión
        </button>
      </div>

      {/* Tabla de recepciones */}
      {recepciones.length === 0 ? (
        <p className="text-center py-10 text-sm text-gray-400">No hay materiales registrados en bodega.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Material</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Proveedor</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Remisión / Lote</th>
                <th className="text-right px-4 py-3">Recibido</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recepciones.map((r) => {
                const stock = calcStock(r);
                const agotado = stock <= 0;
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
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      <span className={agotado ? "text-red-500" : stock < r.cantidadRecibida * 0.2 ? "text-orange-500" : "text-emerald-500"}>
                        {stock.toFixed(2)} {r.material.unidadMedida.simbolo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">{fmtFecha(r.fechaRecepcion)}</td>
                    <td className="px-4 py-3 text-right">
                      {confirmDel === r.id ? (
                        <div className="flex items-center gap-1 justify-end">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
}

// ─── Tab 3: Matriz As-Built ───────────────────────────────────
function TabAsBuilt({
  proyectoId, ambientes, recepciones, asBuiltPorAmbiente,
}: {
  proyectoId: string;
  ambientes: AmbienteConCount[];
  recepciones: RecepcionConDetalle[];
  asBuiltPorAmbiente: AmbienteConAsBuilt[];
}) {
  const [ambienteSelId, setAmbienteSelId] = useState<string>(ambientes[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
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
                <button onClick={() => handleEliminar(reg.id)} disabled={pending}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0 self-start">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 4: Exportar Dossier ──────────────────────────────────
function TabExportar({
  asBuiltPorAmbiente, proyectoNombre,
}: {
  asBuiltPorAmbiente: AmbienteConAsBuilt[];
  proyectoNombre: string;
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
    { id: "asbuilt",  label: "Matriz As-Built", icon: BarChart3 },
    { id: "exportar", label: "Exportar Dossier", icon: Download },
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
          recepciones={recepciones}
          materiales={materiales}
          proveedores={proveedores}
          onCreada={() => {}}
          onEliminada={() => {}}
        />
      )}
      {tab === "asbuilt" && (
        <TabAsBuilt
          proyectoId={proyectoId}
          ambientes={ambientes}
          recepciones={recepciones}
          asBuiltPorAmbiente={asBuiltPorAmbiente}
        />
      )}
      {tab === "exportar" && (
        <TabExportar
          asBuiltPorAmbiente={asBuiltPorAmbiente}
          proyectoNombre={proyectoNombre}
        />
      )}
    </div>
  );
}
