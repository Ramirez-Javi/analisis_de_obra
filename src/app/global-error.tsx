"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * global-error.tsx — Captura errores en el Root Layout (nivel más alto).
 * Debe incluir su propio <html> y <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-6">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Error crítico</h1>
          <p className="text-sm text-slate-400 mb-6">
            La aplicación encontró un error crítico. Por favor recargá la página.
          </p>
          {process.env.NODE_ENV === "development" && error?.message && (
            <pre className="text-xs text-left bg-slate-800 text-red-300 rounded-xl p-4 mb-6 overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} />
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
