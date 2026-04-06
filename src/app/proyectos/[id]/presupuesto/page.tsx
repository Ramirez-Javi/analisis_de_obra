"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, PackageOpen } from "lucide-react";
import type { RubroProyecto, InsumoRubro, RubroMaestroMock } from "@/components/presupuesto/types";
import {
  RUBROS_MAESTROS_MOCK,
  calcSubtotalRubro,
  calcTotalInsumo,
  fmtGs,
} from "@/components/presupuesto/types";
import { RubroRow } from "@/components/presupuesto/RubroRow";
import { PresupuestoToolbar } from "@/components/presupuesto/PresupuestoToolbar";

// ── Proyecto simulado (luego vendrá de Prisma por params.id) ──
const PROYECTO_MOCK = {
  id: "mock-001",
  codigo: "PRY-2026-001",
  nombre: "Residencia Martínez",
};

// ── Tarjeta totalizadora ──────────────────────────────────────
interface TotCardProps {
  label: string;
  value: number;
  accent: string;
  sub?: string;
}
function TotCard({ label, value, accent, sub }: TotCardProps) {
  return (
    <div className="flex-1 min-w-[130px] rounded-xl px-4 py-3 dark:bg-slate-900/60 bg-white border dark:border-white/[0.06] border-slate-200 shadow-sm dark:shadow-none">
      <p className="text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold mb-0.5">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums leading-tight ${accent}`}>
        Gs. {fmtGs(value)}
      </p>
      {sub && (
        <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ── Generador de ID local ─────────────────────────────────────
let _seq = 0;
function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${++_seq}`;
}

// ── Componente cliente del módulo ─────────────────────────────
export default function PresupuestoPage({
  params,
}: {
  params: { id: string };
}) {
  const [rubros, setRubros] = useState<RubroProyecto[]>([]);

  // ── Totalizadores ──────────────────────────────────────────
  const totalMat = rubros.reduce(
    (acc, r) =>
      acc +
      r.insumos
        .filter((i) => !i.esManodeObra)
        .reduce((a, i) => a + calcTotalInsumo(r.cantidadObra, i), 0),
    0
  );
  const totalMO = rubros.reduce(
    (acc, r) =>
      acc +
      r.insumos
        .filter((i) => i.esManodeObra)
        .reduce((a, i) => a + calcTotalInsumo(r.cantidadObra, i), 0),
    0
  );
  const totalCD = totalMat + totalMO;

  // ── Acciones sobre rubros ──────────────────────────────────
  const handleAgregarRubro = useCallback((maestro: RubroMaestroMock) => {
    setRubros((prev) => [
      ...prev,
      {
        instanceId: uid("rubro"),
        rubroMaestroId: maestro.id,
        codigo: maestro.codigo,
        nombre: maestro.nombre,
        unidad: maestro.unidad,
        cantidadObra: 0,
        expanded: true,
        // Deep-copy los insumos para que sean editables independientemente
        insumos: maestro.insumos.map((ins) => ({
          ...ins,
          id: uid("ins"),
        })),
      },
    ]);
  }, []);

  const handleCrearPersonalizado = useCallback(() => {
    setRubros((prev) => [
      ...prev,
      {
        instanceId: uid("rubro"),
        rubroMaestroId: "",
        codigo: `PERS-${String(prev.length + 1).padStart(3, "0")}`,
        nombre: "Rubro personalizado",
        unidad: "u",
        cantidadObra: 0,
        expanded: true,
        insumos: [],
      },
    ]);
  }, []);

  const handleToggle = useCallback((instanceId: string) => {
    setRubros((prev) =>
      prev.map((r) =>
        r.instanceId === instanceId ? { ...r, expanded: !r.expanded } : r
      )
    );
  }, []);

  const handleCantidadChange = useCallback((instanceId: string, value: number) => {
    setRubros((prev) =>
      prev.map((r) =>
        r.instanceId === instanceId ? { ...r, cantidadObra: value } : r
      )
    );
  }, []);

  const handleInsumoChange = useCallback(
    (instanceId: string, insumoId: string, field: keyof InsumoRubro, value: number) => {
      setRubros((prev) =>
        prev.map((r) => {
          if (r.instanceId !== instanceId) return r;
          return {
            ...r,
            insumos: r.insumos.map((ins) =>
              ins.id === insumoId ? { ...ins, [field]: value } : ins
            ),
          };
        })
      );
    },
    []
  );

  const handleDeleteInsumo = useCallback((instanceId: string, insumoId: string) => {
    setRubros((prev) =>
      prev.map((r) => {
        if (r.instanceId !== instanceId) return r;
        return {
          ...r,
          insumos: r.insumos.filter((ins) => ins.id !== insumoId),
        };
      })
    );
  }, []);

  const handleAddInsumo = useCallback((instanceId: string) => {
    setRubros((prev) =>
      prev.map((r) => {
        if (r.instanceId !== instanceId) return r;
        return {
          ...r,
          insumos: [
            ...r.insumos,
            {
              id: uid("ins"),
              nombre: "Nuevo insumo",
              unidad: "u",
              rendimiento: 1,
              porcPerdida: 0,
              precioUnitario: 0,
              esManodeObra: false,
            },
          ],
        };
      })
    );
  }, []);

  const handleDeleteRubro = useCallback((instanceId: string) => {
    setRubros((prev) => prev.filter((r) => r.instanceId !== instanceId));
  }, []);

  return (
    <div className="flex flex-col min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      {/* ── Cabecera sticky ─────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/90 bg-white/90 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Fila superior: breadcrumb */}
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
            >
              <ArrowLeft size={13} />
              Centro de Mando
            </Link>
            <div className="w-px h-3.5 dark:bg-white/10 bg-slate-200" />
            <Link
              href={`/proyectos/${params.id}`}
              className="text-xs dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
            >
              {PROYECTO_MOCK.codigo}
            </Link>
            <div className="w-px h-3.5 dark:bg-white/10 bg-slate-200" />
            <div className="flex items-center gap-2">
              <Calculator size={13} className="dark:text-teal-400 text-teal-600" />
              <div className="leading-none">
                <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                  Cómputo y Presupuesto
                </p>
                <p className="text-[11px] dark:text-slate-500 text-slate-400">
                  {PROYECTO_MOCK.nombre} · Módulo 2
                </p>
              </div>
            </div>
          </div>

          {/* Fila inferior: totalizadores */}
          <div className="flex flex-wrap gap-3">
            <TotCard
              label="Costo Materiales"
              value={totalMat}
              accent="dark:text-blue-400 text-blue-700"
            />
            <TotCard
              label="Costo Mano de Obra"
              value={totalMO}
              accent="dark:text-amber-400 text-amber-700"
            />
            <TotCard
              label="Costo Directo Total"
              value={totalCD}
              accent="dark:text-teal-400 text-teal-700"
              sub={`${rubros.length} rubro${rubros.length !== 1 ? "s" : ""} cargado${rubros.length !== 1 ? "s" : ""}`}
            />
          </div>
        </div>
      </div>

      {/* ── Cuerpo principal ─────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Barra de herramientas */}
        <PresupuestoToolbar
          rubrosMaestros={RUBROS_MAESTROS_MOCK}
          onAgregarRubro={handleAgregarRubro}
          onCrearPersonalizado={handleCrearPersonalizado}
        />

        {/* Lista de rubros */}
        {rubros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border-2 border-dashed dark:border-white/[0.06] border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
              <PackageOpen size={26} className="dark:text-teal-400 text-teal-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium dark:text-slate-300 text-slate-600">
                No hay rubros en el presupuesto
              </p>
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
                Usa el buscador para agregar rubros de la base maestra
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rubros.map((rubro, index) => (
              <RubroRow
                key={rubro.instanceId}
                rubro={rubro}
                index={index}
                onToggle={handleToggle}
                onCantidadChange={handleCantidadChange}
                onInsumoChange={handleInsumoChange}
                onDeleteInsumo={handleDeleteInsumo}
                onAddInsumo={handleAddInsumo}
                onDeleteRubro={handleDeleteRubro}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
