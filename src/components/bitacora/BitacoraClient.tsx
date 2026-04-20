"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BookOpen, Plus, Trash2, ChevronDown, ChevronUp,
  Sun, Cloud, CloudRain, Wind,
  Users, Wrench, AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert,
  ExternalLink, Clock, User, BarChart3, Download, Printer, FileText,
} from "lucide-react";
import {
  crearEntrada, eliminarEntrada,
  type EntradaData, type RubroData, type PersonalData,
} from "@/app/proyectos/[id]/bitacora/actions";
import { getEmpresaConfig, openBrandedPrintWindow } from "@/lib/reportHeader";

// ─── Tipos locales ────────────────────────────────────────────
type EntradaCompleta = {
  id: string; proyectoId: string; fecha: Date;
  horaInicio: string | null; horaFin: string | null; turno: string | null;
  clima: string | null; temperatura: number | null;
  descripcionGeneral: string;
  aspectosPositivos: string | null; aspectosNegativos: string | null;
  oportunidades: string | null; amenazas: string | null;
  observaciones: string | null; enlaceFotos: string | null;
  responsableFirma: string | null;
  createdAt: Date; updatedAt: Date;
  rubrosDelDia: { id: string; descripcion: string; cantidad: number | null; unidad: string | null; avancePct: number | null; observacion: string | null }[];
  personalDelDia: { id: string; nombre: string; categoria: string | null; horasTrabajadas: number | null; observacion: string | null }[];
};

type AlertaStock = {
  materialId: string; materialNombre: string; materialCodigo: string;
  unidad: string; stockActual: number; tasaDiaria: number | null;
  diasRestantes: number | null; nivel: string;
};

interface Props {
  proyectoId: string;
  proyectoNombre: string;
  entradas: EntradaCompleta[];
  alertasStock: AlertaStock[];
}

// ─── Helpers ──────────────────────────────────────────────────
const inputCls = "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40";
const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";
const textareaCls = `${inputCls} resize-none min-h-[72px]`;

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PY", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function fmtFechaCort(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const CLIMAS = ["Soleado", "Parcialmente nublado", "Nublado", "Lluvioso", "Tormenta", "Ventoso", "Frío"];
const TURNOS = ["Completo (07:00–17:00)", "Mañana (07:00–12:00)", "Tarde (13:00–17:00)", "Nocturno"];
const CATEGORIAS_PERSONAL = ["Director de Obra", "Fiscalizador", "Capataz", "Albañil", "Oficial", "Peón", "Electricista", "Plomero", "Carpintero", "Pintor", "Otro"];

const climaIcon = (c: string | null) => {
  if (!c) return <Cloud className="w-4 h-4" />;
  if (c.includes("Sol")) return <Sun className="w-4 h-4 text-yellow-400" />;
  if (c.includes("Lluv") || c.includes("Torm")) return <CloudRain className="w-4 h-4 text-blue-400" />;
  if (c.includes("Vient")) return <Wind className="w-4 h-4 text-cyan-400" />;
  return <Cloud className="w-4 h-4 text-gray-400" />;
};

// ─── Sección FODA ─────────────────────────────────────────────
function FodaField({ label, icon: Icon, color, value, onChange, placeholder }: {
  label: string; icon: React.ElementType; color: string;
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${color}`}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className={textareaCls} />
    </div>
  );
}

// ─── Formulario nueva entrada ─────────────────────────────────
function FormNuevaEntrada({ proyectoId }: {
  proyectoId: string;
  onCreada?: (e: EntradaCompleta) => void;
}) {
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);

  // Campos base
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState("07:00");
  const [horaFin, setHoraFin] = useState("17:00");
  const [turno, setTurno] = useState("Completo (07:00–17:00)");
  const [clima, setClima] = useState("Soleado");
  const [temperatura, setTemperatura] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [enlaceFotos, setEnlaceFotos] = useState("");

  // FODA
  const [positivos, setPositivos] = useState("");
  const [negativos, setNegativos] = useState("");
  const [oportunidades, setOportunidades] = useState("");
  const [amenazas, setAmenazas] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Rubros
  const [rubros, setRubros] = useState<RubroData[]>([{ descripcion: "", cantidad: undefined, unidad: "m²", avancePct: undefined }]);
  // Personal
  const [personal, setPersonal] = useState<PersonalData[]>([{ nombre: "", categoria: "Peón", horasTrabajadas: 8 }]);

  function addRubro() { setRubros((p) => [...p, { descripcion: "", cantidad: undefined, unidad: "m²", avancePct: undefined }]); }
  function removeRubro(i: number) { setRubros((p) => p.filter((_, idx) => idx !== i)); }
  function updateRubro(i: number, key: keyof RubroData, val: string | number) {
    setRubros((p) => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  }

  function addPersonal() { setPersonal((p) => [...p, { nombre: "", categoria: "Peón", horasTrabajadas: 8 }]); }
  function removePersonal(i: number) { setPersonal((p) => p.filter((_, idx) => idx !== i)); }
  function updatePersonal(i: number, key: keyof PersonalData, val: string | number) {
    setPersonal((p) => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) { toast.error("La descripción general es obligatoria"); return; }
    const data: EntradaData = {
      fecha, horaInicio, horaFin, turno, clima,
      temperatura: temperatura ? parseFloat(temperatura) : undefined,
      descripcionGeneral: descripcion,
      aspectosPositivos: positivos || undefined,
      aspectosNegativos: negativos || undefined,
      oportunidades: oportunidades || undefined,
      amenazas: amenazas || undefined,
      observaciones: observaciones || undefined,
      enlaceFotos: enlaceFotos || undefined,
      responsableFirma: responsable || undefined,
      rubros: rubros.filter((r) => r.descripcion?.trim()),
      personal: personal.filter((p) => p.nombre?.trim()),
    };
    start(async () => {
      const res = await crearEntrada(proyectoId, data);
      if (res.ok) {
        toast.success("Entrada de bitácora registrada");
        setAbierto(false);
        setDescripcion(""); setPositivos(""); setNegativos("");
        setOportunidades(""); setAmenazas(""); setObservaciones("");
        setEnlaceFotos(""); setResponsable("");
        setRubros([{ descripcion: "", cantidad: undefined, unidad: "m²", avancePct: undefined }]);
        setPersonal([{ nombre: "", categoria: "Peón", horasTrabajadas: 8 }]);
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)}
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-600/20">
        <Plus className="w-4 h-4" /> Nueva Entrada de Bitácora
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-cyan-500/30 bg-white dark:bg-gray-900 shadow-xl p-6 space-y-6">
      {/* Encabezado del formulario */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">Nueva Entrada de Bitácora</h3>
        </div>
        <button type="button" onClick={() => setAbierto(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
      </div>

      {/* ── Sección 1: Datos de la jornada ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-500">1 · Datos de la Jornada</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Fecha *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Hora inicio</label>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hora fin</label>
            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Turno</label>
            <select value={turno} onChange={(e) => setTurno(e.target.value)} className={inputCls}>
              {TURNOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Clima</label>
            <select value={clima} onChange={(e) => setClima(e.target.value)} className={inputCls}>
              {CLIMAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Temperatura (°C)</label>
            <input type="number" step="0.5" value={temperatura} onChange={(e) => setTemperatura(e.target.value)}
              placeholder="Ej: 28" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Responsable / Fiscalizador</label>
            <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)}
              placeholder="Nombre completo" className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Sección 2: Descripción general ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-500">2 · Descripción General *</h4>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required
          placeholder="Resumen de las actividades ejecutadas durante la jornada. Incluir sector de trabajo, actividades principales y estado general del avance..."
          className={`${textareaCls} min-h-[100px]`} />
      </div>

      {/* ── Sección 3: Rubros trabajados ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-500">3 · Rubros Trabajados</h4>
          <button type="button" onClick={addRubro}
            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 font-medium">
            <Plus className="w-3.5 h-3.5" /> Agregar rubro
          </button>
        </div>
        <div className="space-y-2">
          {rubros.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
              <div className="col-span-12 sm:col-span-5">
                <label className={labelCls}>Descripción</label>
                <input type="text" value={r.descripcion}
                  onChange={(e) => updateRubro(i, "descripcion", e.target.value)}
                  placeholder="Ej: Colocación de ladrillo visto fachada norte"
                  className={inputCls} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className={labelCls}>Cantidad</label>
                <input type="number" step="0.01" value={r.cantidad ?? ""}
                  onChange={(e) => updateRubro(i, "cantidad", parseFloat(e.target.value))}
                  placeholder="0.00" className={inputCls} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className={labelCls}>Unidad</label>
                <input type="text" value={r.unidad ?? ""}
                  onChange={(e) => updateRubro(i, "unidad", e.target.value)}
                  placeholder="m², m³, u" className={inputCls} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <label className={labelCls}>Avance %</label>
                <input type="number" min="0" max="100" value={r.avancePct ?? ""}
                  onChange={(e) => updateRubro(i, "avancePct", parseFloat(e.target.value))}
                  placeholder="0" className={inputCls} />
              </div>
              <div className="col-span-1 flex items-end pb-0.5">
                <button type="button" onClick={() => removeRubro(i)}
                  className="w-8 h-9 flex items-center justify-center text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sección 4: Personal ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-500">4 · Personal Presente</h4>
          <button type="button" onClick={addPersonal}
            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 font-medium">
            <Plus className="w-3.5 h-3.5" /> Agregar persona
          </button>
        </div>
        <div className="space-y-2">
          {personal.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
              <div className="col-span-12 sm:col-span-5">
                <label className={labelCls}>Nombre</label>
                <input type="text" value={p.nombre}
                  onChange={(e) => updatePersonal(i, "nombre", e.target.value)}
                  placeholder="Nombre del operario" className={inputCls} />
              </div>
              <div className="col-span-7 sm:col-span-4">
                <label className={labelCls}>Categoría</label>
                <select value={p.categoria ?? "Peón"}
                  onChange={(e) => updatePersonal(i, "categoria", e.target.value)} className={inputCls}>
                  {CATEGORIAS_PERSONAL.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className={labelCls}>Horas</label>
                <input type="number" step="0.5" min="0" max="24" value={p.horasTrabajadas ?? ""}
                  onChange={(e) => updatePersonal(i, "horasTrabajadas", parseFloat(e.target.value))}
                  placeholder="8" className={inputCls} />
              </div>
              <div className="col-span-1 flex items-end pb-0.5">
                <button type="button" onClick={() => removePersonal(i)}
                  className="w-8 h-9 flex items-center justify-center text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sección 5: FODA ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-500">5 · Análisis FODA de la Jornada</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FodaField label="Aspectos Positivos / Fortalezas" icon={CheckCircle2} color="text-emerald-500"
            value={positivos} onChange={setPositivos}
            placeholder="Logros del día, buen ritmo de trabajo, materiales disponibles a tiempo..." />
          <FodaField label="Aspectos Negativos / Debilidades" icon={AlertTriangle} color="text-red-500"
            value={negativos} onChange={setNegativos}
            placeholder="Retrasos, incidentes, falta de material, problemas con personal..." />
          <FodaField label="Oportunidades" icon={Lightbulb} color="text-yellow-500"
            value={oportunidades} onChange={setOportunidades}
            placeholder="Condiciones favorables identificadas, propuestas de mejora, adelantos posibles..." />
          <FodaField label="Amenazas / Riesgos" icon={ShieldAlert} color="text-orange-500"
            value={amenazas} onChange={setAmenazas}
            placeholder="Riesgos externos, clima adverso previsto, escasez de insumos, conflictos laborales..." />
        </div>
      </div>

      {/* ── Sección 6: Observaciones + fotos ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-500">6 · Observaciones y Fotos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Observaciones / Instrucciones para mañana</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Pendientes, instrucciones para el día siguiente, recordatorios..."
              className={textareaCls} />
          </div>
          <div>
            <label className={labelCls}>Enlace a fotos (Drive, Dropbox, etc.)</label>
            <input type="url" value={enlaceFotos} onChange={(e) => setEnlaceFotos(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Las fotos se almacenan en tu nube. Pegá el enlace a la carpeta del día.</p>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button type="submit" disabled={pending || !descripcion.trim()}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            descripcion.trim() && !pending
              ? "bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}>
          <BookOpen className="w-4 h-4" />
          {pending ? "Guardando acta…" : "Guardar Entrada"}
        </button>
        <button type="button" onClick={() => setAbierto(false)}
          className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Tarjeta de entrada en el historial ──────────────────────
function EntradaCard({ entrada, proyectoId }: { entrada: EntradaCompleta; proyectoId: string }) {
  const [expandida, setExpandida] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();

  function handleEliminar() {
    start(async () => {
      const res = await eliminarEntrada(proyectoId, entrada.id);
      if (res.ok) {
        toast.success("Entrada eliminada");
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    });
  }

  const totalPersonal = entrada.personalDelDia.length;
  const totalHoras = entrada.personalDelDia.reduce((s, p) => s + (p.horasTrabajadas ?? 0), 0);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Cabecera del acta */}
      <div className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        onClick={() => setExpandida(!expandida)}>
        {/* Indicador de clima */}
        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 flex items-center justify-center">
          {climaIcon(entrada.clima)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-sm text-gray-900 dark:text-white capitalize">
              {fmtFecha(entrada.fecha)}
            </span>
            {entrada.turno && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">
                {entrada.turno.split(" ")[0]}
              </span>
            )}
            {entrada.clima && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {entrada.clima} {entrada.temperatura ? `· ${entrada.temperatura}°C` : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{entrada.descripcionGeneral}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            {entrada.horaInicio && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entrada.horaInicio}–{entrada.horaFin}</span>}
            {totalPersonal > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{totalPersonal} personas · {totalHoras}h</span>}
            {entrada.rubrosDelDia.length > 0 && <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{entrada.rubrosDelDia.length} rubros</span>}
            {entrada.responsableFirma && <span className="flex items-center gap-1"><User className="w-3 h-3" />{entrada.responsableFirma}</span>}
          </div>
        </div>
        <button className="shrink-0 text-gray-400">
          {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Detalle expandido */}
      {expandida && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4">
          {/* Rubros */}
          {entrada.rubrosDelDia.length > 0 && (
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Rubros Trabajados</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-1.5 font-medium">Descripción</th>
                      <th className="pb-1.5 font-medium text-right">Cantidad</th>
                      <th className="pb-1.5 font-medium text-right">Avance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {entrada.rubrosDelDia.map((r) => (
                      <tr key={r.id} className="text-gray-700 dark:text-gray-300">
                        <td className="py-1.5">{r.descripcion}</td>
                        <td className="py-1.5 text-right">{r.cantidad != null ? `${r.cantidad} ${r.unidad ?? ""}` : "—"}</td>
                        <td className="py-1.5 text-right">
                          {r.avancePct != null ? (
                            <span className={`font-medium ${r.avancePct >= 100 ? "text-emerald-500" : r.avancePct >= 50 ? "text-yellow-500" : "text-gray-400"}`}>
                              {r.avancePct}%
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Personal */}
          {entrada.personalDelDia.length > 0 && (
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Personal Presente</h5>
              <div className="flex flex-wrap gap-2">
                {entrada.personalDelDia.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{p.nombre}</span>
                    {p.categoria && <span className="text-gray-400">— {p.categoria}</span>}
                    {p.horasTrabajadas != null && <span className="text-cyan-500 font-medium ml-1">{p.horasTrabajadas}h</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FODA */}
          {(entrada.aspectosPositivos || entrada.aspectosNegativos || entrada.oportunidades || entrada.amenazas) && (
            <div>
              <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Análisis FODA</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entrada.aspectosPositivos && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Positivos</p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap">{entrada.aspectosPositivos}</p>
                  </div>
                )}
                {entrada.aspectosNegativos && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Negativos</p>
                    <p className="text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap">{entrada.aspectosNegativos}</p>
                  </div>
                )}
                {entrada.oportunidades && (
                  <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Oportunidades</p>
                    <p className="text-xs text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">{entrada.oportunidades}</p>
                  </div>
                )}
                {entrada.amenazas && (
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                    <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Amenazas</p>
                    <p className="text-xs text-orange-800 dark:text-orange-300 whitespace-pre-wrap">{entrada.amenazas}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones + enlace */}
          {(entrada.observaciones || entrada.enlaceFotos) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {entrada.observaciones && (
                <div className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Observaciones</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entrada.observaciones}</p>
                </div>
              )}
              {entrada.enlaceFotos && (
                <a href={entrada.enlaceFotos} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver fotos del día
                </a>
              )}
            </div>
          )}

          {/* Eliminar */}
          <div className="flex justify-end pt-1 border-t border-gray-100 dark:border-gray-800">
            {confirmDel ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">¿Eliminar esta entrada definitivamente?</span>
                <button onClick={handleEliminar} disabled={pending}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {pending ? "…" : "Sí, eliminar"}
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar entrada
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel de alertas de stock ────────────────────────────────
function PanelAlertas({ alertas }: { alertas: AlertaStock[] }) {
  const criticas = alertas.filter((a) => a.nivel === "critico");
  const bajas = alertas.filter((a) => a.nivel === "bajo");
  const ok = alertas.filter((a) => a.nivel === "ok");

  if (alertas.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-400">
        No hay materiales en bodega con consumo registrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {criticas.length > 0 && (
        <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Stock Crítico (≤ 3 días)
          </p>
          <div className="space-y-1.5">
            {criticas.map((a) => <AlertaRow key={a.materialId} a={a} />)}
          </div>
        </div>
      )}
      {bajas.length > 0 && (
        <div className="rounded-2xl border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Stock Bajo (4–7 días)
          </p>
          <div className="space-y-1.5">
            {bajas.map((a) => <AlertaRow key={a.materialId} a={a} />)}
          </div>
        </div>
      )}
      {ok.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Stock Normal (&gt; 7 días)
          </p>
          <div className="space-y-1.5">
            {ok.map((a) => <AlertaRow key={a.materialId} a={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertaRow({ a }: { a: AlertaStock }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="font-mono text-gray-400 w-16 shrink-0">{a.materialCodigo}</span>
      <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">{a.materialNombre}</span>
      <span className="text-gray-500">{a.stockActual.toFixed(1)} {a.unidad}</span>
      {a.diasRestantes !== null ? (
        <span className={`font-bold w-20 text-right ${
          a.nivel === "critico" ? "text-red-600 dark:text-red-400" :
          a.nivel === "bajo" ? "text-orange-600 dark:text-orange-400" :
          "text-emerald-600 dark:text-emerald-400"
        }`}>
          ~{a.diasRestantes} días
        </span>
      ) : (
        <span className="text-gray-400 w-20 text-right">sin historial</span>
      )}
    </div>
  );
}

// ─── Imprimir / PDF Bitácora ──────────────────────────────────
function imprimirBitacora(entradas: EntradaCompleta[], proyectoNombre: string, proyectoId: string) {
  const empresa = getEmpresaConfig(proyectoId);
  let body = `<h2>Bitácora de Obra</h2>`;
  for (const e of entradas) {
    const totalPersonal = e.personalDelDia.length;
    const totalHoras = e.personalDelDia.reduce((s, p) => s + (p.horasTrabajadas ?? 0), 0);
    body +=
      `<h3 style="margin-top:16pt;border-bottom:1px solid #e5e7eb;padding-bottom:4pt">${fmtFecha(e.fecha)}</h3>` +
      `<table><tbody>` +
      (e.turno ? `<tr><th style="width:22%;text-align:left">Turno</th><td>${e.turno}</td></tr>` : "") +
      (e.clima ? `<tr><th style="width:22%;text-align:left">Clima</th><td>${e.clima}${e.temperatura ? ` – ${e.temperatura}°C` : ""}</td></tr>` : "") +
      (e.responsableFirma ? `<tr><th style="width:22%;text-align:left">Responsable</th><td>${e.responsableFirma}</td></tr>` : "") +
      `<tr><th style="width:22%;text-align:left;vertical-align:top">Descripción</th><td>${e.descripcionGeneral}</td></tr>`;
    if (e.rubrosDelDia.length > 0) {
      const rubros = e.rubrosDelDia.map((r) =>
        `${r.descripcion}${r.cantidad ? ` (${r.cantidad}${r.unidad ?? ""})` : ""}${r.avancePct ? ` – ${r.avancePct}%` : ""}`
      ).join("; ");
      body += `<tr><th style="width:22%;text-align:left;vertical-align:top">Rubros del día</th><td>${rubros}</td></tr>`;
    }
    if (totalPersonal > 0) {
      const personal = e.personalDelDia.map((p) =>
        `${p.nombre}${p.categoria ? ` (${p.categoria})` : ""}${p.horasTrabajadas ? ` – ${p.horasTrabajadas}h` : ""}`
      ).join("; ");
      body += `<tr><th style="width:22%;text-align:left;vertical-align:top">Personal (${totalPersonal})</th><td>${personal}<br><span style="font-size:8pt;color:#6b7280">${totalHoras} horas totales de cuadrilla</span></td></tr>`;
    }
    if (e.aspectosPositivos) body += `<tr><th style="width:22%;text-align:left;vertical-align:top">Positivos</th><td style="color:#065f46">${e.aspectosPositivos}</td></tr>`;
    if (e.aspectosNegativos) body += `<tr><th style="width:22%;text-align:left;vertical-align:top">Negativos</th><td style="color:#991b1b">${e.aspectosNegativos}</td></tr>`;
    if (e.oportunidades) body += `<tr><th style="width:22%;text-align:left;vertical-align:top">Oportunidades</th><td style="color:#1e40af">${e.oportunidades}</td></tr>`;
    if (e.amenazas) body += `<tr><th style="width:22%;text-align:left;vertical-align:top">Amenazas</th><td style="color:#92400e">${e.amenazas}</td></tr>`;
    if (e.observaciones) body += `<tr><th style="width:22%;text-align:left;vertical-align:top">Observaciones</th><td>${e.observaciones}</td></tr>`;
    if (e.enlaceFotos) body += `<tr><th style="width:22%;text-align:left">Fotos</th><td><a href="${e.enlaceFotos}">${e.enlaceFotos}</a></td></tr>`;
    body += `</tbody></table>`;
  }
  openBrandedPrintWindow(
    `Bitácora – ${proyectoNombre}`,
    `Bitácora de Obra`,
    `Proyecto: ${proyectoNombre} · ${entradas.length} entrada${entradas.length !== 1 ? "s" : ""}`,
    body,
    empresa,
  );
}

// ─── Exportar CSV ─────────────────────────────────────────────
function exportarCSV(entradas: EntradaCompleta[], proyectoNombre: string) {
  const filas: string[] = [
    "Fecha,Turno,Clima,Temp°C,Responsable,Descripción General,Personal,Horas Cuadrilla,Rubros,Positivos,Negativos,Oportunidades,Amenazas,Enlace Fotos"
  ];
  for (const e of entradas) {
    const pax = e.personalDelDia.map((p) => p.nombre).join(" / ");
    const horas = e.personalDelDia.reduce((s, p) => s + (p.horasTrabajadas ?? 0), 0);
    const rubros = e.rubrosDelDia.map((r) => `${r.descripcion}${r.cantidad ? ` (${r.cantidad}${r.unidad ?? ""})` : ""}`).join(" | ");
    const esc = (s: string | null) => `"${(s ?? "").replace(/"/g, '""')}"`;
    filas.push([
      fmtFechaCort(e.fecha), e.turno ?? "", e.clima ?? "", e.temperatura ?? "",
      e.responsableFirma ?? "", esc(e.descripcionGeneral),
      esc(pax), horas, esc(rubros),
      esc(e.aspectosPositivos), esc(e.aspectosNegativos),
      esc(e.oportunidades), esc(e.amenazas), e.enlaceFotos ?? ""
    ].join(","));
  }
  const blob = new Blob(["\uFEFF" + filas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bitacora-${proyectoNombre.replace(/\s+/g, "_")}.csv`;
  a.click();
}

// ─── Componente Principal ─────────────────────────────────────
export function BitacoraClient({ proyectoId, proyectoNombre, entradas: initialEntradas, alertasStock }: Props) {
  const [entradas] = useState(initialEntradas);
  const [tab, setTab] = useState<"historial" | "nueva" | "stock">("historial");

  const TABS = [
    { id: "historial" as const, label: "Historial", icon: BookOpen },
    { id: "nueva" as const, label: "Nueva Entrada", icon: Plus },
    { id: "stock" as const, label: "Alertas de Stock", icon: AlertTriangle, badge: alertasStock.filter((a) => a.nivel !== "ok" && a.nivel !== "sin-datos").length || undefined },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge ? (
                <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab: Nueva Entrada */}
      {tab === "nueva" && (
        <FormNuevaEntrada proyectoId={proyectoId} onCreada={() => window.location.reload()} />
      )}

      {/* Tab: Historial */}
      {tab === "historial" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entradas.length === 0 ? "No hay entradas registradas." : `${entradas.length} entrada${entradas.length !== 1 ? "s" : ""} de bitácora`}
            </p>
            {entradas.length > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={() => exportarCSV(entradas, proyectoNombre)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => imprimirBitacora(entradas, proyectoNombre, proyectoId)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => imprimirBitacora(entradas, proyectoNombre, proyectoId)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
              </div>
            )}
          </div>
          {entradas.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>El libro de obra está vacío.</p>
              <button onClick={() => setTab("nueva")}
                className="mt-3 text-cyan-500 hover:text-cyan-400 font-medium">
                Crear la primera entrada →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {entradas.map((e) => <EntradaCard key={e.id} entrada={e} proyectoId={proyectoId} />)}
            </div>
          )}
        </div>
      )}

      {/* Tab: Stock */}
      {tab === "stock" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
            <BarChart3 className="w-4 h-4 text-cyan-500 shrink-0" />
            <p className="text-xs text-cyan-700 dark:text-cyan-300">
              Los días restantes se calculan en base al ritmo de consumo de los últimos 14 días registrados en el módulo de Inventario.
            </p>
          </div>
          <PanelAlertas alertas={alertasStock} />
        </div>
      )}
    </div>
  );
}
