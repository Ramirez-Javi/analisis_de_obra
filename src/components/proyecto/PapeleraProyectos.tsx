"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { restaurarProyecto, eliminarProyectoPermanente } from "@/app/proyectos/actions";
import { toast } from "sonner";

interface ProyectoArchivado {
  id: string;
  codigo: string;
  nombre: string;
  archivedAt: Date | null;
}

interface Props {
  proyectos: ProyectoArchivado[];
}

function FilaPapelera({ proyecto }: { proyecto: ProyectoArchivado }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPendingRestore, startRestore] = useTransition();
  const [isPendingDelete, startDelete] = useTransition();

  const fechaArchivado = proyecto.archivedAt
    ? new Date(proyecto.archivedAt).toLocaleDateString("es-PY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border dark:border-white/[0.05] border-slate-200 dark:bg-slate-900/50 bg-white">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium dark:text-slate-300 text-slate-600 truncate">
          {proyecto.nombre}
        </p>
        <p className="text-[11px] dark:text-slate-500 text-slate-400 font-mono">
          {proyecto.codigo} · Archivado el {fechaArchivado}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Restaurar */}
        <button
          disabled={isPendingRestore || isPendingDelete}
          onClick={() => {
            startRestore(async () => {
              const result = await restaurarProyecto(proyecto.id);
              if (!result.ok) toast.error(result.error);
            });
          }}
          title="Restaurar proyecto"
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg dark:bg-teal-500/15 bg-teal-50 dark:text-teal-400 text-teal-700 dark:hover:bg-teal-500/25 hover:bg-teal-100 transition-colors disabled:opacity-50 font-medium"
        >
          <RotateCcw size={11} />
          {isPendingRestore ? "Restaurando…" : "Restaurar"}
        </button>

        {/* Eliminar permanente */}
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] dark:text-red-400 text-red-600 font-medium">
              ¿Eliminar definitivamente?
            </span>
            <button
              disabled={isPendingDelete}
              onClick={() => {
                startDelete(async () => {
                  const result = await eliminarProyectoPermanente(proyecto.id);
                  if (!result.ok) toast.error(result.error);
                });
              }}
              className="text-[11px] px-2 py-0.5 rounded dark:bg-red-500/20 bg-red-100 dark:text-red-300 text-red-700 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {isPendingDelete ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] px-2 py-0.5 rounded dark:bg-slate-700 bg-slate-100 dark:text-slate-300 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            disabled={isPendingRestore || isPendingDelete}
            onClick={() => setConfirmDelete(true)}
            title="Eliminar permanentemente"
            className="p-1.5 rounded-lg dark:text-slate-600 text-slate-400 dark:hover:text-red-400 hover:text-red-500 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function PapeleraProyectos({ proyectos }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {proyectos.map((p) => (
        <FilaPapelera key={p.id} proyecto={p} />
      ))}
    </div>
  );
}
