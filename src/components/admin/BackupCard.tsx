"use client";

import { useState } from "react";
import { Download, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface Props {
  ultimoBackupAt: Date | null;
}

function formatRelativo(fecha: Date): string {
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutos = Math.floor(diffMs / (1000 * 60));

  if (diffMinutos < 2) return "hace un momento";
  if (diffMinutos < 60) return `hace ${diffMinutos} minutos`;
  if (diffHoras < 24) return `hace ${diffHoras} ${diffHoras === 1 ? "hora" : "horas"}`;
  if (diffDias === 1) return "hace 1 día";
  return `hace ${diffDias} días`;
}

function formatFechaCompleta(fecha: Date): string {
  return fecha.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BackupCard({ ultimoBackupAt }: Props) {
  const [descargando, setDescargando] = useState(false);
  const [ultimoLocal, setUltimoLocal] = useState<Date | null>(ultimoBackupAt);

  const diasDesdeBackup = ultimoLocal
    ? Math.floor((Date.now() - ultimoLocal.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const esAntiguoWarning = diasDesdeBackup !== null && diasDesdeBackup > 7 && diasDesdeBackup <= 30;
  const esCritico = diasDesdeBackup === null || diasDesdeBackup > 30;

  async function handleDescargar() {
    setDescargando(true);
    try {
      const res = await fetch("/api/admin/backup/download");
      if (!res.ok) {
        alert("Error al generar el backup. Intentá de nuevo.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split('filename="')[1]?.replace('"', "") ??
        `tekoga-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setUltimoLocal(new Date());
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className={`rounded-2xl border p-5 transition-colors ${
      esCritico
        ? "dark:border-red-500/30 border-red-200 dark:bg-red-950/20 bg-red-50/50"
        : esAntiguoWarning
        ? "dark:border-amber-500/30 border-amber-200 dark:bg-amber-950/20 bg-amber-50/50"
        : "dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white"
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Icono + estado */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            esCritico
              ? "bg-red-500/15"
              : esAntiguoWarning
              ? "bg-amber-500/15"
              : "bg-teal-500/15"
          }`}>
            {esCritico ? (
              <AlertTriangle size={18} className="text-red-500" />
            ) : esAntiguoWarning ? (
              <Clock size={18} className="text-amber-500" />
            ) : (
              <CheckCircle2 size={18} className="text-teal-500" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
              Respaldo de datos
            </p>

            {ultimoLocal ? (
              <>
                <p className={`text-xs mt-0.5 ${
                  esCritico ? "text-red-500" : esAntiguoWarning ? "text-amber-500" : "dark:text-teal-400 text-teal-600"
                }`}>
                  Último backup {formatRelativo(ultimoLocal)}
                </p>
                <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-0.5">
                  {formatFechaCompleta(ultimoLocal)}
                </p>
              </>
            ) : (
              <p className="text-xs mt-0.5 text-red-500 font-medium">
                Nunca se realizó un backup
              </p>
            )}

            {esCritico && (
              <p className="text-[11px] text-red-400 mt-1.5 font-medium">
                ⚠ Se recomienda hacer backup al menos una vez por semana.
              </p>
            )}
            {esAntiguoWarning && (
              <p className="text-[11px] text-amber-400 mt-1.5 font-medium">
                El backup tiene más de 7 días. Considerá descargar uno nuevo.
              </p>
            )}
          </div>
        </div>

        {/* Botón descarga */}
        <button
          onClick={handleDescargar}
          disabled={descargando}
          className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors shadow-md shadow-teal-500/20"
        >
          <Download size={13} />
          {descargando ? "Generando…" : "Descargar backup"}
        </button>
      </div>

      {/* Descripción */}
      <p className="mt-4 text-[11px] dark:text-slate-500 text-slate-400 leading-relaxed border-t dark:border-white/[0.05] border-slate-100 pt-3">
        Descarga un archivo <strong className="dark:text-slate-400 text-slate-500">.json</strong> con todos los proyectos, 
        presupuestos, movimientos financieros y datos de la empresa. Guardalo en un lugar seguro (disco externo, nube personal).
      </p>
    </div>
  );
}
