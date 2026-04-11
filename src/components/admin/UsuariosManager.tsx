"use client";

import { useState, useTransition } from "react";
import {
  Users, Plus, Trash2, Shield, ShieldOff, Check, X,
  ChevronDown, ChevronUp, Key, FolderOpen, Calculator,
  CalendarDays, HardHat, Truck, FileDown, User, Mail, Lock,
  Landmark, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  crearUsuario,
  actualizarPermisos,
  toggleActivarUsuario,
  eliminarUsuario,
  cambiarPasswordUsuario,
  type ModuloPermiso,
} from "@/app/admin/usuarios/actions";

// ── Módulos disponibles ────────────────────────────────────────────────────
const MODULOS: { id: ModuloPermiso; label: string; icon: React.ElementType; color: string }[] = [
  { id: "PROYECTO",    label: "Proyecto / Ficha",          icon: FolderOpen,    color: "text-blue-500"   },
  { id: "PRESUPUESTO", label: "C\u00f3mputo y Presupuesto",     icon: Calculator,    color: "text-emerald-500" },
  { id: "CRONOGRAMA",  label: "Cronograma y Avances",      icon: CalendarDays,  color: "text-violet-500" },
  { id: "MANO_OBRA",   label: "Gesti\u00f3n de Mano de Obra",   icon: HardHat,       color: "text-orange-500" },
  { id: "LOGISTICA",   label: "Maquinarias y Log\u00edstica",   icon: Truck,         color: "text-yellow-500" },
  { id: "REPORTES",    label: "Exportaci\u00f3n y Reportes",    icon: FileDown,      color: "text-rose-500"   },
  { id: "FINANCIERO",  label: "Estado Financiero",          icon: Landmark,      color: "text-sky-500"    },
  { id: "COMPRAS",     label: "Proveedores y Compras",      icon: ShoppingCart,  color: "text-orange-500" },
];

// ── Tipos ──────────────────────────────────────────────────────────────────
interface UsuarioRow {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  activo: boolean;
  createdAt: Date;
  permisos: { modulo: string }[];
}

interface Props {
  usuarios: UsuarioRow[];
}

const inputCls =
  "w-full pl-10 pr-4 py-2 rounded-lg text-sm border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/60 bg-white dark:text-slate-100 text-slate-800 dark:placeholder:text-slate-500 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all";

// ── Selector de permisos ───────────────────────────────────────────────────
function PermisosSelector({
  selected,
  onChange,
}: {
  selected: ModuloPermiso[];
  onChange: (v: ModuloPermiso[]) => void;
}) {
  function toggle(id: ModuloPermiso) {
    onChange(
      selected.includes(id)
        ? selected.filter((m) => m !== id)
        : [...selected, id]
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {MODULOS.map(({ id, label, icon: Icon, color }) => {
        const active = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150 text-left ${
              active
                ? "dark:bg-teal-500/15 bg-teal-50 dark:border-teal-500/30 border-teal-300 dark:text-teal-300 text-teal-700"
                : "dark:border-white/[0.06] border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:border-white/20 hover:border-slate-300"
            }`}
          >
            <Icon size={14} className={active ? "" : color} />
            <span className="flex-1">{label}</span>
            {active ? <Check size={12} /> : <span className="w-3" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Fila de usuario existente ──────────────────────────────────────────────
function FilaUsuario({ usuario }: { usuario: UsuarioRow }) {
  const [expanded, setExpanded] = useState(false);
  const [permisos, setPermisos] = useState<ModuloPermiso[]>(
    usuario.permisos.map((p) => p.modulo as ModuloPermiso)
  );
  const [newPass, setNewPass] = useState("");
  const [isPending, startTransition] = useTransition();

  const esAdmin = usuario.rol === "ADMIN";

  function handleToggleActivo() {
    startTransition(async () => {
      const r = await toggleActivarUsuario(usuario.id, !usuario.activo);
      if (!r.ok) toast.error(r.error);
      else toast.success(usuario.activo ? "Usuario desactivado" : "Usuario activado");
    });
  }

  function handleGuardarPermisos() {
    startTransition(async () => {
      const r = await actualizarPermisos(usuario.id, permisos);
      if (!r.ok) toast.error(r.error);
      else toast.success("Permisos actualizados");
    });
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar al usuario ${usuario.nombre} ${usuario.apellido}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const r = await eliminarUsuario(usuario.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Usuario eliminado");
    });
  }

  function handleCambiarPass(e: React.FormEvent) {
    e.preventDefault();
    if (!newPass) return;
    startTransition(async () => {
      const r = await cambiarPasswordUsuario(usuario.id, newPass);
      if (!r.ok) toast.error(r.error);
      else { toast.success("Contraseña actualizada"); setNewPass(""); }
    });
  }

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      usuario.activo
        ? "dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white"
        : "dark:border-white/[0.03] border-slate-100 dark:bg-slate-900/40 bg-slate-50 opacity-60"
    }`}>
      {/* Header del usuario */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          esAdmin
            ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white"
            : "dark:bg-slate-700 bg-slate-200 dark:text-slate-300 text-slate-600"
        }`}>
          {usuario.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold dark:text-slate-100 text-slate-800 truncate">
            {usuario.nombre} {usuario.apellido}
          </p>
          <p className="text-xs dark:text-slate-500 text-slate-400 truncate">{usuario.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            esAdmin
              ? "dark:bg-teal-500/15 bg-teal-50 dark:text-teal-300 text-teal-700"
              : "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-400 text-slate-500"
          }`}>
            {esAdmin ? "ADMIN" : "USUARIO"}
          </span>
          {!esAdmin && (
            <>
              <button
                onClick={handleToggleActivo}
                disabled={isPending}
                title={usuario.activo ? "Desactivar" : "Activar"}
                className={`p-1.5 rounded-lg transition-colors ${
                  usuario.activo
                    ? "dark:hover:bg-amber-500/15 hover:bg-amber-50 dark:text-amber-400 text-amber-600"
                    : "dark:hover:bg-teal-500/15 hover:bg-teal-50 dark:text-teal-400 text-teal-600"
                }`}
              >
                {usuario.activo ? <ShieldOff size={15} /> : <Shield size={15} />}
              </button>
              <button
                onClick={handleEliminar}
                disabled={isPending}
                title="Eliminar usuario"
                className="p-1.5 rounded-lg dark:hover:bg-red-500/15 hover:bg-red-50 dark:text-red-400 text-red-600 transition-colors"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 dark:text-slate-400 text-slate-500 transition-colors"
              >
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Permisos rápidos (no-admin) */}
      {!esAdmin && !expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {permisos.length === 0 ? (
            <span className="text-[10px] dark:text-slate-600 text-slate-400">Sin permisos asignados</span>
          ) : (
            permisos.map((m) => {
              const mod = MODULOS.find((x) => x.id === m);
              return (
                <span key={m} className={`text-[10px] font-medium px-1.5 py-0.5 rounded dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500`}>
                  {mod?.label ?? m}
                </span>
              );
            })
          )}
        </div>
      )}

      {/* Panel expandido */}
      {!esAdmin && expanded && (
        <div className="border-t dark:border-white/[0.06] border-slate-100 px-4 py-4 space-y-5">
          {/* Permisos por módulo */}
          <div>
            <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 mb-3 flex items-center gap-1.5">
              <Shield size={12} /> Acceso a módulos
            </p>
            <PermisosSelector selected={permisos} onChange={setPermisos} />
            <button
              onClick={handleGuardarPermisos}
              disabled={isPending}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-60 transition-colors"
            >
              <Check size={12} />
              Guardar permisos
            </button>
          </div>

          {/* Cambiar contraseña */}
          <div>
            <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 mb-3 flex items-center gap-1.5">
              <Key size={12} /> Nueva contraseña
            </p>
            <form onSubmit={handleCambiarPass} className="flex gap-2">
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="flex-1 px-3 py-2 text-xs rounded-lg border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/60 bg-white dark:text-slate-100 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
              <button
                type="submit"
                disabled={isPending || !newPass}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-60 transition-colors"
              >
                Cambiar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulario nuevo usuario ───────────────────────────────────────────────
function FormNuevoUsuario({ onCancel }: { onCancel: () => void }) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
  });
  const [permisos, setPermisos] = useState<ModuloPermiso[]>([]);
  const [isPending, startTransition] = useTransition();

  function set(field: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [field]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await crearUsuario({ ...form, permisos });
      if (!r.ok) {
        toast.error(r.error);
      } else {
        toast.success("Usuario creado exitosamente");
        onCancel();
      }
    });
  }

  return (
    <div className="rounded-xl border dark:border-teal-500/20 border-teal-200 dark:bg-teal-500/5 bg-teal-50/50 p-5">
      <h3 className="text-sm font-semibold dark:text-teal-300 text-teal-700 mb-4 flex items-center gap-2">
        <Plus size={15} /> Nuevo usuario / funcionario
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">Nombre *</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
              <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Juan" required className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">Apellido</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
              <input type="text" value={form.apellido} onChange={(e) => set("apellido", e.target.value)} placeholder="Pérez" className={inputCls} />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">Correo electrónico *</label>
          <div className="relative">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="funcionario@empresa.com" required className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">Contraseña temporal *</label>
          <div className="relative">
            <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Mínimo 8 caracteres" required className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-2">Acceso a módulos *</label>
          <PermisosSelector selected={permisos} onChange={setPermisos} />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-60 transition-colors"
          >
            <Check size={14} />
            {isPending ? "Creando..." : "Crear usuario"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 hover:opacity-80 transition-opacity"
          >
            <X size={14} /> Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function UsuariosManager({ usuarios }: Props) {
  const [showForm, setShowForm] = useState(false);

  const admins = usuarios.filter((u) => u.rol === "ADMIN");
  const funcionarios = usuarios.filter((u) => u.rol === "USUARIO");

  return (
    <div className="space-y-8">
      {/* Administradores */}
      <div>
        <h2 className="text-sm font-semibold dark:text-slate-300 text-slate-700 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-teal-500" />
          Administradores ({admins.length})
        </h2>
        <div className="space-y-2">
          {admins.map((u) => (
            <FilaUsuario key={u.id} usuario={u} />
          ))}
        </div>
      </div>

      {/* Funcionarios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold dark:text-slate-300 text-slate-700 flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            Funcionarios ({funcionarios.length} / 10)
          </h2>
          {!showForm && funcionarios.length < 10 && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors"
            >
              <Plus size={13} />
              Agregar funcionario
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4">
            <FormNuevoUsuario onCancel={() => setShowForm(false)} />
          </div>
        )}

        <div className="space-y-2">
          {funcionarios.length === 0 && !showForm && (
            <div className="flex flex-col items-center py-10 text-center rounded-xl border dark:border-white/[0.04] border-slate-100 dark:bg-slate-900/40 bg-white">
              <Users size={28} className="dark:text-slate-700 text-slate-300 mb-2" />
              <p className="text-sm dark:text-slate-400 text-slate-500">No hay funcionarios agregados aún</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors"
              >
                <Plus size={13} /> Agregar primero
              </button>
            </div>
          )}
          {funcionarios.map((u) => (
            <FilaUsuario key={u.id} usuario={u} />
          ))}
        </div>
      </div>
    </div>
  );
}
