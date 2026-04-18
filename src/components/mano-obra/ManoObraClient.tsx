"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { registrarPagoContrato, eliminarPagoContrato } from "@/app/proyectos/[id]/mano-obra/actions";
import type { RegistrarPagoContratoData } from "@/app/proyectos/[id]/mano-obra/actions";
import type { MetodoPago } from "@prisma/client";
import Link from "next/link";
import {
  ArrowLeft,
  HardHat,
  Users,
  BarChart2,
  BookOpen,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Printer,
  Download,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AsignarProyectoWidget } from "@/components/shared/AsignarProyectoWidget";
import type { ProyectoSimple } from "@/app/actions/proyectos";
import type { ContratistaDB, PagoRegistroDB } from "@/app/actions/init-modulos";
import { getEmpresaConfig, openBrandedPrintWindow } from "@/lib/reportHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ayudante {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
}

interface Contratista {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
  rubro: string;
  alcance: string;
  montoPactado: number;
  retencion: number; // porcentaje
  ayudantes: Ayudante[];
}

interface PagoRegistro {
  id: string;
  fecha: string;
  monto: number;
  porcentajePago: number;   // % del total que representa este pago
  porcentajeAvance: number; // % de avance de obra reportado
  metodoPago?: string;
  autorizadoPor?: string;
  realizadoPor?: string;
  nroComprobante?: string;
  observacion?: string;
  otroMetodoDetalle?: string;
  nroCheque?: string;
  bancoCheque?: string;
  nroTransaccion?: string;
  bancoTransfer?: string;
}

interface BitacoraRegistro {
  id: string;
  fecha: string;
  descripcion: string;
  inconvenientes: string;
  soluciones: string;
}

// ─── Data inicial mock ────────────────────────────────────────────────────────

const CONTRATISTAS_INICIALES: Contratista[] = [
  {
    id: "c1",
    nombre: "Juan Pérez",
    documento: "3.456.789",
    telefono: "0981-456-789",
    rubro: "Mampostería",
    alcance:
      "Construcción de muros de mampostería de ladrillos comunes en planta baja y planta alta según planos de arquitectura.",
    montoPactado: 45_000_000,
    retencion: 5,
    ayudantes: [
      { id: "a1", nombre: "Carlos Núñez", documento: "4.567.890", telefono: "0982-111-222" },
      { id: "a2", nombre: "Roberto Alderete", documento: "5.678.901", telefono: "0983-333-444" },
    ],
  },
  {
    id: "c2",
    nombre: "María González",
    documento: "2.345.678",
    telefono: "0991-234-567",
    rubro: "Revestimientos",
    alcance: "Colocación de cerámicos y revestimientos en baños, cocina y pasillos.",
    montoPactado: 28_000_000,
    retencion: 5,
    ayudantes: [
      { id: "a3", nombre: "Lorena Benítez", documento: "6.789.012", telefono: "0984-555-666" },
    ],
  },
];

const PAGOS_INICIALES: PagoRegistro[] = [
  {
    id: "p1",
    fecha: "2026-01-15",
    monto: 9_000_000,
    porcentajePago: 20,
    porcentajeAvance: 22,
  },
  {
    id: "p2",
    fecha: "2026-02-01",
    monto: 9_000_000,
    porcentajePago: 20,
    porcentajeAvance: 45,
  },
  {
    id: "p3",
    fecha: "2026-02-15",
    monto: 11_250_000,
    porcentajePago: 25,
    porcentajeAvance: 60,
  },
];

const BITACORA_INICIAL: BitacoraRegistro[] = [
  {
    id: "b1",
    fecha: "2026-02-15",
    descripcion: "Avance de muros laterales en planta baja. Se completó el eje A-B.",
    inconvenientes: "Faltante de ladrillos en obra. Se solicitó reposición.",
    soluciones: "Proveedor confirmó entrega para el día siguiente.",
  },
  {
    id: "b2",
    fecha: "2026-02-28",
    descripcion: "Inicio de mampostería en planta alta. Cuadrilla completa.",
    inconvenientes: "Ninguno.",
    soluciones: "—",
  },
];

// Curva planificada fija (referencia)
const CURVA_PLANIFICADA = [
  { periodo: "Q1", planificado: 10 },
  { periodo: "Q2", planificado: 25 },
  { periodo: "Q3", planificado: 45 },
  { periodo: "Q4", planificado: 65 },
  { periodo: "Q5", planificado: 80 },
  { periodo: "Q6", planificado: 100 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${++_seq}`;
}

function fmtGs(n: number) {
  return n.toLocaleString("es-PY");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-orange-500 dark:text-orange-400 text-orange-600"
          : "border-transparent dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Tab 1: Ficha & Cuadrilla ────────────────────────────────────────────────

function TabFicha({
  contratista,
  onUpdate,
}: {
  contratista: Contratista;
  onUpdate: (c: Contratista) => void;
}) {
  const handleField = (field: keyof Contratista, value: string | number) => {
    onUpdate({ ...contratista, [field]: value });
  };

  const handleAyudante = (id: string, field: keyof Ayudante, value: string) => {
    onUpdate({
      ...contratista,
      ayudantes: contratista.ayudantes.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    });
  };

  const addAyudante = () => {
    onUpdate({
      ...contratista,
      ayudantes: [
        ...contratista.ayudantes,
        { id: uid("a"), nombre: "", documento: "", telefono: "" },
      ],
    });
  };

  const removeAyudante = (id: string) => {
    onUpdate({
      ...contratista,
      ayudantes: contratista.ayudantes.filter((a) => a.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Datos del contratista */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
          <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
            Datos del Contratista
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
              Nombre completo
            </label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              value={contratista.nombre}
              onChange={(e) => handleField("nombre", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
              C.I.
            </label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              value={contratista.documento}
              onChange={(e) => handleField("documento", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
              Teléfono
            </label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              value={contratista.telefono}
              onChange={(e) => handleField("telefono", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Contrato */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
          <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
            Datos del Contrato
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
                Rubro asignado
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                value={contratista.rubro}
                onChange={(e) => handleField("rubro", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
                % Retención (fondo de reparo)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                value={contratista.retencion}
                onChange={(e) => handleField("retencion", Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
              Alcance del trabajo
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
              value={contratista.alcance}
              onChange={(e) => handleField("alcance", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
              Monto pactado total (Gs)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              value={contratista.montoPactado}
              onChange={(e) => handleField("montoPactado", Number(e.target.value))}
            />
            <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-1">
              Retención: Gs. {fmtGs(Math.round(contratista.montoPactado * contratista.retencion / 100))}
              {" "}· Neto liberable: Gs.{" "}
              {fmtGs(Math.round(contratista.montoPactado * (1 - contratista.retencion / 100)))}
            </p>
          </div>
        </div>
      </section>

      {/* Cuadrilla */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
            Ayudantes / Personal a cargo
          </h3>
          <button
            onClick={addAyudante}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-orange-500/10 bg-orange-50 dark:text-orange-400 text-orange-600 dark:hover:bg-orange-500/20 hover:bg-orange-100 border dark:border-orange-500/20 border-orange-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
        <div className="p-4 space-y-3">
          {contratista.ayudantes.length === 0 && (
            <p className="text-sm dark:text-slate-500 text-slate-400 text-center py-4">
              Sin personal registrado
            </p>
          )}
          {contratista.ayudantes.map((a, idx) => (
            <div
              key={a.id}
              className="flex items-start gap-2 p-3 rounded-lg dark:bg-slate-800/60 bg-slate-50 border dark:border-white/[0.05] border-slate-200"
            >
              <span className="mt-2 text-[11px] font-bold dark:text-slate-500 text-slate-400 w-5 shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  placeholder="Nombre"
                  className="rounded-md px-2.5 py-1.5 text-xs dark:bg-slate-700 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                  value={a.nombre}
                  onChange={(e) => handleAyudante(a.id, "nombre", e.target.value)}
                />
                <input
                  placeholder="Documento (C.I.)"
                  className="rounded-md px-2.5 py-1.5 text-xs dark:bg-slate-700 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                  value={a.documento}
                  onChange={(e) => handleAyudante(a.id, "documento", e.target.value)}
                />
                <input
                  placeholder="Teléfono"
                  className="rounded-md px-2.5 py-1.5 text-xs dark:bg-slate-700 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                  value={a.telefono}
                  onChange={(e) => handleAyudante(a.id, "telefono", e.target.value)}
                />
              </div>
              <button
                onClick={() => removeAyudante(a.id)}
                className="mt-1.5 p-1 rounded-md dark:text-red-400/60 text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Tab 2: Estado de Cuenta & Curvas ────────────────────────────────────────

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
  { value: "GIRO", label: "Giro" },
  { value: "OTRO", label: "Otro (especificar)" },
];

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", CHEQUE: "Cheque",
  TRANSFERENCIA: "Transferencia Bancaria", GIRO: "Giro", OTRO: "Otro",
};

// ─── Modal: Registrar Pago de Personal ───────────────────────────────────────

function ModalRegistrarPagoPersonal({
  contratista,
  proyectoId,
  contratoId,
  onClose,
  onPagado,
}: {
  contratista: Contratista;
  proyectoId: string;
  contratoId: string;
  onClose: () => void;
  onPagado: (p: PagoRegistro) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Partial<RegistrarPagoContratoData> & { metodoPago: string }>({
    metodoPago: "EFECTIVO",
    fecha: new Date().toISOString().split("T")[0],
    porcentajeAvance: 0,
  });
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fecha || !form.monto) {
      toast.error("Completá la fecha y el monto");
      return;
    }
    const monto = Number(form.monto);
    const pctPago = contratista.montoPactado > 0
      ? parseFloat(((monto / contratista.montoPactado) * 100).toFixed(2))
      : 0;
    startTransition(async () => {
      try {
        const res = await registrarPagoContrato(proyectoId, contratoId, contratista.nombre, form as RegistrarPagoContratoData);
        onPagado({
          id: res.id,
          fecha: form.fecha!,
          monto,
          porcentajePago: pctPago,
          porcentajeAvance: Number(form.porcentajeAvance ?? 0),
          metodoPago: form.metodoPago,
          autorizadoPor: form.autorizadoPor,
          realizadoPor: form.realizadoPor,
          nroComprobante: form.nroComprobante,
          observacion: form.observacion,
          otroMetodoDetalle: form.otroMetodoDetalle,
          nroCheque: form.nroCheque,
          bancoCheque: form.bancoCheque,
          nroTransaccion: form.nroTransaccion,
          bancoTransfer: form.bancoTransfer,
        });
        toast.success("Pago registrado en Libro Mayor");
        onClose();
      } catch {
        toast.error("Error al registrar el pago");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Registrar Pago
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{contratista.nombre} — {contratista.rubro}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha de Pago *</label>
              <input type="date" value={form.fecha ?? ""} onChange={(e) => set("fecha", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monto Pagado (Gs.) *</label>
              <input type="number" min={0} step="1" value={form.monto ?? ""} onChange={(e) => set("monto", parseFloat(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" required />
              {form.monto && contratista.montoPactado > 0 && (
                <p className="text-[11px] dark:text-teal-400 text-teal-600 mt-1">
                  = {((Number(form.monto) / contratista.montoPactado) * 100).toFixed(2)}% del monto pactado
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">% Avance de Obra</label>
            <input type="number" min={0} max={100} step="1" value={form.porcentajeAvance ?? ""} onChange={(e) => set("porcentajeAvance", parseFloat(e.target.value))}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">N° Comprobante</label>
              <input type="text" value={form.nroComprobante ?? ""} onChange={(e) => set("nroComprobante", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Autorizó el pago</label>
              <input type="text" value={form.autorizadoPor ?? ""} onChange={(e) => set("autorizadoPor", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Realizado por</label>
            <input type="text" value={form.realizadoPor ?? ""} onChange={(e) => set("realizadoPor", e.target.value)}
              placeholder="Ej: Carlos Rodríguez — Tesorero"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Medio de Pago *</label>
            <select value={form.metodoPago} onChange={(e) => set("metodoPago", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm">
              {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {form.metodoPago === "CHEQUE" && (
            <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 space-y-3">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Datos del Cheque</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Banco</label>
                  <input type="text" value={form.bancoCheque ?? ""} onChange={(e) => set("bancoCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">N° de Cheque</label>
                  <input type="text" value={form.nroCheque ?? ""} onChange={(e) => set("nroCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha de Emisión</label>
                  <input type="date" value={form.fechaEmisionCheque ?? ""} onChange={(e) => set("fechaEmisionCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha de Cobro</label>
                  <input type="date" value={form.fechaCobroCheque ?? ""} onChange={(e) => set("fechaCobroCheque", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}
          {(form.metodoPago === "TRANSFERENCIA" || form.metodoPago === "GIRO") && (
            <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Datos de la Transferencia</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Banco</label>
                  <input type="text" value={form.bancoTransfer ?? ""} onChange={(e) => set("bancoTransfer", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">N° de Transacción</label>
                  <input type="text" value={form.nroTransaccion ?? ""} onChange={(e) => set("nroTransaccion", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}
          {form.metodoPago === "OTRO" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Especificar</label>
              <input type="text" value={form.otroMetodoDetalle ?? ""} onChange={(e) => set("otroMetodoDetalle", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Observación</label>
            <textarea rows={2} value={form.observacion ?? ""} onChange={(e) => set("observacion", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
              {pending ? "Registrando…" : "Confirmar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Detalle de Pago ───────────────────────────────────────────────────

function DetalleRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b dark:border-white/[0.05] border-slate-100 last:border-0">
      <span className="text-xs dark:text-slate-400 text-slate-500">{label}</span>
      <span className={`text-xs font-medium ${value ? "dark:text-slate-200 text-slate-800" : "dark:text-slate-600 text-slate-400 italic"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function buildComprobantePagoPersonal(
  contratistaNombre: string,
  rubro: string,
  pago: PagoRegistro,
  nro: number,
  proyectoId: string,
) {
  const empresa = getEmpresaConfig(proyectoId);
  const metodoStr = pago.metodoPago
    ? (pago.metodoPago === "OTRO" && pago.otroMetodoDetalle ? pago.otroMetodoDetalle : (METODO_LABEL[pago.metodoPago] ?? pago.metodoPago))
    : "—";
  const val = (v?: string | null) => v ?? "—";

  function row(label: string, value: string) {
    const empty = value === "—";
    return `<tr><td style='width:160pt;padding:5pt 8pt 5pt 0;font-size:9pt;color:#6b7280;vertical-align:top'>${label}</td><td style='padding:5pt 0;font-size:9.5pt;color:${empty ? "#9ca3af" : "#111"};${empty ? "font-style:italic" : ""}'>${value}</td></tr>`;
  }
  function section(title: string, content: string) {
    return `<div style='margin-bottom:14pt'><div style='font-size:8pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5pt solid #d1d5db;padding-bottom:4pt;margin-bottom:8pt'>${title}</div><table style='width:100%;border-collapse:collapse'>${content}</table></div>`;
  }

  let medioPagoContent = row("Medio de Pago", metodoStr);
  if (pago.metodoPago === "CHEQUE") {
    medioPagoContent += row("Banco", val(pago.bancoCheque));
    medioPagoContent += row("N° de Cheque", val(pago.nroCheque));
  } else if (pago.metodoPago === "TRANSFERENCIA" || pago.metodoPago === "GIRO") {
    medioPagoContent += row("Banco", val(pago.bancoTransfer));
    medioPagoContent += row("N° Transacción", val(pago.nroTransaccion));
  }

  const bodyContent =
    section("Contratista",
      row("Nombre", contratistaNombre) +
      row("Rubro", rubro),
    ) +
    section("Datos del Pago",
      row("Fecha", pago.fecha) +
      row("Monto", `<span style='color:#991b1b;font-weight:700;font-size:11pt'>${fmtGs(pago.monto)}</span>`) +
      row("% del Total Pactado", `${pago.porcentajePago}%`) +
      row("% Avance de Obra", `${pago.porcentajeAvance}%`) +
      row("N° Comprobante", val(pago.nroComprobante)),
    ) +
    section("Medio de Pago", medioPagoContent) +
    section("Autorización",
      row("Autorizó el Pago", val(pago.autorizadoPor)) +
      row("Realizado por", val(pago.realizadoPor)),
    ) +
    section("Observaciones",
      `<tr><td colspan='2' style='font-size:9pt;color:${pago.observacion ? "#374151" : "#9ca3af"};font-style:italic;padding:4pt 0'>${pago.observacion ?? "Sin observaciones"}</td></tr>`,
    ) +
    `<div style='margin-top:24pt;padding-top:12pt;border-top:1pt solid #d1d5db;display:flex;gap:40pt'>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Conforme — Contratista</div></div>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Firma Autorizante</div></div>` +
      `<div style='text-align:center;flex:1'><div style='height:40pt;border-bottom:0.5pt solid #374151;margin-bottom:6pt'></div><div style='font-size:8pt;color:#6b7280'>Sello de la Empresa</div></div>` +
    `</div>`;

  openBrandedPrintWindow(
    `Comprobante de Pago #${nro} — ${contratistaNombre}`,
    "COMPROBANTE DE PAGO — MANO DE OBRA",
    `Pago #${nro} · ${contratistaNombre} · ${pago.fecha}`,
    bodyContent,
    empresa,
  );
}

function ModalDetallePago({
  pago,
  nro,
  contratista,
  proyectoId,
  onClose,
}: {
  pago: PagoRegistro;
  nro: number;
  contratista: Contratista;
  proyectoId: string;
  onClose: () => void;
}) {
  const metodoStr = pago.metodoPago
    ? (pago.metodoPago === "OTRO" && pago.otroMetodoDetalle
        ? pago.otroMetodoDetalle
        : (METODO_LABEL[pago.metodoPago] ?? pago.metodoPago))
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Pago #{nro}</p>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{contratista.nombre}</p>
            <p className="text-xs text-slate-400">{contratista.rubro}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Monto destacado */}
        <div className="px-6 pt-5">
          <div className="rounded-xl p-4 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Monto del Pago</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmtGs(pago.monto)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">% Total Pactado</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{pago.porcentajePago}%</p>
              <p className="text-xs text-slate-400">{pago.porcentajeAvance}% avance</p>
            </div>
          </div>
        </div>

        {/* Detalle completo */}
        <div className="px-6 py-5 space-y-5">
          {/* Identificación */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Identificación</p>
            <div className="space-y-0.5">
              <DetalleRow label="Fecha" value={pago.fecha} />
              <DetalleRow label="N° Comprobante" value={pago.nroComprobante} />
            </div>
          </div>

          {/* Medio de pago */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Medio de Pago</p>
            <div className="space-y-0.5">
              <DetalleRow label="Método" value={metodoStr} />
              {pago.metodoPago === "CHEQUE" && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 mt-2 space-y-0.5">
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Datos del Cheque</p>
                  <DetalleRow label="Banco" value={pago.bancoCheque} />
                  <DetalleRow label="N° de Cheque" value={pago.nroCheque} />
                </div>
              )}
              {(pago.metodoPago === "TRANSFERENCIA" || pago.metodoPago === "GIRO") && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 mt-2 space-y-0.5">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Datos de la Transferencia</p>
                  <DetalleRow label="Banco" value={pago.bancoTransfer} />
                  <DetalleRow label="N° Transacción" value={pago.nroTransaccion} />
                </div>
              )}
            </div>
          </div>

          {/* Autorización */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Autorización</p>
            <div className="space-y-0.5">
              <DetalleRow label="Autorizó el pago" value={pago.autorizadoPor} />
              <DetalleRow label="Realizado por" value={pago.realizadoPor} />
            </div>
          </div>

          {/* Observación */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Observación</p>
            <p className={`text-sm rounded-lg p-3 ${pago.observacion ? "dark:bg-slate-800 bg-slate-50 dark:text-slate-300 text-slate-700" : "italic dark:text-slate-600 text-slate-400"}`}>
              {pago.observacion ?? "Sin observaciones"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cerrar</button>
          <button
            onClick={() => buildComprobantePagoPersonal(contratista.nombre, contratista.rubro, pago, nro, proyectoId)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 dark:border-orange-700 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-medium"
          >
            <Printer className="w-4 h-4" /> Imprimir comprobante
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers de exportación ───────────────────────────────────────────────────

function exportarPagosCSV(contratista: Contratista, pagos: PagoRegistro[]) {
  const filas = [
    "Nro,Fecha,Monto (Gs),% del Total,% Avance,Medio de Pago,N° Comprobante,Autorizó,Realizado por,Observación"
  ];
  pagos.forEach((p, i) => {
    const metodo = p.metodoPago
      ? (p.metodoPago === "OTRO" && p.otroMetodoDetalle ? p.otroMetodoDetalle : (METODO_LABEL[p.metodoPago] ?? p.metodoPago))
      : "";
    const esc = (s?: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    filas.push([
      i + 1, p.fecha, p.monto, `${p.porcentajePago}%`, `${p.porcentajeAvance}%`,
      metodo, esc(p.nroComprobante), esc(p.autorizadoPor), esc(p.realizadoPor), esc(p.observacion)
    ].join(","));
  });
  const blob = new Blob(["\uFEFF" + filas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pagos-${contratista.nombre.replace(/\s+/g, "_")}.csv`;
  a.click();
}

function buildChartSVG(rows: Array<{ periodo: string; planificado: number; avanceReal: number; pagosEfectuados: number }>): string {
  const W = 560, H = 220;
  const pad = { top: 16, right: 20, bottom: 40, left: 44 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;
  const n = rows.length;
  const xOf = (i: number) => pad.left + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
  const yOf = (v: number) => pad.top + ph - Math.min(v, 100) / 100 * ph;

  const gridLines = [0, 25, 50, 75, 100].map(v => {
    const y = yOf(v);
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${W - pad.right}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>` +
      `<text x="${pad.left - 5}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${v}%</text>`;
  }).join("");

  const xLabels = rows.map((d, i) =>
    `<text x="${xOf(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#6b7280">${d.periodo}</text>`
  ).join("");

  function polyPoints(key: "planificado" | "avanceReal" | "pagosEfectuados") {
    return rows.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d[key]).toFixed(1)}`).join(" ");
  }
  function dots(key: "avanceReal" | "pagosEfectuados", color: string, r = 3) {
    return rows.map((d, i) =>
      d[key] > 0 ? `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(d[key]).toFixed(1)}" r="${r}" fill="${color}" stroke="white" stroke-width="1"/>` : ""
    ).join("");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#fff;display:block">
    ${gridLines}
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${H - pad.bottom}" stroke="#d1d5db" stroke-width="1"/>
    ${xLabels}
    <polyline points="${polyPoints("planificado")}" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="6 3"/>
    <polyline points="${polyPoints("avanceReal")}" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
    <polyline points="${polyPoints("pagosEfectuados")}" fill="none" stroke="#10b981" stroke-width="2"/>
    ${dots("avanceReal", "#3b82f6")}
    ${dots("pagosEfectuados", "#10b981")}
    <rect x="${pad.left}" y="${pad.top}" width="${pw}" height="${ph}" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
  </svg>`;
}

function buildHealthBarHTML(totalPctPago: number, ultimoAvance: number, riesgoSobrepago: boolean): string {
  const pctPagoW = Math.min(totalPctPago, 100).toFixed(1);
  const avanceW = Math.min(ultimoAvance, 100).toFixed(1);
  const color = riesgoSobrepago ? "#ef4444" : "#10b981";
  const bg = riesgoSobrepago ? "#fef2f2" : "#f0fdf4";
  const border = riesgoSobrepago ? "#fca5a5" : "#86efac";
  const title = riesgoSobrepago ? "⚠ Riesgo de Sobrepago" : "✓ Contrato Saludable";
  const titleColor = riesgoSobrepago ? "#b91c1c" : "#065f46";

  return `<div style='border:1pt solid ${border};background:${bg};border-radius:6pt;padding:10pt 14pt;margin-bottom:12pt'>
    <div style='font-size:10pt;font-weight:700;color:${titleColor};margin-bottom:4pt'>${title}</div>
    <div style='font-size:8.5pt;color:#6b7280;margin-bottom:8pt'>Avance real: <b style='color:#1e3a8a'>${ultimoAvance}%</b> &nbsp;·&nbsp; Pagado del total: <b style='color:${titleColor}'>${totalPctPago.toFixed(1)}%</b></div>
    <div style='margin-bottom:6pt'>
      <div style='display:flex;justify-content:space-between;font-size:8pt;color:#6b7280;margin-bottom:3pt'><span>Avance Real</span><span>${ultimoAvance}%</span></div>
      <div style='height:8pt;background:#e5e7eb;border-radius:4pt;overflow:hidden'>
        <div style='height:100%;background:#3b82f6;border-radius:4pt;width:${avanceW}%'></div>
      </div>
    </div>
    <div>
      <div style='display:flex;justify-content:space-between;font-size:8pt;color:#6b7280;margin-bottom:3pt'><span>Pagado del total</span><span>${totalPctPago.toFixed(1)}%</span></div>
      <div style='height:8pt;background:#e5e7eb;border-radius:4pt;overflow:hidden'>
        <div style='height:100%;background:${color};border-radius:4pt;width:${pctPagoW}%'></div>
      </div>
    </div>
  </div>`;
}

function imprimirPagos(contratista: Contratista, pagos: PagoRegistro[], proyectoId: string) {
  const empresa = getEmpresaConfig(proyectoId);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const totalPctPago = pagos.reduce((s, p) => s + p.porcentajePago, 0);
  const ultimoAvance = pagos.length > 0 ? pagos[pagos.length - 1].porcentajeAvance : 0;
  const riesgoSobrepago = totalPctPago > ultimoAvance;
  const saldo = contratista.montoPactado - totalPagado;

  // Construir chartData igual que en el useMemo de TabEstadoCuenta
  const chartRows = pagos.map((p, i) => {
    const acumPago = pagos.slice(0, i + 1).reduce((s, x) => s + x.porcentajePago, 0);
    return { periodo: `Q${i + 1}`, planificado: CURVA_PLANIFICADA[i]?.planificado ?? 100, avanceReal: p.porcentajeAvance, pagosEfectuados: Math.min(acumPago, 100) };
  });
  for (let i = chartRows.length; i < CURVA_PLANIFICADA.length; i++) {
    chartRows.push({ periodo: `Q${i + 1}`, planificado: CURVA_PLANIFICADA[i].planificado, avanceReal: 0, pagosEfectuados: 0 });
  }

  const filas = pagos.map((p, i) => {
    const metodo = p.metodoPago
      ? (p.metodoPago === "OTRO" && p.otroMetodoDetalle ? p.otroMetodoDetalle : (METODO_LABEL[p.metodoPago] ?? p.metodoPago))
      : "—";
    return `<tr style='border-bottom:0.5pt solid #e5e7eb'>
      <td style='padding:5pt 6pt;font-size:9pt;text-align:center'>${i + 1}</td>
      <td style='padding:5pt 6pt;font-size:9pt'>${p.fecha}</td>
      <td style='padding:5pt 6pt;font-size:9pt;text-align:right;font-weight:600;color:#991b1b'>${fmtGs(p.monto)}</td>
      <td style='padding:5pt 6pt;font-size:9pt;text-align:center'>${p.porcentajePago}%</td>
      <td style='padding:5pt 6pt;font-size:9pt;text-align:center'>${p.porcentajeAvance}%</td>
      <td style='padding:5pt 6pt;font-size:9pt'>${metodo}</td>
      <td style='padding:5pt 6pt;font-size:9pt'>${p.nroComprobante ?? "—"}</td>
      <td style='padding:5pt 6pt;font-size:9pt'>${p.autorizadoPor ?? "—"}</td>
    </tr>`;
  }).join("");

  const chartSVG = buildChartSVG(chartRows);
  const healthBar = buildHealthBarHTML(totalPctPago, ultimoAvance, riesgoSobrepago);

  const bodyContent =
    `<div style='margin-bottom:10pt;display:flex;gap:20pt'>` +
      `<div style='flex:1;padding:10pt;background:#f9fafb;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#6b7280'>Monto Pactado</div><div style='font-size:13pt;font-weight:700;color:#1e3a8a'>${fmtGs(contratista.montoPactado)}</div></div>` +
      `<div style='flex:1;padding:10pt;background:#f0fdf4;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#15803d'>Total Pagado</div><div style='font-size:13pt;font-weight:700;color:#065f46'>${fmtGs(totalPagado)}</div></div>` +
      `<div style='flex:1;padding:10pt;background:#fefce8;border-radius:6pt;text-align:center'><div style='font-size:8pt;color:#92400e'>Saldo</div><div style='font-size:13pt;font-weight:700;color:#78350f'>${fmtGs(saldo)}</div></div>` +
    `</div>` +
    `<div style='margin-bottom:10pt;font-size:9pt'><b>Contratista:</b> ${contratista.nombre} &nbsp;\u00b7&nbsp; <b>Rubro:</b> ${contratista.rubro} &nbsp;\u00b7&nbsp; <b>Retenci\u00f3n:</b> ${contratista.retencion}%</div>` +
    healthBar +
    `<div style='margin:12pt 0;padding:12pt;background:#f9fafb;border:0.5pt solid #e5e7eb;border-radius:6pt'>` +
      `<div style='font-size:8pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8pt'>Curvas de Avance y Pago</div>` +
      chartSVG +
      `<div style='display:flex;gap:20pt;margin-top:8pt;font-size:8pt;color:#6b7280'>` +
        `<span><span style='display:inline-block;width:18pt;height:2pt;border-top:2pt dashed #f97316;vertical-align:middle;margin-right:4pt'></span>Curva Planificada</span>` +
        `<span><span style='display:inline-block;width:18pt;height:2.5pt;background:#3b82f6;vertical-align:middle;margin-right:4pt'></span>Avance Real</span>` +
        `<span><span style='display:inline-block;width:18pt;height:2pt;background:#10b981;vertical-align:middle;margin-right:4pt'></span>Pagos Efectuados</span>` +
      `</div>` +
    `</div>` +
    `<div style='font-size:8pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5pt solid #d1d5db;padding-bottom:4pt;margin-bottom:6pt'>Registros de Pagos</div>` +
    `<table style='width:100%;border-collapse:collapse;font-size:9pt'>` +
      `<thead><tr style='background:#f3f4f6'><th style='padding:5pt 6pt'>Nro</th><th style='padding:5pt 6pt;text-align:left'>Fecha</th><th style='padding:5pt 6pt;text-align:right'>Monto (Gs)</th><th style='padding:5pt 6pt'>% Total</th><th style='padding:5pt 6pt'>% Avance</th><th style='padding:5pt 6pt;text-align:left'>Medio Pago</th><th style='padding:5pt 6pt;text-align:left'>Comprobante</th><th style='padding:5pt 6pt;text-align:left'>Autoriz\u00f3</th></tr></thead>` +
      `<tbody>${filas}</tbody>` +
    `</table>` +
    `<div style='margin-top:16pt;padding:10pt;background:#f9fafb;border-radius:6pt;display:flex;justify-content:space-between'>` +
      `<span style='font-size:10pt;font-weight:700'>Total Pagado</span>` +
      `<span style='font-size:10pt;font-weight:700;color:#991b1b'>${fmtGs(totalPagado)}</span>` +
    `</div>`;

  openBrandedPrintWindow(
    `Estado de Cuenta — ${contratista.nombre}`,
    "ESTADO DE CUENTA — MANO DE OBRA",
    `${contratista.nombre} · ${contratista.rubro}`,
    bodyContent,
    empresa,
  );
}

function TabEstadoCuenta({
  contratista,
  pagos,
  onAddPago,
  onRemovePago,
  proyectoId,
  contratoId,
}: {
  contratista: Contratista;
  pagos: PagoRegistro[];
  onAddPago: (p: PagoRegistro) => void;
  onRemovePago: (id: string) => void;
  proyectoId: string;
  contratoId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showModalPago, setShowModalPago] = useState(false);
  const [detallePago, setDetallePago] = useState<{ pago: PagoRegistro; nro: number } | null>(null);

  // Acumular pagos para curva
  const chartData = useMemo(() => {
    const rows = pagos.map((p, i) => {
      const acumPago = pagos.slice(0, i + 1).reduce((s, x) => s + x.porcentajePago, 0);
      return {
        periodo: `Q${i + 1}`,
        planificado: CURVA_PLANIFICADA[i]?.planificado ?? 100,
        avanceReal: p.porcentajeAvance,
        pagosEfectuados: Math.min(acumPago, 100),
      };
    });
    // Completar con curva planificada si hay menos pagos
    for (let i = rows.length; i < CURVA_PLANIFICADA.length; i++) {
      rows.push({ periodo: `Q${i + 1}`, planificado: CURVA_PLANIFICADA[i].planificado, avanceReal: 0, pagosEfectuados: 0 });
    }
    return rows;
  }, [pagos]);

  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const totalPctPago = pagos.reduce((s, p) => s + p.porcentajePago, 0);
  const ultimoAvance = pagos.length > 0 ? pagos[pagos.length - 1].porcentajeAvance : 0;
  const riesgoSobrepago = totalPctPago > ultimoAvance;

  return (
    <div className="space-y-6">
      {/* Modales */}
      {showModalPago && (
        <ModalRegistrarPagoPersonal
          contratista={contratista}
          proyectoId={proyectoId}
          contratoId={contratoId}
          onClose={() => setShowModalPago(false)}
          onPagado={(p) => { onAddPago(p); setShowModalPago(false); }}
        />
      )}
      {detallePago && (
        <ModalDetallePago
          pago={detallePago.pago}
          nro={detallePago.nro}
          contratista={contratista}
          proyectoId={proyectoId}
          onClose={() => setDetallePago(null)}
        />
      )}

      {/* Momentum / Health Bar */}
      <section
        className={`rounded-xl border p-4 flex items-start gap-4 ${
          riesgoSobrepago
            ? "dark:border-red-500/30 border-red-200 dark:bg-red-500/5 bg-red-50"
            : "dark:border-emerald-500/30 border-emerald-200 dark:bg-emerald-500/5 bg-emerald-50"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            riesgoSobrepago
              ? "dark:bg-red-500/10 bg-red-100"
              : "dark:bg-emerald-500/10 bg-emerald-100"
          }`}
        >
          {riesgoSobrepago ? (
            <AlertTriangle className="w-5 h-5 dark:text-red-400 text-red-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 dark:text-emerald-400 text-emerald-600" />
          )}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${riesgoSobrepago ? "dark:text-red-300 text-red-700" : "dark:text-emerald-300 text-emerald-700"}`}>
            {riesgoSobrepago ? "⚠ Riesgo de Sobrepago" : "✓ Contrato Saludable"}
          </p>
          <p className={`text-xs mt-0.5 ${riesgoSobrepago ? "dark:text-red-400/80 text-red-600" : "dark:text-emerald-400/80 text-emerald-600"}`}>
            Avance real: <strong>{ultimoAvance}%</strong> · Pagado: <strong>{totalPctPago.toFixed(1)}%</strong>
          </p>
          {/* Progress bars */}
          <div className="mt-3 space-y-2">
            <div>
              <div className="flex justify-between text-[10px] dark:text-slate-400 text-slate-500 mb-1">
                <span>Avance Real</span><span>{ultimoAvance}%</span>
              </div>
              <div className="h-2 rounded-full dark:bg-slate-700 bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(ultimoAvance, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] dark:text-slate-400 text-slate-500 mb-1">
                <span>Pagado del total</span><span>{totalPctPago.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full dark:bg-slate-700 bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${riesgoSobrepago ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(totalPctPago, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400">Total pagado</p>
          <p className="text-sm font-bold dark:text-slate-100 text-slate-800 tabular-nums">
            Gs. {fmtGs(totalPagado)}
          </p>
          <p className="text-[10px] dark:text-slate-500 text-slate-400 tabular-nums">
            Saldo: Gs. {fmtGs(contratista.montoPactado - totalPagado)}
          </p>
        </div>
      </section>

      {/* Gráfico + exportar */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
            Curvas de Avance y Pago
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => exportarPagosCSV(contratista, pagos)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"><Download className="w-3.5 h-3.5" /> CSV</button>
            <button onClick={() => imprimirPagos(contratista, pagos, proyectoId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"><FileText className="w-3.5 h-3.5" /> PDF</button>
            <button onClick={() => imprimirPagos(contratista, pagos, proyectoId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"><Printer className="w-3.5 h-3.5" /> Imprimir</button>
          </div>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#e2e8f0", fontWeight: 700 }}
                formatter={(value) => [`${value ?? 0}%`]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="planificado"
                name="Curva Planificada"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="avanceReal"
                name="Avance Real"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey="pagosEfectuados"
                name="Pagos Efectuados"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Registros de pagos */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        {/* Cabecera — Exportación y Reportes */}
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">Registros de Pagos</h3>
            <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-0.5">Exportación y Reportes</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => exportarPagosCSV(contratista, pagos)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"><Download className="w-3.5 h-3.5" /> CSV</button>
            <button onClick={() => imprimirPagos(contratista, pagos, proyectoId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"><FileText className="w-3.5 h-3.5" /> PDF</button>
            <button onClick={() => imprimirPagos(contratista, pagos, proyectoId)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-700/60 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 transition-colors"><Printer className="w-3.5 h-3.5" /> Imprimir</button>
            <button
              onClick={() => setShowModalPago(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-orange-500/10 bg-orange-50 dark:text-orange-400 text-orange-600 dark:hover:bg-orange-500/20 hover:bg-orange-100 border dark:border-orange-500/20 border-orange-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar pago
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="dark:bg-slate-800/60 bg-slate-50">
                <th className="px-4 py-2 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Nro</th>
                <th className="px-4 py-2 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Fecha</th>
                <th className="px-4 py-2 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Monto (Gs)</th>
                <th className="px-4 py-2 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">% del Total</th>
                <th className="px-4 py-2 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">% Avance</th>
                <th className="px-4 py-2 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Método</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center dark:text-slate-500 text-slate-400">
                    Sin pagos registrados. Presioná <strong>+ Agregar pago</strong> para comenzar.
                  </td>
                </tr>
              )}
              {pagos.map((p, i) => {
                const metodoStr = p.metodoPago
                  ? (p.metodoPago === "OTRO" && p.otroMetodoDetalle ? p.otroMetodoDetalle : (METODO_LABEL[p.metodoPago] ?? p.metodoPago))
                  : "—";
                return (
                  <tr key={p.id} className="border-t dark:border-white/[0.04] border-slate-100 dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 dark:text-slate-500 text-slate-400 font-mono text-[11px]">#{i + 1}</td>
                    <td className="px-4 py-2.5 dark:text-slate-300 text-slate-700">{p.fecha}</td>
                    <td className="px-4 py-2.5 text-right dark:text-slate-100 text-slate-800 font-mono tabular-nums">{fmtGs(p.monto)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700">{p.porcentajePago}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-blue-500/10 bg-blue-50 dark:text-blue-400 text-blue-700">{p.porcentajeAvance}%</span>
                    </td>
                    <td className="px-4 py-2.5 dark:text-slate-400 text-slate-500">{metodoStr}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetallePago({ pago: p, nro: i + 1 })}
                          className="p-1 rounded-md dark:text-slate-400/60 text-slate-400 dark:hover:bg-slate-700 hover:bg-slate-100 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              try {
                                await eliminarPagoContrato(proyectoId, p.id);
                                onRemovePago(p.id);
                              } catch {
                                toast.error("Error al eliminar el pago");
                              }
                            });
                          }}
                          disabled={isPending}
                          className="p-1 rounded-md dark:text-red-400/50 text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Tab 3: Bitácora ─────────────────────────────────────────────────────────

function TabBitacora({
  bitacora,
  onAdd,
}: {
  bitacora: BitacoraRegistro[];
  onAdd: (r: BitacoraRegistro) => void;
}) {
  const [form, setForm] = useState({
    fecha: "",
    descripcion: "",
    inconvenientes: "",
    soluciones: "",
  });

  const handleAdd = () => {
    if (!form.fecha || !form.descripcion) return;
    onAdd({
      id: uid("b"),
      ...form,
    });
    setForm({ fecha: "", descripcion: "", inconvenientes: "", soluciones: "" });
  };

  const sorted = [...bitacora].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Formulario de carga */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
          <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
            Registro de Hoy
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
              Fecha
            </label>
            <input
              type="date"
              className="w-full sm:w-48 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
              Descripción de trabajos realizados
            </label>
            <textarea
              rows={3}
              placeholder="Detallar actividades del día..."
              className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
                Inconvenientes
              </label>
              <textarea
                rows={2}
                placeholder="Problemas encontrados..."
                className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
                value={form.inconvenientes}
                onChange={(e) => setForm({ ...form, inconvenientes: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">
                Soluciones sugeridas
              </label>
              <textarea
                rows={2}
                placeholder="Acciones tomadas o propuestas..."
                className="w-full rounded-lg px-3 py-2 text-sm dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
                value={form.soluciones}
                onChange={(e) => setForm({ ...form, soluciones: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium dark:bg-orange-500/10 bg-orange-50 dark:text-orange-400 text-orange-600 dark:hover:bg-orange-500/20 hover:bg-orange-100 border dark:border-orange-500/20 border-orange-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Guardar registro
            </button>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400 mb-4">
          Historial de bitácora
        </h3>
        <div className="relative space-y-0">
          {sorted.length === 0 && (
            <p className="text-sm dark:text-slate-500 text-slate-400 text-center py-8">
              Sin registros aún
            </p>
          )}
          {sorted.map((r, idx) => (
            <div key={r.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full dark:bg-orange-500 bg-orange-400 border-2 dark:border-slate-950 border-white mt-1 shrink-0" />
                {idx < sorted.length - 1 && (
                  <div className="w-px flex-1 dark:bg-slate-700 bg-slate-200 my-1" />
                )}
              </div>
              {/* Content */}
              <div className={`pb-5 flex-1 ${idx < sorted.length - 1 ? "" : ""}`}>
                <div className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-4">
                  <p className="text-[11px] font-mono font-bold dark:text-orange-400 text-orange-600 mb-1">
                    {r.fecha}
                  </p>
                  <p className="text-sm dark:text-slate-200 text-slate-800 leading-relaxed">
                    {r.descripcion}
                  </p>
                  {r.inconvenientes && r.inconvenientes !== "Ninguno." && r.inconvenientes !== "—" && (
                    <div className="mt-2 p-2 rounded-lg dark:bg-red-500/5 bg-red-50 border dark:border-red-500/10 border-red-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider dark:text-red-400/70 text-red-500 mb-0.5">
                        Inconvenientes
                      </p>
                      <p className="text-xs dark:text-slate-300 text-slate-700">{r.inconvenientes}</p>
                    </div>
                  )}
                  {r.soluciones && r.soluciones !== "—" && (
                    <div className="mt-2 p-2 rounded-lg dark:bg-emerald-500/5 bg-emerald-50 border dark:border-emerald-500/10 border-emerald-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider dark:text-emerald-400/70 text-emerald-600 mb-0.5">
                        Soluciones
                      </p>
                      <p className="text-xs dark:text-slate-300 text-slate-700">{r.soluciones}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Contratista Card ─────────────────────────────────────────────────────────

function ContratistaCard({
  contratista,
  totalPagado,
  onClick,
  onDelete,
}: {
  contratista: Contratista;
  totalPagado: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const pct = contratista.montoPactado > 0
    ? Math.min((totalPagado / contratista.montoPactado) * 100, 100)
    : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="w-full text-left rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-4 hover:dark:bg-slate-800/60 hover:bg-slate-50 transition-colors group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl dark:bg-orange-500/10 bg-orange-50 flex items-center justify-center shrink-0">
            <HardHat className="w-5 h-5 dark:text-orange-400 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold dark:text-slate-100 text-slate-800">{contratista.nombre}</p>
            <p className="text-xs dark:text-slate-400 text-slate-500">{contratista.rubro}</p>
          </div>
        </div>
        {/* Delete / Confirm area */}
        {confirming ? (
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] font-semibold dark:text-red-400 text-red-600 mr-1">¿Eliminar?</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="px-2 py-1 rounded-lg text-[11px] font-bold dark:bg-red-500/15 bg-red-50 dark:text-red-400 text-red-600 dark:hover:bg-red-500/25 hover:bg-red-100 border dark:border-red-500/20 border-red-200 transition-colors"
            >
              Sí, borrar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
              className="px-2 py-1 rounded-lg text-[11px] font-bold dark:bg-slate-700 bg-slate-100 dark:text-slate-300 text-slate-600 hover:dark:bg-slate-600 hover:bg-slate-200 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="p-1.5 rounded-lg dark:text-red-400/40 text-red-300 dark:hover:bg-red-500/10 hover:bg-red-50 dark:hover:text-red-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            title="Eliminar contratista"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11px] dark:text-slate-400 text-slate-500 mb-1.5">
          <span>Pagado: Gs. {fmtGs(totalPagado)}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full dark:bg-slate-700 bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] dark:text-slate-500 text-slate-400 mt-1">
          <span>{contratista.ayudantes.length + 1} persona{(contratista.ayudantes.length + 1) !== 1 ? "s" : ""}</span>
          <span>Total: Gs. {fmtGs(contratista.montoPactado)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ManoObraClientProps {
  backHref: string;
  proyecto?: { id: string; codigo: string; nombre: string };
  stickyTop?: string;
  proyectosDisponibles?: ProyectoSimple[];
  initialContratistas?: ContratistaDB[];
  initialPagosMap?: Record<string, PagoRegistroDB[]>;
}

export function ManoObraClient({
  backHref,
  proyecto,
  stickyTop = "top-0",
  proyectosDisponibles = [],
  initialContratistas,
  initialPagosMap,
}: ManoObraClientProps) {
  const [contratistas, setContratistas] = useState<Contratista[]>(
    initialContratistas?.length
      ? (initialContratistas as unknown as Contratista[])
      : CONTRATISTAS_INICIALES
  );
  const [pagosMap, setPagosMap] = useState<Record<string, PagoRegistro[]>>(
    initialPagosMap && Object.keys(initialPagosMap).length
      ? (initialPagosMap as unknown as Record<string, PagoRegistro[]>)
      : { c1: PAGOS_INICIALES, c2: [] }
  );
  const [bitacoraMap, setBitacoraMap] = useState<Record<string, BitacoraRegistro[]>>(
    initialContratistas?.length
      ? Object.fromEntries(initialContratistas.map((c) => [c.id, []]))
      : { c1: BITACORA_INICIAL, c2: [] }
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ficha" | "cuenta" | "bitacora">("ficha");

  const selected = contratistas.find((c) => c.id === selectedId) ?? null;

  const updateContratista = (updated: Contratista) => {
    setContratistas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const addPago = (contraId: string, pago: PagoRegistro) => {
    setPagosMap((prev) => ({
      ...prev,
      [contraId]: [...(prev[contraId] ?? []), pago],
    }));
  };

  const removePago = (contraId: string, pagoId: string) => {
    setPagosMap((prev) => ({
      ...prev,
      [contraId]: (prev[contraId] ?? []).filter((p) => p.id !== pagoId),
    }));
  };

  const addBitacora = (contraId: string, registro: BitacoraRegistro) => {
    setBitacoraMap((prev) => ({
      ...prev,
      [contraId]: [...(prev[contraId] ?? []), registro],
    }));
  };

  const deleteContratista = (id: string) => {
    setContratistas((prev) => prev.filter((c) => c.id !== id));
    setPagosMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setBitacoraMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (selectedId === id) setSelectedId(null);
  };

  // ── Vista detalle de contratista ────────────────────────────────────────────
  if (selected) {
    const pagos = pagosMap[selected.id] ?? [];
    const bitacora = bitacoraMap[selected.id] ?? [];

    return (
      <div className="flex flex-col min-h-[calc(100vh-52px)] dark:bg-slate-950 bg-slate-50">
        {/* Header detalle */}
        <div className={`sticky ${stickyTop} z-30 dark:bg-slate-950/95 bg-white/95 backdrop-blur-md border-b dark:border-white/[0.06] border-slate-200`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setSelectedId(null)}
              className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 dark:text-slate-400 text-slate-500" />
            </button>
            <div className="w-7 h-7 rounded-lg dark:bg-orange-500/10 bg-orange-50 flex items-center justify-center">
              <HardHat className="w-3.5 h-3.5 dark:text-orange-400 text-orange-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold dark:text-slate-100 text-slate-900 leading-tight">
                {selected.nombre} · {selected.rubro}
              </h2>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">
                Monto pactado: Gs. {fmtGs(selected.montoPactado)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex border-t dark:border-white/[0.04] border-slate-100 overflow-x-auto -mt-px">
            <TabBtn
              active={activeTab === "ficha"}
              onClick={() => setActiveTab("ficha")}
              icon={<Users className="w-3.5 h-3.5" />}
              label="Ficha y Cuadrilla"
            />
            <TabBtn
              active={activeTab === "cuenta"}
              onClick={() => setActiveTab("cuenta")}
              icon={<BarChart2 className="w-3.5 h-3.5" />}
              label="Estado de Cuenta"
            />
            <TabBtn
              active={activeTab === "bitacora"}
              onClick={() => setActiveTab("bitacora")}
              icon={<BookOpen className="w-3.5 h-3.5" />}
              label="Bitácora de Obra"
            />
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
          {activeTab === "ficha" && (
            <TabFicha contratista={selected} onUpdate={updateContratista} />
          )}
          {activeTab === "cuenta" && (
            <TabEstadoCuenta
              contratista={selected}
              pagos={pagos}
              onAddPago={(p) => addPago(selected.id, p)}
              onRemovePago={(id) => removePago(selected.id, id)}
              proyectoId={proyecto?.id ?? ""}
              contratoId={selected.id}
            />
          )}
          {activeTab === "bitacora" && (
            <TabBitacora
              bitacora={bitacora}
              onAdd={(r) => addBitacora(selected.id, r)}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Vista lista de contratistas ─────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] dark:bg-slate-950 bg-slate-50">
      {/* Header lista */}
      <div className={`sticky ${stickyTop} z-30 dark:bg-slate-950/95 bg-white/95 backdrop-blur-md border-b dark:border-white/[0.06] border-slate-200`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 dark:text-slate-400 text-slate-500" />
          </Link>
          <HardHat className="w-4 h-4 dark:text-orange-400 text-orange-600" />
          <div className="flex-1">
            <h1 className="text-sm font-bold dark:text-slate-100 text-slate-900 leading-tight">
              Gestión de Mano de Obra
            </h1>
            <p className="text-xs dark:text-slate-500 text-slate-400">
              {proyecto ? `${proyecto.codigo} · ` : ""}Subcontratos y cuadrillas
            </p>
          </div>
          {!proyecto && proyectosDisponibles.length > 0 && (
            <AsignarProyectoWidget
              proyectos={proyectosDisponibles}
              mode="nav"
              moduloPath="mano-obra"
            />
          )}
          <button
            onClick={() => {
              const newId = uid("c");
              const nuevo: Contratista = {
                id: newId,
                nombre: "Nuevo Contratista",
                documento: "",
                telefono: "",
                rubro: "",
                alcance: "",
                montoPactado: 0,
                retencion: 5,
                ayudantes: [],
              };
              setContratistas((prev) => [...prev, nuevo]);
              setPagosMap((prev) => ({ ...prev, [newId]: [] }));
              setBitacoraMap((prev) => ({ ...prev, [newId]: [] }));
              setSelectedId(newId);
              setActiveTab("ficha");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-orange-500/10 bg-orange-50 dark:text-orange-400 text-orange-600 dark:hover:bg-orange-500/20 hover:bg-orange-100 border dark:border-orange-500/20 border-orange-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo contratista
          </button>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Contratos activos",
              val: contratistas.length,
              unit: "",
              color: "dark:text-orange-400 text-orange-600",
            },
            {
              label: "Total personal",
              val: contratistas.reduce((s, c) => s + c.ayudantes.length + 1, 0),
              unit: "pers.",
              color: "dark:text-blue-400 text-blue-600",
            },
            {
              label: "Total pactado",
              val: `Gs. ${fmtGs(contratistas.reduce((s, c) => s + c.montoPactado, 0))}`,
              unit: "",
              color: "dark:text-teal-400 text-teal-600",
            },
            {
              label: "Total pagado",
              val: `Gs. ${fmtGs(
                Object.values(pagosMap).flat().reduce((s, p) => s + p.monto, 0)
              )}`,
              unit: "",
              color: "dark:text-emerald-400 text-emerald-600",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold mb-0.5">
                {k.label}
              </p>
              <p className={`text-base font-bold tabular-nums leading-tight ${k.color}`}>
                {k.val}
                {k.unit && (
                  <span className="text-[11px] font-normal dark:text-slate-500 text-slate-400 ml-1">
                    {k.unit}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {contratistas.map((c) => {
            const totalPagado = (pagosMap[c.id] ?? []).reduce((s, p) => s + p.monto, 0);
            return (
              <ContratistaCard
                key={c.id}
                contratista={c}
                totalPagado={totalPagado}
                onClick={() => {
                  setSelectedId(c.id);
                  setActiveTab("ficha");
                }}
                onDelete={() => deleteContratista(c.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
