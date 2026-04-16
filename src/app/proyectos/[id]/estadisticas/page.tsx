import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getProyectosParaSelector,
  fetchProyectoData,
} from "@/app/estadisticas/actions";
import { EstadisticasClient } from "@/components/estadisticas/EstadisticasClient";
import Link from "next/link";
import { ChevronLeft, BarChart3, LayoutDashboard } from "lucide-react";

export const metadata = { title: "Estadísticas — TEKÓGA" };

export default async function EstadisticasProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, nombre: true, codigo: true },
  });
  if (!proyecto) notFound();

  const [datosIniciales, proyectos] = await Promise.all([
    fetchProyectoData(id),
    getProyectosParaSelector(),
  ]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Navegación de retorno */}
      <nav className="flex items-center gap-2 text-sm dark:text-slate-400 text-slate-500">
        <Link
          href="/proyectos"
          className="flex items-center gap-1 hover:dark:text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Proyectos
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
        <Link
          href={`/proyectos/${id}`}
          className="hover:dark:text-indigo-400 hover:text-indigo-600 transition-colors truncate max-w-[160px]"
        >
          {proyecto.nombre}
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
        <span className="flex items-center gap-1 dark:text-slate-200 text-slate-700 font-medium">
          <BarChart3 className="w-3.5 h-3.5" />
          Estadísticas
        </span>
      </nav>

      <EstadisticasClient
        proyectosOpciones={proyectos}
        proyectoIdFijo={id}
        datosIniciales={[datosIniciales]}
        fetchData={fetchProyectoData}
      />
    </main>
  );
}
