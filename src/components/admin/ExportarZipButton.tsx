"use client";

import { useState } from "react";
import { FolderArchive, Loader2 } from "lucide-react";

export function ExportarZipButton() {
  const [exportando, setExportando] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const res = await fetch("/api/admin/export/zip");
      if (!res.ok) {
        alert("Error al generar la exportación. Intentá de nuevo.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.split('filename="')[1]?.replace('"', "") ??
        `tekoga-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 dark:bg-teal-500/10 bg-teal-50">
          <FolderArchive className="w-5 h-5 text-teal-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
            Exportar datos CSV (ZIP)
          </p>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Descarga todos los proyectos con presupuesto, financiero, cronograma y equipo en formato CSV.
          </p>
        </div>
      </div>
      <button
        onClick={handleExportar}
        disabled={exportando}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
          bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
      >
        {exportando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generando ZIP…
          </>
        ) : (
          <>
            <FolderArchive className="w-4 h-4" />
            Descargar exportación
          </>
        )}
      </button>
    </div>
  );
}
