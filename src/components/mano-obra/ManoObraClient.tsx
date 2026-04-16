"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { registrarPagoContrato, eliminarPagoContrato } from "@/app/proyectos/[id]/mano-obra/actions";
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
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "GIRO", label: "Giro" },
  { value: "OTRO", label: "Otro" },
];

function TabEstadoCuenta({
  contratista,
  pagos,
  onAddPago,
  onRemovePago,
  proyectoId,
  contratoId,
  jefeCuadrilla,
}: {
  contratista: Contratista;
  pagos: PagoRegistro[];
  onAddPago: (p: PagoRegistro) => void;
  onRemovePago: (id: string) => void;
  proyectoId: string;
  contratoId: string;
  jefeCuadrilla: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    fecha: "",
    monto: "",
    porcentajeAvance: "",
    metodoPago: "EFECTIVO" as MetodoPago,
  });

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

  const handleAdd = () => {
    const monto = Number(form.monto);
    if (!form.fecha || !monto || !form.porcentajeAvance) return;
    const pctPago = contratista.montoPactado > 0
      ? parseFloat(((monto / contratista.montoPactado) * 100).toFixed(2))
      : 0;
    const optimisticId = uid("p");
    startTransition(async () => {
      try {
        const res = await registrarPagoContrato(proyectoId, contratoId, jefeCuadrilla, {
          fecha: form.fecha,
          monto,
          metodoPago: form.metodoPago,
        });
        onAddPago({
          id: res.id,
          fecha: form.fecha,
          monto,
          porcentajePago: pctPago,
          porcentajeAvance: Number(form.porcentajeAvance),
        });
        toast.success("Pago registrado en Libro Mayor");
      } catch {
        toast.error("Error al registrar el pago");
      }
    });
    setForm({ fecha: "", monto: "", porcentajeAvance: "", metodoPago: "EFECTIVO" });
    void optimisticId;
  };

  return (
    <div className="space-y-6">
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

      {/* Gráfico */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
          <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
            Curvas de Avance y Pago
          </h3>
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

      {/* Tabla de pagos */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
          <h3 className="text-sm font-bold dark:text-slate-100 text-slate-800">
            Registros de Pagos
          </h3>
        </div>

        {/* Formulario agregar */}
        <div className="p-4 border-b dark:border-white/[0.06] border-slate-100">
          <p className="text-[11px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold mb-3">
            Registrar nuevo pago
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] dark:text-slate-500 text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                className="w-full rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] dark:text-slate-500 text-slate-400 mb-1">Monto (Gs)</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                className="w-full rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] dark:text-slate-500 text-slate-400 mb-1">% Avance obra</label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                className="w-full rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                value={form.porcentajeAvance}
                onChange={(e) => setForm({ ...form, porcentajeAvance: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] dark:text-slate-500 text-slate-400 mb-1">Método de pago</label>
              <select
                className="w-full rounded-lg px-2.5 py-1.5 text-xs dark:bg-slate-800 bg-slate-50 dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                value={form.metodoPago}
                onChange={(e) => setForm({ ...form, metodoPago: e.target.value as MetodoPago })}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-orange-500/10 bg-orange-50 dark:text-orange-400 text-orange-600 dark:hover:bg-orange-500/20 hover:bg-orange-100 border dark:border-orange-500/20 border-orange-200 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {isPending ? "Guardando…" : "Agregar pago"}
              </button>
            </div>
          </div>
          {form.monto && contratista.montoPactado > 0 && (
            <p className="text-[11px] dark:text-teal-400 text-teal-600 mt-2">
              = {((Number(form.monto) / contratista.montoPactado) * 100).toFixed(2)}% del monto pactado
            </p>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="dark:bg-slate-800/60 bg-slate-50">
                <th className="px-4 py-2 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Fecha</th>
                <th className="px-4 py-2 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Monto (Gs)</th>
                <th className="px-4 py-2 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">% del Total</th>
                <th className="px-4 py-2 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">% Avance</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center dark:text-slate-500 text-slate-400">
                    Sin pagos registrados
                  </td>
                </tr>
              )}
              {pagos.map((p) => (
                <tr
                  key={p.id}
                  className="border-t dark:border-white/[0.04] border-slate-100 dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-2.5 dark:text-slate-300 text-slate-700">{p.fecha}</td>
                  <td className="px-4 py-2.5 text-right dark:text-slate-100 text-slate-800 font-mono tabular-nums">
                    {fmtGs(p.monto)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700">
                      {p.porcentajePago}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-blue-500/10 bg-blue-50 dark:text-blue-400 text-blue-700">
                      {p.porcentajeAvance}%
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
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
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
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
              jefeCuadrilla={selected.nombre}
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
