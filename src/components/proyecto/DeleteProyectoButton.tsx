"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { eliminarProyecto } from "@/app/proyectos/actions";

interface Props {
  id: string;
  nombre: string;
}

export function DeleteProyectoButton({ id, nombre }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
        <span className="text-[11px] dark:text-red-400 text-red-600 font-medium">
          ¿Eliminar?
        </span>
        <button
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await eliminarProyecto(id);
            });
          }}
          className="text-[11px] px-2 py-0.5 rounded dark:bg-red-500/20 bg-red-100 dark:text-red-300 text-red-700 hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {isPending ? "Eliminando…" : "Sí"}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            setConfirming(false);
          }}
          className="text-[11px] px-2 py-0.5 rounded dark:bg-slate-700 bg-slate-100 dark:text-slate-300 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      title={`Eliminar ${nombre}`}
      onClick={(e) => {
        e.preventDefault();
        setConfirming(true);
      }}
      className="p-1.5 rounded-lg dark:text-slate-500 text-slate-400 dark:hover:text-red-400 hover:text-red-500 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
    >
      <Trash2 size={14} />
    </button>
  );
}
