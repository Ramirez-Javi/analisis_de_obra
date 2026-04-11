import Link from "next/link";
import { ShieldX, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin acceso — TEKÓGA",
};

export default function SinAccesoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-6">
          <ShieldX size={32} className="dark:text-red-400 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold dark:text-slate-100 text-slate-800 mb-2">
          Acceso denegado
        </h1>
        <p className="text-sm dark:text-slate-400 text-slate-500 mb-8">
          No tenés permisos para acceder a este módulo. Contactá al administrador
          del sistema para solicitar acceso.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors duration-150"
        >
          <ArrowLeft size={15} />
          Volver al Centro de Mando
        </Link>
      </div>
    </div>
  );
}
