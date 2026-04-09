"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Truck, Wrench, PackageOpen, Plus, Trash2 } from "lucide-react";
import { AsignarProyectoWidget } from "@/components/shared/AsignarProyectoWidget";
import type { ProyectoSimple } from "@/app/actions/proyectos";

// ─── Types ────────────────────────────────────────────────────────────────────

type Unidad = "Horas" | "Días" | "Meses" | "Viajes" | "Global" | "Unidad";

interface EquipoRubro {
  id: string;
  rubroId: string;
  descripcion: string;
  unidad: Unidad;
  cantidad: number;
  costoUnitario: number;
}

interface GastoLogistico {
  id: string;
  descripcion: string;
  unidad: Unidad;
  cantidad: number;
  costoUnitario: number;
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const RUBROS_MOCK = [
  { id: "r1", nombre: "Excavación" },
  { id: "r2", nombre: "Losa de HºAº" },
  { id: "r3", nombre: "Mampostería" },
  { id: "r4", nombre: "Vigas y Columnas" },
  { id: "r5", nombre: "Revestimientos" },
  { id: "r6", nombre: "Cubierta" },
  { id: "r7", nombre: "Instalaciones Sanitarias" },
  { id: "r8", nombre: "Instalaciones Eléctricas" },
];

const UNIDADES: Unidad[] = ["Horas", "Días", "Meses", "Viajes", "Global", "Unidad"];

const EQUIPOS_INICIALES: EquipoRubro[] = [
  { id: "e1", rubroId: "r1", descripcion: "Retroexcavadora CAT 320", unidad: "Días", cantidad: 3, costoUnitario: 1_500_000 },
  { id: "e2", rubroId: "r2", descripcion: "Vibrador de concreto", unidad: "Días", cantidad: 8, costoUnitario: 120_000 },
  { id: "e3", rubroId: "r2", descripcion: "Hormigonera 180L", unidad: "Días", cantidad: 15, costoUnitario: 80_000 },
];

const GASTOS_INICIALES: GastoLogistico[] = [
  { id: "g1", descripcion: "Flete de materiales (general)", unidad: "Viajes", cantidad: 6, costoUnitario: 350_000 },
  { id: "g2", descripcion: "Baño portátil", unidad: "Meses", cantidad: 4, costoUnitario: 280_000 },
  { id: "g3", descripcion: "Volquete de escombros", unidad: "Viajes", cantidad: 4, costoUnitario: 220_000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${++_seq}`;
}

function fmtGs(n: number) {
  return Math.round(n).toLocaleString("es-PY");
}

function subtotal(item: { cantidad: number; costoUnitario: number }) {
  return item.cantidad * item.costoUnitario;
}

// ─── Input numérico inline ────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  min = 0,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      value={value || ""}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full rounded-md px-2 py-1.5 text-xs tabular-nums dark:bg-slate-800 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${className}`}
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md px-2 py-1.5 text-xs dark:bg-slate-800 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${className}`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md px-2 py-1.5 text-xs dark:bg-slate-800 bg-white dark:border-white/[0.08] border-slate-200 border dark:text-slate-100 text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-500/40 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Tab btn ──────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon,
  label,
  total,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  total: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-yellow-500 dark:text-yellow-400 text-yellow-600"
          : "border-transparent dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
          active
            ? "dark:bg-yellow-500/10 bg-yellow-50 dark:text-yellow-400 text-yellow-700"
            : "dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400"
        }`}
      >
        Gs. {fmtGs(total)}
      </span>
    </button>
  );
}

// ─── TAB 1: Equipos asignados a rubros ───────────────────────────────────────

function TabEquipos({
  equipos,
  setEquipos,
}: {
  equipos: EquipoRubro[];
  setEquipos: React.Dispatch<React.SetStateAction<EquipoRubro[]>>;
}) {
  const rubroOpts = RUBROS_MOCK.map((r) => ({ value: r.id, label: r.nombre }));
  const unidadOpts = UNIDADES.map((u) => ({ value: u, label: u }));

  const update = (id: string, field: keyof EquipoRubro, value: string | number) => {
    setEquipos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const add = () => {
    setEquipos((prev) => [
      ...prev,
      {
        id: uid("e"),
        rubroId: RUBROS_MOCK[0].id,
        descripcion: "",
        unidad: "Días",
        cantidad: 1,
        costoUnitario: 0,
      },
    ]);
  };

  const remove = (id: string) => {
    setEquipos((prev) => prev.filter((e) => e.id !== id));
  };

  // Agrupar por rubro para mostrar subtotales
  const grouped = useMemo(() => {
    const map = new Map<string, EquipoRubro[]>();
    for (const e of equipos) {
      const arr = map.get(e.rubroId) ?? [];
      arr.push(e);
      map.set(e.rubroId, arr);
    }
    return map;
  }, [equipos]);

  return (
    <div className="space-y-5">
      {/* Tabla */}
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        {/* Cabecera de tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="dark:bg-slate-800/80 bg-slate-50 border-b dark:border-white/[0.06] border-slate-200">
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[160px]">
                  Rubro vinculado
                </th>
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  Descripción del equipo
                </th>
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[100px]">
                  Unidad
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[80px]">
                  Cant.
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Costo Unit. (Gs)
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Subtotal (Gs)
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {equipos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center dark:text-slate-500 text-slate-400">
                    Sin equipos asignados
                  </td>
                </tr>
              )}
              {equipos.map((e) => (
                <tr
                  key={e.id}
                  className="border-t dark:border-white/[0.04] border-slate-100 dark:hover:bg-slate-800/20 hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-3 py-2">
                    <SelectInput
                      value={e.rubroId}
                      onChange={(v) => update(e.id, "rubroId", v)}
                      options={rubroOpts}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <TextInput
                      value={e.descripcion}
                      onChange={(v) => update(e.id, "descripcion", v)}
                      placeholder="Ej: Retroexcavadora, Vibrador…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <SelectInput
                      value={e.unidad}
                      onChange={(v) => update(e.id, "unidad", v as Unidad)}
                      options={unidadOpts}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={e.cantidad}
                      onChange={(v) => update(e.id, "cantidad", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={e.costoUnitario}
                      onChange={(v) => update(e.id, "costoUnitario", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-semibold text-xs dark:text-yellow-400 text-yellow-600 tabular-nums">
                      {fmtGs(subtotal(e))}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => remove(e.id)}
                      className="p-1 rounded-md dark:text-red-400/50 text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {equipos.length > 0 && (
              <tfoot>
                <tr className="border-t dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/40 bg-slate-50">
                  <td colSpan={5} className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                    Total equipos
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-sm dark:text-yellow-400 text-yellow-600 tabular-nums">
                    {fmtGs(equipos.reduce((s, e) => s + subtotal(e), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Botón agregar */}
      <button
        onClick={add}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium dark:bg-yellow-500/10 bg-yellow-50 dark:text-yellow-400 text-yellow-600 dark:hover:bg-yellow-500/20 hover:bg-yellow-100 border dark:border-yellow-500/20 border-yellow-200 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Asignar equipo
      </button>

      {/* Resumen por rubro */}
      {grouped.size > 0 && (
        <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">
              Resumen por rubro
            </h3>
          </div>
          <div className="divide-y dark:divide-white/[0.04] divide-slate-100">
            {Array.from(grouped.entries()).map(([rubroId, items]) => {
              const rubro = RUBROS_MOCK.find((r) => r.id === rubroId);
              const total = items.reduce((s, e) => s + subtotal(e), 0);
              return (
                <div key={rubroId} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs font-medium dark:text-slate-200 text-slate-800">
                      {rubro?.nombre ?? rubroId}
                    </p>
                    <p className="text-[10px] dark:text-slate-500 text-slate-400">
                      {items.length} equipo{items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold dark:text-yellow-400 text-yellow-600 tabular-nums">
                    Gs. {fmtGs(total)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── TAB 2: Logística y costos globales ──────────────────────────────────────

function TabLogistica({
  gastos,
  setGastos,
}: {
  gastos: GastoLogistico[];
  setGastos: React.Dispatch<React.SetStateAction<GastoLogistico[]>>;
}) {
  const unidadOpts = UNIDADES.map((u) => ({ value: u, label: u }));

  const update = (id: string, field: keyof GastoLogistico, value: string | number) => {
    setGastos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const add = () => {
    setGastos((prev) => [
      ...prev,
      { id: uid("g"), descripcion: "", unidad: "Global", cantidad: 1, costoUnitario: 0 },
    ]);
  };

  const remove = (id: string) => {
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[580px]">
            <thead>
              <tr className="dark:bg-slate-800/80 bg-slate-50 border-b dark:border-white/[0.06] border-slate-200">
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  Descripción
                </th>
                <th className="px-3 py-2.5 text-left dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[100px]">
                  Unidad
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[80px]">
                  Cant.
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Costo Unit. (Gs)
                </th>
                <th className="px-3 py-2.5 text-right dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-[130px]">
                  Subtotal (Gs)
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center dark:text-slate-500 text-slate-400">
                    Sin gastos logísticos registrados
                  </td>
                </tr>
              )}
              {gastos.map((g) => (
                <tr
                  key={g.id}
                  className="border-t dark:border-white/[0.04] border-slate-100 dark:hover:bg-slate-800/20 hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-3 py-2">
                    <TextInput
                      value={g.descripcion}
                      onChange={(v) => update(g.id, "descripcion", v)}
                      placeholder="Ej: Fletes, Volquete, Baño portátil…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <SelectInput
                      value={g.unidad}
                      onChange={(v) => update(g.id, "unidad", v as Unidad)}
                      options={unidadOpts}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={g.cantidad}
                      onChange={(v) => update(g.id, "cantidad", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput
                      value={g.costoUnitario}
                      onChange={(v) => update(g.id, "costoUnitario", v)}
                      min={0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-semibold text-xs dark:text-yellow-400 text-yellow-600 tabular-nums">
                      {fmtGs(subtotal(g))}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => remove(g.id)}
                      className="p-1 rounded-md dark:text-red-400/50 text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {gastos.length > 0 && (
              <tfoot>
                <tr className="border-t dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/40 bg-slate-50">
                  <td colSpan={4} className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                    Total logística
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-sm dark:text-yellow-400 text-yellow-600 tabular-nums">
                    {fmtGs(gastos.reduce((s, g) => s + subtotal(g), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <button
        onClick={add}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium dark:bg-yellow-500/10 bg-yellow-50 dark:text-yellow-400 text-yellow-600 dark:hover:bg-yellow-500/20 hover:bg-yellow-100 border dark:border-yellow-500/20 border-yellow-200 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Agregar gasto logístico
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface LogisticaClientProps {
  backHref: string;
  proyecto?: { id: string; codigo: string; nombre: string };
  stickyTop?: string;
  proyectosDisponibles?: ProyectoSimple[];
}

export function LogisticaClient({
  backHref,
  proyecto,
  stickyTop = "top-0",
  proyectosDisponibles = [],
}: LogisticaClientProps) {
  const [equipos, setEquipos] = useState<EquipoRubro[]>(EQUIPOS_INICIALES);
  const [gastos, setGastos] = useState<GastoLogistico[]>(GASTOS_INICIALES);
  const [activeTab, setActiveTab] = useState<"equipos" | "logistica">("equipos");

  const totalEquipos = useMemo(
    () => equipos.reduce((s, e) => s + subtotal(e), 0),
    [equipos]
  );
  const totalLogistica = useMemo(
    () => gastos.reduce((s, g) => s + subtotal(g), 0),
    [gastos]
  );
  const totalGlobal = totalEquipos + totalLogistica;

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] dark:bg-slate-950 bg-slate-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className={`sticky ${stickyTop} z-30 dark:bg-slate-950/95 bg-white/95 backdrop-blur-md border-b dark:border-white/[0.06] border-slate-200`}
      >
        {/* Breadcrumb + título */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 dark:text-slate-400 text-slate-500" />
          </Link>
          <div className="w-7 h-7 rounded-lg dark:bg-yellow-500/10 bg-yellow-50 flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5 dark:text-yellow-400 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold dark:text-slate-100 text-slate-900 leading-tight">
              Maquinarias y Logística
            </h1>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              {proyecto ? `${proyecto.codigo} · ` : ""}Costos indirectos de obra
            </p>
          </div>

          {!proyecto && proyectosDisponibles.length > 0 && (
            <AsignarProyectoWidget
              proyectos={proyectosDisponibles}
              mode="nav"
              moduloPath="logistica"
            />
          )}

          {/* KPI total global */}
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold">
              Total Logística
            </p>
            <p className="text-base font-bold tabular-nums dark:text-yellow-400 text-yellow-600 leading-tight">
              Gs. {fmtGs(totalGlobal)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex border-t dark:border-white/[0.04] border-slate-100 overflow-x-auto -mt-px">
          <TabBtn
            active={activeTab === "equipos"}
            onClick={() => setActiveTab("equipos")}
            icon={<Wrench className="w-3.5 h-3.5" />}
            label="Equipos por Rubro"
            total={totalEquipos}
          />
          <TabBtn
            active={activeTab === "logistica"}
            onClick={() => setActiveTab("logistica")}
            icon={<PackageOpen className="w-3.5 h-3.5" />}
            label="Logística Global"
            total={totalLogistica}
          />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Equipos asignados",
              val: equipos.length,
              unit: "items",
              color: "dark:text-yellow-400 text-yellow-600",
            },
            {
              label: "Gastos logísticos",
              val: gastos.length,
              unit: "items",
              color: "dark:text-amber-400 text-amber-600",
            },
            {
              label: "Subtotal equipos",
              val: `Gs. ${fmtGs(totalEquipos)}`,
              unit: "",
              color: "dark:text-yellow-400 text-yellow-600",
            },
            {
              label: "Subtotal logística",
              val: `Gs. ${fmtGs(totalLogistica)}`,
              unit: "",
              color: "dark:text-amber-400 text-amber-600",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold mb-0.5">
                {k.label}
              </p>
              <p className={`text-sm font-bold tabular-nums leading-tight ${k.color}`}>
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

        {/* Tab activo */}
        {activeTab === "equipos" ? (
          <TabEquipos equipos={equipos} setEquipos={setEquipos} />
        ) : (
          <TabLogistica gastos={gastos} setGastos={setGastos} />
        )}
      </div>
    </div>
  );
}
