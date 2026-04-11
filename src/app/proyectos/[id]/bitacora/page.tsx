import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  getEntradasBitacora,
  getAlertasStock,
} from "./actions";
import { BitacoraClient } from "@/components/bitacora/BitacoraClient";

export const metadata = { title: "Bitácora de Obra — TEKÓGA" };

export default async function BitacoraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, nombre: true },
  });
  if (!proyecto) notFound();

  const [entradas, alertasStock] = await Promise.all([
    getEntradasBitacora(id),
    getAlertasStock(id),
  ]);

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Centro de Mando
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        <Link href="/proyectos" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Proyectos
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        <Link href={`/proyectos/${id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[140px]">
          {proyecto.nombre}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        <span className="text-gray-700 dark:text-gray-200 font-medium">Bitácora de Obra</span>
      </nav>

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 p-2.5 shadow-lg shadow-cyan-500/20">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Bitácora de Obra
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Libro diario · FODA · Personal · Alertas de stock — {proyecto.nombre}
          </p>
        </div>
      </div>

      {/* Client Component */}
      <BitacoraClient
        proyectoId={id}
        proyectoNombre={proyecto.nombre}
        entradas={entradas}
        alertasStock={alertasStock}
      />
    </main>
  );
}
