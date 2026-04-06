import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { NuevoProyectoForm } from "@/components/proyecto/NuevoProyectoForm";

export default function NuevoProyectoPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      <div className="sticky top-0 z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
          >
            <ArrowLeft size={15} />
            Centro de Mando
          </Link>
          <div className="w-px h-4 dark:bg-white/10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <FolderOpen size={15} className="dark:text-blue-400 text-blue-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                Nuevo Proyecto
              </p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">
                Módulo 1 — Ficha Técnica
              </p>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <NuevoProyectoForm />
      </main>
    </div>
  );
}
