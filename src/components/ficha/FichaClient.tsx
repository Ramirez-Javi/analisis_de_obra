"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, LayoutGrid, FileText, Building2, Users, HardHat,
  CalendarDays, BookOpen, CheckSquare, Pencil, Plus, Trash2,
  Phone, Mail, Globe, User, Loader2, ClipboardList, FileImage,
} from "lucide-react";
import { toast } from "sonner";
import {
  agregarMiembro, eliminarMiembro,
  agregarReunion, actualizarReunion, eliminarReunion,
  agregarAnotacion, eliminarAnotacion,
  guardarAprobacion,
  type MiembroData, type ReunionData, type AnotacionData, type AprobacionData,
} from "@/app/proyectos/[id]/ficha/actions";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Miembro = {
  id: string; nombre: string; apellido: string; titulo: string | null;
  rol: string; matricula: string | null; telefono: string | null; email: string | null;
};
type Reunion = {
  id: string; fecha: Date; hora: string | null; lugar: string | null;
  temas: string | null; acta: string | null; estado: string; representantes: string | null;
};
type Anotacion = {
  id: string; fecha: Date; hora: string | null; categoria: string;
  titulo: string; contenido: string; autor: string | null;
};
type Aprobacion = {
  fechaInicioContractual: Date | null; fechaFinContractual: Date | null;
  plazoEnDias: number | null; montoContratoGs: number | null;
  fechaAprobacionPlanos: Date | null; firmanteAprobacionPlanos: string | null; obsAprobacionPlanos: string | null;
  fechaAprobacionPres: Date | null; firmanteAprobacionPres: string | null; obsAprobacionPres: string | null;
  aprobadoPor: string | null;
  revisorNombre: string | null; revisorProfesion: string | null; fechaRevision: Date | null; obsRevision: string | null;
  respPresupuesto: string | null; respPresupuestoProfesion: string | null;
};
type Lamina = { id: string; codigo: string; titulo: string; disciplina: string };

export type ProyectoFicha = {
  id: string; codigo: string; nombre: string; descripcion: string | null;
  ubicacion: string | null; superficieM2: number | null; fechaInicio: Date | null;
  fechaFinEstimada: Date | null; estado: string;
  empresa: { nombre: string; titulo: string | null; direccion: string | null; telefono: string | null; email: string | null; web: string | null; ciudad: string | null; pais: string | null } | null;
  propietarios: { id: string; nombre: string; apellido: string; direccion: string | null; telefono: string | null; email: string | null }[];
  equipoTecnico: Miembro[];
  laminas: Lamina[];
  reuniones: Reunion[];
  anotaciones: Anotacion[];
  aprobacion: Aprobacion | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "datos",      label: "Datos Generales",  icon: FileText   },
  { id: "equipo",     label: "Equipo Técnico",    icon: HardHat    },
  { id: "reuniones",  label: "Reuniones",         icon: CalendarDays },
  { id: "bitacora",   label: "Bitácora",          icon: BookOpen   },
  { id: "aprobaciones", label: "Aprobaciones",    icon: CheckSquare },
] as const;
type TabId = typeof TABS[number]["id"];

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador", PRESUPUESTADO: "Presupuestado", EN_EJECUCION: "En ejecución",
  PAUSADO: "Pausado", FINALIZADO: "Finalizado", CANCELADO: "Cancelado",
};
const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-300 text-slate-600",
  PRESUPUESTADO: "dark:bg-blue-500/15 bg-blue-50 dark:text-blue-300 text-blue-700",
  EN_EJECUCION: "dark:bg-teal-500/15 bg-teal-50 dark:text-teal-300 text-teal-700",
  PAUSADO: "dark:bg-amber-500/15 bg-amber-50 dark:text-amber-300 text-amber-700",
  FINALIZADO: "dark:bg-emerald-500/15 bg-emerald-50 dark:text-emerald-300 text-emerald-700",
  CANCELADO: "dark:bg-red-500/15 bg-red-50 dark:text-red-300 text-red-700",
};
const ROL_LABELS: Record<string, string> = {
  DIRECTOR_OBRA: "Director de Obra", ARQUITECTO: "Arquitecto",
  INGENIERO_ESTRUCTURAL: "Ingeniero Estructural", INGENIERO_INSTALACIONES: "Ingeniero Inst.",
  MAESTRO_MAYOR: "Maestro Mayor", OTRO: "Otro",
};
const ESTADO_REUNION: Record<string, string> = {
  PROGRAMADA: "Programada", REALIZADA: "Realizada", CANCELADA: "Cancelada",
};
const CATEGORIA_LABELS: Record<string, string> = {
  REUNION: "Reunión", MODIFICACION: "Modificación", AJUSTE: "Ajuste",
  NOTA_LEGAL: "Nota Legal", OTRO: "Otro",
};

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border dark:border-white/[0.1] border-slate-200 dark:bg-slate-800/60 bg-white px-3 py-2 text-sm dark:text-slate-200 text-slate-800 placeholder:dark:text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 dark:focus:ring-teal-500 focus:ring-teal-600 transition";
const labelCls = "block text-[10px] uppercase tracking-wider font-semibold dark:text-slate-500 text-slate-400 mb-1";
const sectionTitleCls = "flex items-center gap-2 text-xs font-semibold dark:text-slate-300 text-slate-600 mb-4";
const cardCls = "rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-5 shadow-sm dark:shadow-none space-y-4";

function SectionHead({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className={sectionTitleCls}>
      <Icon size={14} className="text-teal-500" />
      <span>{children}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null | number }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className="text-sm dark:text-slate-200 text-slate-700">
        {value ?? <span className="dark:text-slate-600 text-slate-400 italic">—</span>}
      </p>
    </div>
  );
}

function BtnPrimary({ children, onClick, loading, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; loading?: boolean; type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors shadow-sm shadow-teal-500/20">
      {loading ? <Loader2 size={12} className="animate-spin" /> : null}
      {children}
    </button>
  );
}
function BtnGhost({ children, onClick, loading }: { children: React.ReactNode; onClick?: () => void; loading?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border dark:border-white/[0.1] border-slate-200 dark:text-slate-300 text-slate-600 dark:hover:bg-white/[0.05] hover:bg-slate-100 disabled:opacity-60 text-xs font-semibold transition-colors">
      {loading ? <Loader2 size={12} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

// ─── Tab 1: Datos Generales ───────────────────────────────────────────────────

function TabDatosGenerales({ p }: { p: ProyectoFicha }) {
  return (
    <div className="space-y-5">
      {/* Datos Generales */}
      <div className={cardCls}>
        <SectionHead icon={FileText}>Datos del Proyecto</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p className={labelCls}>Estado</p>
            <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${ESTADO_COLORS[p.estado]}`}>
              {ESTADO_LABELS[p.estado]}
            </span>
          </div>
          <Field label="Código" value={p.codigo} />
          <Field label="Nombre del Proyecto" value={p.nombre} />
          <Field label="Ubicación" value={p.ubicacion} />
          {p.descripcion && <div className="sm:col-span-2"><Field label="Descripción" value={p.descripcion} /></div>}
          {p.superficieM2 && <Field label="Superficie" value={`${p.superficieM2} m²`} />}
          {p.fechaInicio && <Field label="Fecha de inicio" value={fmtDate(p.fechaInicio)} />}
          {p.fechaFinEstimada && <Field label="Fecha fin estimada" value={fmtDate(p.fechaFinEstimada)} />}
        </div>
      </div>

      {/* Empresa */}
      {p.empresa && (
        <div className={cardCls}>
          <SectionHead icon={Building2}>Empresa / Estudio</SectionHead>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Nombre" value={p.empresa.nombre} />
            {p.empresa.titulo && <Field label="Título / Eslogan" value={p.empresa.titulo} />}
            {p.empresa.direccion && <Field label="Dirección" value={p.empresa.direccion} />}
            {p.empresa.ciudad && <Field label="Ciudad" value={`${p.empresa.ciudad}${p.empresa.pais ? `, ${p.empresa.pais}` : ""}`} />}
            {p.empresa.telefono && <div className="flex items-center gap-2"><Phone size={12} className="dark:text-slate-500 text-slate-400 shrink-0" /><Field label="Teléfono" value={p.empresa.telefono} /></div>}
            {p.empresa.email && <div className="flex items-center gap-2"><Mail size={12} className="dark:text-slate-500 text-slate-400 shrink-0" /><Field label="Email" value={p.empresa.email} /></div>}
            {p.empresa.web && <div className="flex items-center gap-2"><Globe size={12} className="dark:text-slate-500 text-slate-400 shrink-0" /><Field label="Web" value={p.empresa.web} /></div>}
          </div>
        </div>
      )}

      {/* Propietarios */}
      {p.propietarios.length > 0 && (
        <div className={cardCls}>
          <SectionHead icon={Users}>Propietarios</SectionHead>
          <div className="space-y-3">
            {p.propietarios.map((o, i) => (
              <div key={o.id} className="flex items-start gap-3 p-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.04] border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 text-xs font-bold text-white">{i + 1}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 flex-1">
                  <Field label="Nombre" value={`${o.nombre} ${o.apellido}`.trim()} />
                  {o.direccion && <Field label="Dirección" value={o.direccion} />}
                  {o.telefono && <Field label="Teléfono" value={o.telefono} />}
                  {o.email && <Field label="Email" value={o.email} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Láminas */}
      {p.laminas.length > 0 && (
        <div className={cardCls}>
          <SectionHead icon={FileImage}>Índice de Planos ({p.laminas.length})</SectionHead>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-white/[0.06] border-slate-200">
                  {["Código", "Título", "Disciplina"].map((h) => (
                    <th key={h} className="text-left text-[10px] uppercase tracking-wider font-semibold dark:text-slate-500 text-slate-400 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                {p.laminas.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 pr-4 font-mono text-xs dark:text-rose-400 text-rose-600">{l.codigo}</td>
                    <td className="py-2 pr-4 dark:text-slate-300 text-slate-600">{l.titulo}</td>
                    <td className="py-2 text-xs dark:text-slate-500 text-slate-400">{l.disciplina}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Equipo Técnico ────────────────────────────────────────────────────

function TabEquipo({ proyectoId, initial }: { proyectoId: string; initial: Miembro[] }) {
  const [miembros, setMiembros] = useState<Miembro[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<MiembroData>({ nombre: "", titulo: "", rol: "ARQUITECTO", matricula: "", telefono: "", email: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value } as MiembroData));
  }

  function handleAdd() {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    startTransition(async () => {
      try {
        await agregarMiembro(proyectoId, form);
        setMiembros((m) => [...m, { id: crypto.randomUUID(), apellido: "", nombre: form.nombre.trim(), titulo: form.titulo || null, rol: form.rol, matricula: form.matricula || null, telefono: form.telefono || null, email: form.email || null }]);
        setForm({ nombre: "", titulo: "", rol: "ARQUITECTO", matricula: "", telefono: "", email: "" });
        setShowForm(false);
        toast.success("Miembro agregado");
      } catch {
        toast.error("Error al guardar");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await eliminarMiembro(id, proyectoId);
        setMiembros((m) => m.filter((x) => x.id !== id));
        toast.success("Miembro eliminado");
      } catch {
        toast.error("Error al eliminar");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <SectionHead icon={HardHat}>Equipo Técnico ({miembros.length})</SectionHead>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/10 hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 text-xs font-semibold transition-colors">
            <Plus size={13} /> Agregar
          </button>
        </div>

        {showForm && (
          <div className="p-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.06] border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nombre completo *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Arq. Juan Pérez" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Título / Profesión</label>
                <input name="titulo" value={form.titulo} onChange={handleChange} placeholder="Arquitecto, Ing. Civil…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Rol</label>
                <select name="rol" value={form.rol} onChange={handleChange} className={inputCls}>
                  {Object.entries(ROL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Matrícula profesional</label>
                <input name="matricula" value={form.matricula} onChange={handleChange} placeholder="CAP-XXXX" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="09xx xxx xxx" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input name="email" value={form.email} onChange={handleChange} placeholder="nombre@estudio.com" className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <BtnPrimary onClick={handleAdd} loading={isPending}><Plus size={12} />Guardar</BtnPrimary>
              <BtnGhost onClick={() => setShowForm(false)}>Cancelar</BtnGhost>
            </div>
          </div>
        )}

        {miembros.length === 0 ? (
          <p className="text-sm dark:text-slate-500 text-slate-400 italic py-2">Sin miembros registrados. Hacé clic en Agregar para comenzar.</p>
        ) : (
          <div className="space-y-2">
            {miembros.map((m) => (
              <div key={m.id} className="flex items-start gap-3 p-3.5 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.04] border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium dark:text-slate-200 text-slate-700">{m.nombre}</span>
                    {m.titulo && <span className="text-xs dark:text-slate-500 text-slate-400">· {m.titulo}</span>}
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full dark:bg-teal-500/10 bg-teal-50 dark:text-teal-400 text-teal-700">
                      {ROL_LABELS[m.rol] ?? m.rol}
                    </span>
                  </div>
                  {(m.matricula || m.telefono || m.email) && (
                    <div className="flex items-center gap-3 flex-wrap mt-1">
                      {m.matricula && <span className="text-xs dark:text-slate-500 text-slate-400">Mat: {m.matricula}</span>}
                      {m.telefono && <span className="text-xs dark:text-slate-500 text-slate-400">{m.telefono}</span>}
                      {m.email && <span className="text-xs dark:text-slate-500 text-slate-400">{m.email}</span>}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(m.id)} disabled={isPending}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 dark:text-slate-500 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Reuniones ─────────────────────────────────────────────────────────

function TabReuniones({ proyectoId, initial }: { proyectoId: string; initial: Reunion[] }) {
  const [reuniones, setReuniones] = useState<Reunion[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const emptyForm: ReunionData = { fecha: new Date().toISOString().slice(0, 10), hora: "", lugar: "", temas: "", acta: "", estado: "PROGRAMADA", representantes: "" };
  const [form, setForm] = useState<ReunionData>(emptyForm);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value } as ReunionData));
  }

  function startEdit(r: Reunion) {
    setEditId(r.id);
    setForm({ fecha: fmtDateInput(r.fecha), hora: r.hora ?? "", lugar: r.lugar ?? "", temas: r.temas ?? "", acta: r.acta ?? "", estado: r.estado as ReunionData["estado"], representantes: r.representantes ?? "" });
    setShowForm(true);
  }

  function handleSave() {
    if (!form.fecha) { toast.error("La fecha es requerida"); return; }
    startTransition(async () => {
      try {
        if (editId) {
          await actualizarReunion(editId, proyectoId, form);
          setReuniones((rr) => rr.map((r) => r.id === editId ? { ...r, ...form, fecha: new Date(form.fecha), hora: form.hora || null, lugar: form.lugar || null, temas: form.temas || null, acta: form.acta || null, representantes: form.representantes || null } : r));
          toast.success("Reunión actualizada");
        } else {
          await agregarReunion(proyectoId, form);
          setReuniones((rr) => [...rr, { id: crypto.randomUUID(), fecha: new Date(form.fecha), hora: form.hora || null, lugar: form.lugar || null, temas: form.temas || null, acta: form.acta || null, estado: form.estado, representantes: form.representantes || null }]);
          toast.success("Reunión agregada");
        }
        setForm(emptyForm); setEditId(null); setShowForm(false);
      } catch { toast.error("Error al guardar"); }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await eliminarReunion(id, proyectoId);
        setReuniones((rr) => rr.filter((r) => r.id !== id));
        toast.success("Reunión eliminada");
      } catch { toast.error("Error al eliminar"); }
    });
  }

  const estadoColors: Record<string, string> = {
    PROGRAMADA: "dark:bg-blue-500/15 bg-blue-50 dark:text-blue-300 text-blue-700",
    REALIZADA: "dark:bg-emerald-500/15 bg-emerald-50 dark:text-emerald-300 text-emerald-700",
    CANCELADA: "dark:bg-red-500/15 bg-red-50 dark:text-red-300 text-red-700",
  };

  return (
    <div className="space-y-5">
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <SectionHead icon={CalendarDays}>Reuniones ({reuniones.length})</SectionHead>
          <button onClick={() => { setShowForm((v) => !v); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/10 hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 text-xs font-semibold transition-colors">
            <Plus size={13} /> Nueva
          </button>
        </div>

        {showForm && (
          <div className="p-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.06] border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Fecha *</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hora</label>
                <input type="time" name="hora" value={form.hora} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <select name="estado" value={form.estado} onChange={handleChange} className={inputCls}>
                  {Object.entries(ESTADO_REUNION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Lugar</label>
                <input name="lugar" value={form.lugar} onChange={handleChange} placeholder="Oficina, obra, virtual…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Representantes</label>
                <input name="representantes" value={form.representantes} onChange={handleChange} placeholder="Nombres del equipo" className={inputCls} />
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>Temas / Agenda</label>
                <textarea name="temas" value={form.temas} onChange={handleChange} rows={2} placeholder="Temas a tratar…" className={inputCls} />
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>Acta / Resumen</label>
                <textarea name="acta" value={form.acta} onChange={handleChange} rows={3} placeholder="Resumen de lo acordado…" className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <BtnPrimary onClick={handleSave} loading={isPending}><Plus size={12} />{editId ? "Actualizar" : "Guardar"}</BtnPrimary>
              <BtnGhost onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancelar</BtnGhost>
            </div>
          </div>
        )}

        {reuniones.length === 0 ? (
          <p className="text-sm dark:text-slate-500 text-slate-400 italic py-2">Sin reuniones registradas.</p>
        ) : (
          <div className="space-y-3">
            {[...reuniones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((r) => (
              <div key={r.id} className="p-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.04] border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold dark:text-slate-200 text-slate-700">{fmtDate(r.fecha)}</span>
                    {r.hora && <span className="text-xs dark:text-slate-400 text-slate-500">{r.hora}</span>}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoColors[r.estado]}`}>{ESTADO_REUNION[r.estado]}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:dark:bg-white/[0.06] hover:bg-slate-200 dark:text-slate-500 text-slate-400 hover:text-teal-500 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(r.id)} disabled={isPending} className="p-1.5 rounded-lg hover:bg-red-500/10 dark:text-slate-500 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
                {r.lugar && <p className="text-xs dark:text-slate-400 text-slate-500 mb-1">📍 {r.lugar}</p>}
                {r.representantes && <p className="text-xs dark:text-slate-400 text-slate-500 mb-1">👥 {r.representantes}</p>}
                {r.temas && <p className="text-xs dark:text-slate-400 text-slate-500 mt-2 leading-relaxed border-t dark:border-white/[0.05] border-slate-200 pt-2">{r.temas}</p>}
                {r.acta && <p className="text-xs dark:text-slate-300 text-slate-600 mt-1 leading-relaxed italic">{r.acta}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 4: Bitácora ──────────────────────────────────────────────────────────

function TabBitacora({ proyectoId, initial }: { proyectoId: string; initial: Anotacion[] }) {
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const emptyForm: AnotacionData = { fecha: new Date().toISOString().slice(0, 10), hora: "", categoria: "OTRO", titulo: "", contenido: "", autor: "" };
  const [form, setForm] = useState<AnotacionData>(emptyForm);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value } as AnotacionData));
  }

  function handleAdd() {
    if (!form.titulo.trim() || !form.contenido.trim()) { toast.error("Título y contenido son requeridos"); return; }
    startTransition(async () => {
      try {
        await agregarAnotacion(proyectoId, form);
        setAnotaciones((a) => [{ id: crypto.randomUUID(), fecha: new Date(form.fecha), hora: form.hora || null, categoria: form.categoria, titulo: form.titulo, contenido: form.contenido, autor: form.autor || null }, ...a]);
        setForm(emptyForm); setShowForm(false);
        toast.success("Anotación registrada");
      } catch { toast.error("Error al guardar"); }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await eliminarAnotacion(id, proyectoId);
        setAnotaciones((a) => a.filter((x) => x.id !== id));
        toast.success("Anotación eliminada");
      } catch { toast.error("Error al eliminar"); }
    });
  }

  const catColors: Record<string, string> = {
    REUNION: "dark:bg-blue-500/15 bg-blue-50 dark:text-blue-300 text-blue-700",
    MODIFICACION: "dark:bg-violet-500/15 bg-violet-50 dark:text-violet-300 text-violet-700",
    AJUSTE: "dark:bg-amber-500/15 bg-amber-50 dark:text-amber-300 text-amber-700",
    NOTA_LEGAL: "dark:bg-red-500/15 bg-red-50 dark:text-red-300 text-red-700",
    OTRO: "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-300 text-slate-600",
  };

  return (
    <div className="space-y-5">
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <SectionHead icon={BookOpen}>Bitácora ({anotaciones.length})</SectionHead>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/10 hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 text-xs font-semibold transition-colors">
            <Plus size={13} /> Nueva
          </button>
        </div>

        {showForm && (
          <div className="p-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.06] border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Fecha</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hora</label>
                <input type="time" name="hora" value={form.hora} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Categoría</label>
                <select name="categoria" value={form.categoria} onChange={handleChange} className={inputCls}>
                  {Object.entries(CATEGORIA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Título *</label>
                <input name="titulo" value={form.titulo} onChange={handleChange} placeholder="Resumen breve…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Autor</label>
                <input name="autor" value={form.autor} onChange={handleChange} placeholder="Nombre del autor" className={inputCls} />
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>Contenido *</label>
                <textarea name="contenido" value={form.contenido} onChange={handleChange} rows={3} placeholder="Descripción detallada…" className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <BtnPrimary onClick={handleAdd} loading={isPending}><Plus size={12} />Guardar</BtnPrimary>
              <BtnGhost onClick={() => setShowForm(false)}>Cancelar</BtnGhost>
            </div>
          </div>
        )}

        {anotaciones.length === 0 ? (
          <p className="text-sm dark:text-slate-500 text-slate-400 italic py-2">Sin anotaciones. Hacé clic en Nueva para comenzar.</p>
        ) : (
          <div className="space-y-3">
            {anotaciones.map((a) => (
              <div key={a.id} className="p-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.04] border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${catColors[a.categoria]}`}>{CATEGORIA_LABELS[a.categoria]}</span>
                    <span className="text-sm font-semibold dark:text-slate-200 text-slate-700">{a.titulo}</span>
                  </div>
                  <button onClick={() => handleDelete(a.id)} disabled={isPending} className="p-1.5 rounded-lg hover:bg-red-500/10 dark:text-slate-500 text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={12} /></button>
                </div>
                <p className="text-xs dark:text-slate-400 text-slate-500 mb-2">
                  {fmtDate(a.fecha)}{a.hora ? ` · ${a.hora}` : ""}{a.autor ? ` · ${a.autor}` : ""}
                </p>
                <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed">{a.contenido}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 5: Aprobaciones ──────────────────────────────────────────────────────

function FGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelCls}>{label}</label>{children}</div>;
}

function TabAprobaciones({ proyectoId, initial }: { proyectoId: string; initial: Aprobacion | null }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<AprobacionData>({
    fechaInicioContractual: fmtDateInput(initial?.fechaInicioContractual),
    fechaFinContractual:    fmtDateInput(initial?.fechaFinContractual),
    plazoEnDias:            initial?.plazoEnDias ?? undefined,
    montoContratoGs:        initial?.montoContratoGs ?? undefined,
    fechaAprobacionPlanos:  fmtDateInput(initial?.fechaAprobacionPlanos),
    firmanteAprobacionPlanos: initial?.firmanteAprobacionPlanos ?? "",
    obsAprobacionPlanos:    initial?.obsAprobacionPlanos ?? "",
    fechaAprobacionPres:    fmtDateInput(initial?.fechaAprobacionPres),
    firmanteAprobacionPres: initial?.firmanteAprobacionPres ?? "",
    obsAprobacionPres:      initial?.obsAprobacionPres ?? "",
    aprobadoPor:            initial?.aprobadoPor ?? "",
    revisorNombre:          initial?.revisorNombre ?? "",
    revisorProfesion:       initial?.revisorProfesion ?? "",
    fechaRevision:          fmtDateInput(initial?.fechaRevision),
    obsRevision:            initial?.obsRevision ?? "",
    respPresupuesto:        initial?.respPresupuesto ?? "",
    respPresupuestoProfesion: initial?.respPresupuestoProfesion ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "number" ? (value === "" ? undefined : Number(value)) : value } as AprobacionData));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await guardarAprobacion(proyectoId, form);
        toast.success("Aprobaciones guardadas");
      } catch { toast.error("Error al guardar"); }
    });
  }

  return (
    <div className="space-y-5">
      {/* Datos Contractuales */}
      <div className={cardCls}>
        <SectionHead icon={ClipboardList}>Datos Contractuales</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FGroup label="Fecha inicio contractual">
            <input type="date" name="fechaInicioContractual" value={form.fechaInicioContractual as string ?? ""} onChange={handleChange} className={inputCls} />
          </FGroup>
          <FGroup label="Fecha fin contractual">
            <input type="date" name="fechaFinContractual" value={form.fechaFinContractual as string ?? ""} onChange={handleChange} className={inputCls} />
          </FGroup>
          <FGroup label="Plazo (días)">
            <input type="number" name="plazoEnDias" value={form.plazoEnDias ?? ""} onChange={handleChange} placeholder="0" className={inputCls} />
          </FGroup>
          <FGroup label="Monto del contrato (Gs)">
            <input type="number" name="montoContratoGs" value={form.montoContratoGs ?? ""} onChange={handleChange} placeholder="0" className={inputCls} />
          </FGroup>
        </div>
      </div>

      {/* Aprobación de Planos */}
      <div className={cardCls}>
        <SectionHead icon={CheckSquare}>Aprobación de Planos</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FGroup label="Fecha de aprobación">
            <input type="date" name="fechaAprobacionPlanos" value={form.fechaAprobacionPlanos as string ?? ""} onChange={handleChange} className={inputCls} />
          </FGroup>
          <FGroup label="Firmante">
            <input name="firmanteAprobacionPlanos" value={form.firmanteAprobacionPlanos ?? ""} onChange={handleChange} placeholder="Ing. / Arq. nombre" className={inputCls} />
          </FGroup>
          <div className="sm:col-span-2">
            <FGroup label="Observaciones">
              <textarea name="obsAprobacionPlanos" value={form.obsAprobacionPlanos ?? ""} onChange={handleChange} rows={2} placeholder="Observaciones sobre la aprobación…" className={inputCls} />
            </FGroup>
          </div>
        </div>
      </div>

      {/* Aprobación de Presupuesto */}
      <div className={cardCls}>
        <SectionHead icon={CheckSquare}>Aprobación de Presupuesto</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FGroup label="Fecha de aprobación">
            <input type="date" name="fechaAprobacionPres" value={form.fechaAprobacionPres as string ?? ""} onChange={handleChange} className={inputCls} />
          </FGroup>
          <FGroup label="Firmante">
            <input name="firmanteAprobacionPres" value={form.firmanteAprobacionPres ?? ""} onChange={handleChange} placeholder="Nombre del aprobador" className={inputCls} />
          </FGroup>
          <div className="sm:col-span-2">
            <FGroup label="Observaciones">
              <textarea name="obsAprobacionPres" value={form.obsAprobacionPres ?? ""} onChange={handleChange} rows={2} placeholder="Observaciones…" className={inputCls} />
            </FGroup>
          </div>
        </div>
      </div>

      {/* Revisión / Fiscalización */}
      <div className={cardCls}>
        <SectionHead icon={User}>Revisión / Fiscalización</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FGroup label="Revisor / Fiscalizador">
            <input name="revisorNombre" value={form.revisorNombre ?? ""} onChange={handleChange} placeholder="Nombre completo" className={inputCls} />
          </FGroup>
          <FGroup label="Profesión">
            <input name="revisorProfesion" value={form.revisorProfesion ?? ""} onChange={handleChange} placeholder="Arq., Ing…" className={inputCls} />
          </FGroup>
          <FGroup label="Fecha de revisión">
            <input type="date" name="fechaRevision" value={form.fechaRevision as string ?? ""} onChange={handleChange} className={inputCls} />
          </FGroup>
          <div className="sm:col-span-2">
            <FGroup label="Observaciones de revisión">
              <textarea name="obsRevision" value={form.obsRevision ?? ""} onChange={handleChange} rows={2} placeholder="Observaciones…" className={inputCls} />
            </FGroup>
          </div>
        </div>
      </div>

      {/* Responsables */}
      <div className={cardCls}>
        <SectionHead icon={HardHat}>Aprobado Por / Responsable de Presupuesto</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FGroup label="Aprobado por">
            <input name="aprobadoPor" value={form.aprobadoPor ?? ""} onChange={handleChange} placeholder="Nombre del aprobador final" className={inputCls} />
          </FGroup>
          <div />
          <FGroup label="Responsable del presupuesto">
            <input name="respPresupuesto" value={form.respPresupuesto ?? ""} onChange={handleChange} placeholder="Nombre" className={inputCls} />
          </FGroup>
          <FGroup label="Profesión">
            <input name="respPresupuestoProfesion" value={form.respPresupuestoProfesion ?? ""} onChange={handleChange} placeholder="Arq., Ing…" className={inputCls} />
          </FGroup>
        </div>
      </div>

      <div className="flex justify-end">
        <BtnPrimary onClick={handleSave} loading={isPending}>
          {isPending ? null : <CheckSquare size={13} />}
          Guardar Aprobaciones
        </BtnPrimary>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FichaClient({ proyecto }: { proyecto: ProyectoFicha }) {
  const [activeTab, setActiveTab] = useState<TabId>("datos");

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      {/* Toolbar */}
      <div className="sticky top-[52px] z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/90 bg-white/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/proyectos"
              className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150">
              <ArrowLeft size={13} /> Mis Proyectos
            </Link>
            <div className="w-px h-3.5 dark:bg-white/10 bg-slate-200" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">Ficha Técnica</p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">{proyecto.codigo} · Módulo 1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/proyectos/${proyecto.id}/editar`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border dark:border-white/[0.1] border-slate-200 dark:text-slate-300 text-slate-600 dark:hover:bg-white/[0.05] hover:bg-slate-100 text-xs font-semibold transition-colors duration-150">
              <Pencil size={13} /> Editar
            </Link>
            <Link href={`/proyectos/${proyecto.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors duration-150 shadow-md shadow-teal-500/20">
              <LayoutGrid size={13} /> Centro de Mando
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex items-center gap-0.5 pb-0 pt-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
                    active
                      ? "border-teal-500 dark:text-teal-400 text-teal-600"
                      : "border-transparent dark:text-slate-500 text-slate-500 dark:hover:text-slate-300 hover:text-slate-700"
                  }`}>
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "datos"        && <TabDatosGenerales p={proyecto} />}
        {activeTab === "equipo"       && <TabEquipo proyectoId={proyecto.id} initial={proyecto.equipoTecnico} />}
        {activeTab === "reuniones"    && <TabReuniones proyectoId={proyecto.id} initial={proyecto.reuniones} />}
        {activeTab === "bitacora"     && <TabBitacora proyectoId={proyecto.id} initial={proyecto.anotaciones} />}
        {activeTab === "aprobaciones" && <TabAprobaciones proyectoId={proyecto.id} initial={proyecto.aprobacion} />}
      </main>
    </div>
  );
}
