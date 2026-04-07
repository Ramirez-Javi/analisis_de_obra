"use client";

import { useState, useRef, useEffect } from "react";
import { Search, PlusCircle, ChevronDown } from "lucide-react";
import type { RubroMaestroMock } from "./types";

interface PresupuestoToolbarProps {
  rubrosMaestros: RubroMaestroMock[];
  onAgregarRubro: (rubro: RubroMaestroMock) => void;
  onCrearPersonalizado: () => void;
}

export function PresupuestoToolbar({
  rubrosMaestros,
  onAgregarRubro,
  onCrearPersonalizado,
}: PresupuestoToolbarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = rubrosMaestros.filter(
    (r) =>
      r.nombre.toLowerCase().includes(query.toLowerCase()) ||
      r.codigo.toLowerCase().includes(query.toLowerCase()) ||
      r.categoria.toLowerCase().includes(query.toLowerCase())
  );

  // Agrupar por categoría preservando el orden de aparición
  const grupos = filtered.reduce<Record<string, typeof filtered>>(
    (acc, r) => {
      if (!acc[r.categoria]) acc[r.categoria] = [];
      acc[r.categoria].push(r);
      return acc;
    },
    {}
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(rubro: RubroMaestroMock) {
    onAgregarRubro(rubro);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Buscador de rubros maestros */}
      <div ref={containerRef} className="relative flex-1 min-w-[240px] max-w-md">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-text
                     dark:bg-slate-900 bg-white
                     border dark:border-white/[0.08] border-slate-200
                     focus-within:ring-2 dark:focus-within:ring-teal-500/30 focus-within:ring-teal-500/20
                     dark:focus-within:border-teal-500/40 focus-within:border-teal-400
                     transition-all duration-150"
          onClick={() => setOpen(true)}
        >
          <Search size={14} className="dark:text-slate-500 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar rubro maestro para agregar..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="flex-1 bg-transparent text-sm dark:text-slate-100 text-slate-800 placeholder:dark:text-slate-600 placeholder:text-slate-400 focus:outline-none"
          />
          <ChevronDown size={13} className="dark:text-slate-600 text-slate-400 shrink-0" />
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border
                          dark:border-white/[0.08] border-slate-200
                          dark:bg-slate-900 bg-white
                          shadow-xl dark:shadow-black/40 shadow-slate-200/60
                          overflow-hidden max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs dark:text-slate-500 text-slate-400 text-center">
                No se encontraron rubros
              </p>
            ) : (
              Object.entries(grupos).map(([cat, items]) => (
                <div key={cat}>
                  {/* Encabezado de categoría */}
                  <div className="sticky top-0 px-3 py-1.5 dark:bg-slate-800/80 bg-slate-100/90 backdrop-blur-sm border-b dark:border-white/[0.06] border-slate-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                      {cat}
                    </p>
                  </div>
                  {items.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3
                                 dark:hover:bg-slate-800/60 hover:bg-slate-50
                                 border-b dark:border-white/[0.04] border-slate-100 last:border-0
                                 transition-colors duration-100"
                    >
                      <span className="text-[10px] font-mono dark:text-slate-500 text-slate-400 shrink-0 w-16">
                        {r.codigo}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium dark:text-slate-200 text-slate-700 truncate">
                          {r.nombre}
                        </p>
                        <p className="text-[10px] dark:text-slate-500 text-slate-400">
                          {r.insumos.length} insumos · {r.unidad}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Botón crear personalizado */}
      <button
        type="button"
        onClick={onCrearPersonalizado}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                   border dark:border-white/[0.08] border-slate-200
                   dark:bg-slate-900 bg-white
                   dark:text-slate-300 text-slate-600
                   dark:hover:border-teal-500/40 hover:border-teal-400
                   dark:hover:text-teal-400 hover:text-teal-600
                   transition-all duration-150"
      >
        <PlusCircle size={15} />
        Rubro personalizado
      </button>
    </div>
  );
}
