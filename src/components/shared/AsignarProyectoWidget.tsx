"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderInput, ChevronDown, Check, ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";
import type { ProyectoSimple } from "@/app/actions/proyectos";

interface AsignarProyectoWidgetProps {
  /** Proyectos disponibles (pasados desde el Server Component padre) */
  proyectos: ProyectoSimple[];
  /**
   * "copy":  copia el localStorage de la clave standalone a la del proyecto.
   *          Úsalo en módulos que tienen persistencia local (ej: presupuesto).
   * "nav":   solo navega al módulo dentro del proyecto sin copiar datos.
   */
  mode: "copy" | "nav";
  /** Clave base de localStorage. Ej: "presupuesto" → copia presupuesto_standalone → presupuesto_[id] */
  storagePrefix?: string;
  /** Ruta del módulo dentro del proyecto. Ej: "presupuesto", "mano-obra", "logistica" */
  moduloPath: string;
}

export function AsignarProyectoWidget({
  proyectos,
  mode,
  storagePrefix,
  moduloPath,
}: AsignarProyectoWidgetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProyectoSimple | null>(null);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = proyectos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(query.toLowerCase()) ||
      p.codigo.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(p: ProyectoSimple) {
    setSelected(p);
    setOpen(false);
    setQuery("");
  }

  function handleAsignar() {
    if (!selected) return;
    setConfirming(true);

    try {
      if (mode === "copy" && storagePrefix) {
        const srcKey = `${storagePrefix}_standalone`;
        const dstKey = `${storagePrefix}_${selected.id}`;
        const datos = localStorage.getItem(srcKey);
        if (!datos || datos === "[]") {
          toast.info("No hay datos guardados en modo independiente para asignar.");
          setConfirming(false);
          return;
        }
        // Advertir si el destino ya tiene datos
        const existente = localStorage.getItem(dstKey);
        if (existente && existente !== "[]") {
          const ok = confirm(
            `El proyecto "${selected.nombre}" ya tiene datos en este módulo.\n¿Deseas reemplazarlos con los del modo independiente?`
          );
          if (!ok) {
            setConfirming(false);
            return;
          }
        }
        localStorage.setItem(dstKey, datos);
        // Limpiar standalone después de asignar
        localStorage.removeItem(srcKey);
        toast.success(`Datos asignados a "${selected.nombre}" correctamente`);
      }

      // Navegar al módulo del proyecto
      router.push(`/proyectos/${selected.id}/${moduloPath}`);
    } catch {
      toast.error("Error al asignar el proyecto");
      setConfirming(false);
    }
  }

  if (proyectos.length === 0) return null;

  return (
    <div className="flex items-center gap-2 shrink-0" ref={ref}>
      {/* Selector desplegable */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            selected
              ? "dark:bg-teal-500/15 bg-teal-50 dark:text-teal-300 text-teal-700 dark:border-teal-500/30 border-teal-200"
              : "dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 dark:border-white/[0.06] border-slate-200 dark:hover:bg-slate-700 hover:bg-slate-200"
          }`}
        >
          <FolderInput size={12} />
          {selected ? (
            <span className="max-w-[110px] truncate">{selected.codigo} · {selected.nombre}</span>
          ) : (
            "Asignar a proyecto"
          )}
          <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border dark:border-white/[0.08] border-slate-200 dark:bg-slate-900 bg-white shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b dark:border-white/[0.06] border-slate-100">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg dark:bg-slate-800 bg-slate-50 border dark:border-white/[0.06] border-slate-200">
                <Search size={12} className="dark:text-slate-500 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar proyecto…"
                  className="flex-1 text-xs bg-transparent outline-none dark:text-slate-200 text-slate-700 placeholder:dark:text-slate-500 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-center dark:text-slate-500 text-slate-400 py-4">
                  Sin resultados
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:dark:bg-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded dark:bg-teal-500/10 bg-teal-50 dark:text-teal-400 text-teal-700 shrink-0">
                      {p.codigo}
                    </span>
                    <span className="text-xs dark:text-slate-200 text-slate-700 truncate">{p.nombre}</span>
                    {selected?.id === p.id && (
                      <Check size={11} className="ml-auto shrink-0 dark:text-teal-400 text-teal-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botón de confirmar asignación */}
      {selected && (
        <button
          onClick={handleAsignar}
          disabled={confirming}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-60"
        >
          <ArrowRight size={11} />
          {mode === "copy" ? "Asignar y abrir" : "Ir al módulo"}
        </button>
      )}
    </div>
  );
}
