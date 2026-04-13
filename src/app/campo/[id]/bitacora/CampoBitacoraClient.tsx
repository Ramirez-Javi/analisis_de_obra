"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Plus, ChevronDown, ChevronUp, Sun, Cloud, CloudRain,
  Wind, Users, Loader2, Check, LogOut, Camera,
  Wrench, User, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { crearEntradaCampo, type EntradaCampoData } from "./actions";

// ─── Tipos ────────────────────────────────────────────────────

type EntradaResumen = {
  id: string;
  fecha: Date;
  turno: string | null;
  clima: string | null;
  descripcionGeneral: string;
  enlaceFotos: string | null;
  responsableFirma: string | null;
  rubrosDelDia: { descripcion: string; avancePct: number | null }[];
  personalDelDia: { nombre: string; categoria: string | null }[];
};

interface Props {
  proyectoId: string;
  proyectoNombre: string;
  proyectoCodigo: string;
  nombreFiscal: string;
  entradas: EntradaResumen[];
}

// ─── Estilos base ─────────────────────────────────────────────
const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 placeholder:text-slate-600";
const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider";

const CLIMAS = ["Soleado", "Parcialmente nublado", "Nublado", "Lluvioso", "Tormenta", "Ventoso", "Frío"];
const TURNOS = ["Completo (07:00–17:00)", "Mañana (07:00–12:00)", "Tarde (13:00–17:00)", "Nocturno"];
const CATEGORIAS = ["Director", "Fiscalizador", "Capataz", "Albañil", "Oficial", "Peón", "Electricista", "Plomero", "Carpintero", "Otro"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString("es-PY", { weekday: "short", day: "2-digit", month: "short" });
}

const climaIcon = (c: string | null) => {
  if (!c) return <Cloud className="w-3.5 h-3.5 text-slate-500" />;
  if (c.includes("Sol")) return <Sun className="w-3.5 h-3.5 text-yellow-400" />;
  if (c.includes("Lluv") || c.includes("Torm")) return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
  if (c.includes("Vient")) return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
  return <Cloud className="w-3.5 h-3.5 text-slate-400" />;
};

// ─── Tarjeta de entrada histórica ────────────────────────────
function EntradaCard({ entrada }: { entrada: EntradaResumen }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {climaIcon(entrada.clima)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {fmtFecha(entrada.fecha)}
            {entrada.turno ? ` · ${entrada.turno.split(" ")[0]}` : ""}
          </p>
          <p className="text-xs text-slate-500 truncate">{entrada.descripcionGeneral}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {entrada.personalDelDia.length > 0 && (
            <span className="text-[10px] font-medium bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
              {entrada.personalDelDia.length}p
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-2">
          <p className="text-sm text-slate-300 leading-relaxed">{entrada.descripcionGeneral}</p>
          {entrada.rubrosDelDia.length > 0 && (
            <div className="space-y-1">
              {entrada.rubrosDelDia.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                  <Wrench className="w-3 h-3 shrink-0" />
                  <span className="flex-1">{r.descripcion}</span>
                  {r.avancePct != null && (
                    <span className="text-teal-400 font-medium">{r.avancePct}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {entrada.personalDelDia.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entrada.personalDelDia.map((p, i) => (
                <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {p.nombre}{p.categoria ? ` (${p.categoria})` : ""}
                </span>
              ))}
            </div>
          )}
          {entrada.enlaceFotos && (
            <a
              href={entrada.enlaceFotos}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300"
            >
              <Camera className="w-3.5 h-3.5" /> Ver fotos
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formulario nueva entrada ─────────────────────────────────
function NuevaEntrada({
  proyectoId,
  nombreFiscal,
  onGuardado,
}: {
  proyectoId: string;
  nombreFiscal: string;
  onGuardado: () => void;
}) {
  const [form, setForm] = useState<{
    fecha: string;
    turno: string;
    clima: string;
    temperatura: string;
    descripcionGeneral: string;
    enlaceFotos: string;
  }>({
    fecha: todayIso(),
    turno: "",
    clima: "",
    temperatura: "",
    descripcionGeneral: "",
    enlaceFotos: "",
  });

  const [personal, setPersonal] = useState<{ nombre: string; categoria: string; horas: string }[]>([]);
  const [rubros, setRubros] = useState<{ desc: string; pct: string }[]>([]);
  const [isPending, startTransition] = useTransition();

  function setF(key: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  function agregarPersona() {
    setPersonal((p) => [...p, { nombre: "", categoria: "Albañil", horas: "8" }]);
  }
  function setPersona(i: number, key: keyof (typeof personal)[0], v: string) {
    setPersonal((arr) => arr.map((p, idx) => idx === i ? { ...p, [key]: v } : p));
  }
  function quitarPersona(i: number) {
    setPersonal((arr) => arr.filter((_, idx) => idx !== i));
  }

  function agregarRubro() {
    setRubros((r) => [...r, { desc: "", pct: "" }]);
  }
  function setRubro(i: number, key: keyof (typeof rubros)[0], v: string) {
    setRubros((arr) => arr.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
  }
  function quitarRubro(i: number) {
    setRubros((arr) => arr.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descripcionGeneral.trim()) {
      toast.error("La descripción general es obligatoria");
      return;
    }
    startTransition(async () => {
      const data: EntradaCampoData = {
        fecha: form.fecha,
        turno: form.turno || undefined,
        clima: form.clima || undefined,
        temperatura: form.temperatura ? Number(form.temperatura) : undefined,
        descripcionGeneral: form.descripcionGeneral,
        enlaceFotos: form.enlaceFotos || undefined,
        personalDelDia: personal
          .filter((p) => p.nombre.trim())
          .map((p) => ({
            nombre: p.nombre,
            categoria: p.categoria || undefined,
            horasTrabajadas: p.horas ? Number(p.horas) : undefined,
          })),
        rubrosDelDia: rubros
          .filter((r) => r.desc.trim())
          .map((r) => ({
            descripcion: r.desc,
            avancePct: r.pct ? Number(r.pct) : undefined,
          })),
      };
      const res = await crearEntradaCampo(proyectoId, data);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Entrada registrada");
        onGuardado();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fecha + Turno */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Fecha</label>
          <input type="date" value={form.fecha} onChange={(e) => setF("fecha", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Turno</label>
          <select value={form.turno} onChange={(e) => setF("turno", e.target.value)} className={inputCls}>
            <option value="">—</option>
            {TURNOS.map((t) => <option key={t} value={t}>{t.split(" ")[0]}</option>)}
          </select>
        </div>
      </div>

      {/* Clima + Temperatura */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Clima</label>
          <select value={form.clima} onChange={(e) => setF("clima", e.target.value)} className={inputCls}>
            <option value="">—</option>
            {CLIMAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Temp. (°C)</label>
          <input type="number" value={form.temperatura} onChange={(e) => setF("temperatura", e.target.value)} placeholder="28" className={inputCls} />
        </div>
      </div>

      {/* Descripción general */}
      <div>
        <label className={labelCls}>Descripción del día *</label>
        <textarea
          value={form.descripcionGeneral}
          onChange={(e) => setF("descripcionGeneral", e.target.value)}
          rows={4}
          placeholder="Describí las actividades realizadas hoy en la obra…"
          required
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Enlace de fotos */}
      <div>
        <label className={labelCls}>
          <Camera className="w-3 h-3 inline mr-1" />
          Enlace de fotos (Drive / WhatsApp)
        </label>
        <input
          type="url"
          value={form.enlaceFotos}
          onChange={(e) => setF("enlaceFotos", e.target.value)}
          placeholder="https://drive.google.com/..."
          className={inputCls}
        />
        <p className="text-[10px] text-slate-600 mt-1">
          Subí las fotos a GoogleDrive o similar y pegá el enlace aquí
        </p>
      </div>

      {/* Personal del día */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>
            <Users className="w-3 h-3 inline mr-1" />
            Personal en obra
          </label>
          <button type="button" onClick={agregarPersona}
            className="text-[10px] font-semibold text-teal-400 flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        <div className="space-y-2">
          {personal.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <input
                type="text"
                value={p.nombre}
                onChange={(e) => setPersona(i, "nombre", e.target.value)}
                placeholder="Nombre"
                className={inputCls}
              />
              <select value={p.categoria} onChange={(e) => setPersona(i, "categoria", e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 text-slate-300 px-2 py-2.5 text-xs focus:outline-none">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                value={p.horas}
                onChange={(e) => setPersona(i, "horas", e.target.value)}
                placeholder="hs"
                className="w-14 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 px-2 py-2.5 text-xs text-center focus:outline-none"
              />
              <button type="button" onClick={() => quitarPersona(i)}
                className="text-slate-600 hover:text-red-400 transition-colors">
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rubros / avance */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>
            <Wrench className="w-3 h-3 inline mr-1" />
            Trabajos realizados
          </label>
          <button type="button" onClick={agregarRubro}
            className="text-[10px] font-semibold text-teal-400 flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>
        <div className="space-y-2">
          {rubros.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
              <input
                type="text"
                value={r.desc}
                onChange={(e) => setRubro(i, "desc", e.target.value)}
                placeholder="Descripción del trabajo"
                className={inputCls}
              />
              <div className="relative w-16">
                <input
                  type="number"
                  min={0} max={100}
                  value={r.pct}
                  onChange={(e) => setRubro(i, "pct", e.target.value)}
                  placeholder="100"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 text-slate-300 px-2 py-2.5 text-xs text-center focus:outline-none"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">%</span>
              </div>
              <button type="button" onClick={() => quitarRubro(i)}
                className="text-slate-600 hover:text-red-400 transition-colors">
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Firma (auto) */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700">
        <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <p className="text-xs text-slate-400">
          Firmado como: <span className="text-teal-300 font-semibold">{nombreFiscal}</span>
        </p>
      </div>

      {/* Botón guardar */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold text-sm transition-colors shadow-lg shadow-teal-600/20"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        {isPending ? "Guardando…" : "Guardar entrada del día"}
      </button>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────
export function CampoBitacoraClient({ proyectoId, proyectoNombre, proyectoCodigo, nombreFiscal, entradas }: Props) {
  const [tab, setTab] = useState<"nueva" | "historial">("nueva");
  const [listaEntradas, setListaEntradas] = useState(entradas);
  const router = useRouter();

  async function handleCerrarSesion() {
    await fetch("/api/campo/auth", { method: "DELETE" });
    router.replace(`/campo/${proyectoId}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header fijo */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">Bitácora de Obra</p>
            <p className="text-sm font-bold text-white truncate">{proyectoNombre}</p>
          </div>
          <button
            type="button"
            onClick={handleCerrarSesion}
            title="Cerrar sesión"
            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 max-w-lg mx-auto bg-slate-800/50 rounded-xl p-1">
          {(["nueva", "historial"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t === "nueva" ? "+ Nueva entrada" : `Historial (${listaEntradas.length})`}
            </button>
          ))}
        </div>
      </header>

      {/* Contenido */}
      <main className="px-4 py-5 max-w-lg mx-auto">
        {tab === "nueva" ? (
          <NuevaEntrada
            proyectoId={proyectoId}
            nombreFiscal={nombreFiscal}
            onGuardado={() => {
              router.refresh();
              setTab("historial");
            }}
          />
        ) : (
          <div className="space-y-3">
            {listaEntradas.length === 0 ? (
              <p className="text-center text-slate-600 text-sm py-12">
                No hay entradas registradas aún.
              </p>
            ) : (
              listaEntradas.map((e) => <EntradaCard key={e.id} entrada={e} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
}
