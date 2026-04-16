import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  getProyectosParaSelector,
  fetchProyectoData,
} from "./actions";
import { EstadisticasClient } from "@/components/estadisticas/EstadisticasClient";
import type { DashboardProyectoData } from "@/components/estadisticas/EstadisticasClient";
import { Header } from "@/components/layout/Header";
import { LayoutDashboard, ChevronLeft } from "lucide-react";

export const metadata = { title: "Estadísticas y Dashboard — TEKÓGA" };

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default async function EstadisticasGlobalPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const proyectos = await getProyectosParaSelector();

  // Pre-cargamos el primer proyecto si existe
  const datosIniciales: DashboardProyectoData[] = [];
  if (proyectos.length > 0) {
    datosIniciales.push(await fetchProyectoData(proyectos[0].id));
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Centro de Mando
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
          <span className="text-slate-700 dark:text-slate-200 font-medium">Estadísticas y Dashboard</span>
        </nav>
        <EstadisticasClient
          proyectosOpciones={proyectos}
          datosIniciales={datosIniciales}
          fetchData={fetchProyectoData}
        />
      </main>
    </div>
  );
}
