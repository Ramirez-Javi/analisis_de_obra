"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  GripVertical,
  Plus,
  HardHat,
  Package,
} from "lucide-react";
import type { RubroProyecto, InsumoRubro } from "./types";
import {
  calcCantidadReal,
  calcTotalInsumo,
  calcPrecioUnitarioRubro,
  calcSubtotalRubro,
  fmtGs,
  fmtNum,
} from "./types";

// ── Input numérico inline ────────────────────────────────────
const numCls =
  "w-full bg-transparent text-right text-xs dark:text-slate-100 text-slate-800 " +
  "focus:outline-none focus:ring-1 focus:ring-teal-500/40 rounded px-1 py-0.5 " +
  "dark:hover:bg-slate-700/60 hover:bg-slate-100 transition-colors duration-100";

interface NumInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: string;
  decimals?: number;
}

function NumInput({ value, onChange, min = 0, step = "any", decimals = 2 }: NumInputProps) {
  const [raw, setRaw] = useState<string | null>(null);
  return (
    <input
      type="number"
      min={min}
      step={step}
      className={numCls}
      value={raw ?? fmtNum(value, decimals).replace(/\./g, "").replace(",", ".")}
      onChange={(e) => {
        setRaw(e.target.value);
        const n = parseFloat(e.target.value);
        if (!isNaN(n) && n >= min) onChange(n);
      }}
      onBlur={() => setRaw(null)}
    />
  );
}

// ── Fila de insumo ────────────────────────────────────────────
interface InsumoRowProps {
  insumo: InsumoRubro;
  cantidadObra: number;
  onChange: (id: string, field: keyof InsumoRubro, value: number) => void;
  onChangeText: (id: string, field: "nombre" | "unidad", value: string) => void;
  onDelete: (id: string) => void;
}

function InsumoRow({ insumo, cantidadObra, onChange, onChangeText, onDelete }: InsumoRowProps) {
  const cantReal = calcCantidadReal(cantidadObra, insumo.rendimiento, insumo.porcPerdida);
  const total = calcTotalInsumo(cantidadObra, insumo);

  return (
    <tr className="group border-b dark:border-white/[0.05] border-slate-100 last:border-0">
      {/* Nombre */}
      <td className="pl-4 pr-2 py-2.5 text-xs dark:text-slate-300 text-slate-600 min-w-[150px]">
        <div className="flex items-center gap-1.5">
          {insumo.esManodeObra ? (
            <HardHat size={11} className="dark:text-amber-400 text-amber-600 shrink-0" />
          ) : (
            <Package size={11} className="dark:text-blue-400 text-blue-500 shrink-0" />
          )}
          <input
            type="text"
            value={insumo.nombre}
            onChange={(e) => onChangeText(insumo.id, "nombre", e.target.value)}
            className="bg-transparent text-xs dark:text-slate-100 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/40 rounded px-1 py-0.5 dark:hover:bg-slate-700/60 hover:bg-slate-100 transition-colors duration-100 w-full min-w-[110px]"
          />
        </div>
      </td>
      {/* Unidad */}
      <td className="px-2 py-2.5 text-xs text-center dark:text-slate-400 text-slate-500 w-16">
        <input
          type="text"
          value={insumo.unidad}
          onChange={(e) => onChangeText(insumo.id, "unidad", e.target.value)}
          className="bg-transparent text-xs dark:text-slate-400 text-slate-500 text-center focus:outline-none focus:ring-1 focus:ring-teal-500/40 rounded px-1 py-0.5 dark:hover:bg-slate-700/60 hover:bg-slate-100 transition-colors duration-100 w-full"
        />
      </td>
      {/* Rendimiento */}
      <td className="px-2 py-2.5 w-24">
        <NumInput
          value={insumo.rendimiento}
          onChange={(v) => onChange(insumo.id, "rendimiento", v)}
          min={0.0001}
          decimals={4}
        />
      </td>
      {/* % Desperdicio */}
      <td className="px-2 py-2.5 w-20">
        <div className="flex items-center gap-0.5">
          <NumInput
            value={insumo.porcPerdida}
            onChange={(v) => onChange(insumo.id, "porcPerdida", v)}
            min={0}
            decimals={1}
          />
          <span className="text-xs dark:text-slate-500 text-slate-400">%</span>
        </div>
      </td>
      {/* Cantidad Real (calculada) */}
      <td className="px-2 py-2.5 text-xs text-right dark:text-slate-300 text-slate-600 w-28 tabular-nums">
        {fmtNum(cantReal, 3)} {insumo.unidad}
      </td>
      {/* Precio Unitario */}
      <td className="px-2 py-2.5 w-28">
        <NumInput
          value={insumo.precioUnitario}
          onChange={(v) => onChange(insumo.id, "precioUnitario", v)}
          min={0}
          step="1"
          decimals={0}
        />
      </td>
      {/* Total */}
      <td className="px-2 py-2.5 pr-4 text-xs text-right font-medium dark:text-teal-400 text-teal-700 w-32 tabular-nums">
        Gs. {fmtGs(total)}
      </td>
      {/* Eliminar */}
      <td className="pr-3 py-2.5 w-8">
        <button
          type="button"
          onClick={() => onDelete(insumo.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded
                     dark:text-slate-500 text-slate-400 dark:hover:text-red-400 hover:text-red-500"
          title="Eliminar insumo"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// ── Tabla de insumos (receta expandida) ──────────────────────
interface InsumosTableProps {
  rubro: RubroProyecto;
  onChange: (id: string, field: keyof InsumoRubro, value: number) => void;
  onChangeText: (id: string, field: "nombre" | "unidad", value: string) => void;
  onDeleteInsumo: (id: string) => void;
  onAddInsumo: () => void;
}

function InsumosTable({ rubro, onChange, onChangeText, onDeleteInsumo, onAddInsumo }: InsumosTableProps) {
  const totalMat = rubro.insumos
    .filter((i) => !i.esManodeObra)
    .reduce((acc, i) => acc + calcTotalInsumo(rubro.cantidadObra, i), 0);
  const totalMO = rubro.insumos
    .filter((i) => i.esManodeObra)
    .reduce((acc, i) => acc + calcTotalInsumo(rubro.cantidadObra, i), 0);

  return (
    <div className="dark:bg-slate-950/40 bg-slate-50/80 border-t dark:border-white/[0.05] border-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b dark:border-white/[0.06] border-slate-200">
              <th className="pl-4 pr-2 py-2 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold">
                Insumo
              </th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold text-center w-16">
                Unidad
              </th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold text-right w-24">
                Rendimiento
              </th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold text-right w-20">
                % Desp.
              </th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold text-right w-28">
                Cant. Real
              </th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold text-right w-28">
                P. Unit. (Gs.)
              </th>
              <th className="px-2 py-2 pr-4 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 font-semibold text-right w-32">
                Total (Gs.)
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rubro.insumos.map((ins) => (
              <InsumoRow
                key={ins.id}
                insumo={ins}
                cantidadObra={rubro.cantidadObra}
                onChange={onChange}
                onChangeText={onChangeText}
                onDelete={onDeleteInsumo}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer de la tabla */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t dark:border-white/[0.05] border-slate-100">
        <button
          type="button"
          onClick={onAddInsumo}
          className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500
                     dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
        >
          <Plus size={13} />
          Agregar insumo
        </button>
        <div className="flex items-center gap-5 text-xs">
          <span className="dark:text-blue-400 text-blue-600">
            <span className="dark:text-slate-500 text-slate-400">Materiales:</span>{" "}
            Gs. {fmtGs(totalMat)}
          </span>
          <span className="dark:text-amber-400 text-amber-600">
            <span className="dark:text-slate-500 text-slate-400">M.O.:</span>{" "}
            Gs. {fmtGs(totalMO)}
          </span>
          <span className="font-semibold dark:text-teal-400 text-teal-700">
            <span className="dark:text-slate-400 text-slate-500">CD Rubro:</span>{" "}
            Gs. {fmtGs(totalMat + totalMO)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta principal del rubro ──────────────────────────────
export interface RubroRowProps {
  rubro: RubroProyecto;
  index: number;
  onToggle: (instanceId: string) => void;
  onCantidadChange: (instanceId: string, value: number) => void;
  onRubroChange?: (instanceId: string, field: "nombre" | "codigo" | "unidad", value: string) => void;
  onInsumoChange: (instanceId: string, insumoId: string, field: keyof InsumoRubro, value: number) => void;
  onInsumoChangeText: (instanceId: string, insumoId: string, field: "nombre" | "unidad", value: string) => void;
  onDeleteInsumo: (instanceId: string, insumoId: string) => void;
  onAddInsumo: (instanceId: string) => void;
  onDeleteRubro: (instanceId: string) => void;
}

export function RubroRow({
  rubro,
  index,
  onToggle,
  onCantidadChange,
  onRubroChange,
  onInsumoChange,
  onInsumoChangeText,
  onDeleteInsumo,
  onAddInsumo,
  onDeleteRubro,
}: RubroRowProps) {
  const pUnitario = calcPrecioUnitarioRubro(rubro);
  const subtotal = calcSubtotalRubro(rubro);

  return (
    <div className="rounded-xl overflow-hidden border dark:border-white/[0.07] border-slate-200 shadow-sm dark:shadow-none transition-all duration-200">
      {/* Fila principal (nivel 1) */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer
                   dark:bg-slate-900 bg-white
                   dark:hover:bg-slate-800/60 hover:bg-slate-50
                   transition-colors duration-150 group"
      >
        {/* Grip */}
        <div className="dark:text-slate-700 text-slate-300 shrink-0">
          <GripVertical size={14} />
        </div>

        {/* Número */}
        <div className="w-6 h-6 rounded-md bg-gradient-to-br dark:from-slate-700 dark:to-slate-800 from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold dark:text-slate-400 text-slate-500">{index + 1}</span>
        </div>

        {/* Código + Nombre */}
        <div
          className="flex-1 min-w-0 flex items-center gap-2"
          onClick={() => !rubro.rubroMaestroId && onToggle(rubro.instanceId)}
        >
          {rubro.rubroMaestroId === "" ? (
            <input
              value={rubro.codigo}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onRubroChange?.(rubro.instanceId, "codigo", e.target.value)}
              className="text-[10px] font-mono w-20 bg-transparent border-b dark:border-white/20 border-slate-300 focus:outline-none dark:text-slate-400 text-slate-500 shrink-0"
            />
          ) : (
            <span
              className="text-[10px] font-mono dark:text-slate-500 text-slate-400 shrink-0"
              onClick={() => onToggle(rubro.instanceId)}
            >
              {rubro.codigo}
            </span>
          )}
          {rubro.rubroMaestroId === "" ? (
            <input
              value={rubro.nombre}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onRubroChange?.(rubro.instanceId, "nombre", e.target.value)}
              className="text-sm font-medium flex-1 min-w-0 bg-transparent border-b dark:border-white/20 border-slate-300 focus:outline-none dark:text-slate-100 text-slate-800"
            />
          ) : (
            <span
              className="text-sm font-medium dark:text-slate-100 text-slate-800 truncate"
              onClick={() => onToggle(rubro.instanceId)}
            >
              {rubro.nombre}
            </span>
          )}
        </div>

        {/* Cantidad en obra */}
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={0}
            step="any"
            value={rubro.cantidadObra || ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0) onCantidadChange(rubro.instanceId, v);
            }}
            placeholder="0"
            className="w-24 text-right rounded-lg px-2.5 py-1.5 text-sm font-medium
                       dark:bg-slate-800 bg-slate-100
                       dark:border dark:border-white/[0.08] border border-slate-200
                       dark:text-slate-100 text-slate-800
                       focus:outline-none focus:ring-2 dark:focus:ring-teal-500/40 focus:ring-teal-500/30
                       transition-colors duration-150"
            onClick={(e) => e.stopPropagation()}
          />
          {rubro.rubroMaestroId === "" ? (
            <input
              value={rubro.unidad}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onRubroChange?.(rubro.instanceId, "unidad", e.target.value)}
              className="w-10 text-xs text-center bg-transparent border-b dark:border-white/20 border-slate-300 focus:outline-none dark:text-slate-400 text-slate-500 shrink-0"
            />
          ) : (
            <span className="text-xs dark:text-slate-500 text-slate-400 w-8 shrink-0">{rubro.unidad}</span>
          )}
        </div>

        {/* Precio unitario */}
        <div className="w-36 text-right shrink-0" onClick={() => onToggle(rubro.instanceId)}>
          <p className="text-[10px] dark:text-slate-500 text-slate-400">P. Unitario</p>
          <p className="text-sm tabular-nums font-medium dark:text-slate-300 text-slate-600">
            Gs. {fmtGs(pUnitario)}
          </p>
        </div>

        {/* Subtotal */}
        <div
          className="w-40 text-right shrink-0"
          onClick={() => onToggle(rubro.instanceId)}
        >
          <p className="text-[10px] dark:text-slate-500 text-slate-400">Subtotal Rubro</p>
          <p className="text-sm tabular-nums font-semibold dark:text-teal-400 text-teal-700">
            Gs. {fmtGs(subtotal)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDeleteRubro(rubro.instanceId)}
            className="p-1.5 rounded-lg dark:text-slate-600 text-slate-300
                       dark:hover:text-red-400 hover:text-red-500
                       dark:hover:bg-red-500/10 hover:bg-red-50
                       opacity-0 group-hover:opacity-100 transition-all duration-150"
            title="Eliminar rubro"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => onToggle(rubro.instanceId)}
            className="p-1.5 rounded-lg dark:text-slate-500 text-slate-400
                       dark:hover:text-slate-300 hover:text-slate-600 transition-colors duration-150"
          >
            {rubro.expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </div>

      {/* Nivel 2: Receta expandida */}
      {rubro.expanded && (
        <InsumosTable
          rubro={rubro}
          onChange={(insumoId, field, value) => onInsumoChange(rubro.instanceId, insumoId, field, value)}
          onChangeText={(insumoId, field, value) => onInsumoChangeText(rubro.instanceId, insumoId, field, value)}
          onDeleteInsumo={(insumoId) => onDeleteInsumo(rubro.instanceId, insumoId)}
          onAddInsumo={() => onAddInsumo(rubro.instanceId)}
        />
      )}
    </div>
  );
}
