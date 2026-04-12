"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * error.tsx — Página de error global de Next.js App Router.
 * Captura errores no manejados en Server Components y Client Components.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Loguear en consola en desarrollo; en producción iría a un servicio de observabilidad
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-6">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold dark:text-white text-slate-900 mb-2">
          Algo salió mal
        </h1>
        <p className="text-sm dark:text-slate-400 text-slate-500 mb-6">
          Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio.
        </p>
        {process.env.NODE_ENV === "development" && error?.message && (
          <pre className="text-xs text-left bg-slate-800 text-red-300 rounded-xl p-4 mb-6 overflow-auto max-h-40">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2.5 rounded-xl dark:bg-slate-800 bg-slate-200 dark:hover:bg-slate-700 hover:bg-slate-300 dark:text-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
