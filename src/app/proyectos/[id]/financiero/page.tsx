import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getMovimientos } from "./actions";
import { FinancieroClient } from "@/components/financiero/FinancieroClient";
import { Landmark, ChevronLeft, LayoutDashboard } from "lucide-react";

export const metadata = { title: "Estado Financiero — TEKOINNOVA" };

export default async function FinancieroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      aprobacion: { select: { montoContratoGs: true } },
    },
  });
  if (!proyecto) notFound();

  const movimientos = await getMovimientos(id);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Navegación de retorno */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/proyectos"
          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Proyectos
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
        <Link
          href={`/proyectos/${id}`}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[160px]"
        >
          {proyecto.nombre}
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
        <span className="text-gray-700 dark:text-gray-200 font-medium">Estado Financiero</span>
      </nav>

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-600 p-2.5">
          <Landmark className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Estado Financiero</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{proyecto.nombre}</p>
        </div>
      </div>

      <FinancieroClient
        proyectoId={id}
        montoContrato={proyecto.aprobacion?.montoContratoGs ?? null}
        movimientos={movimientos}
      />
    </main>
  );
}
