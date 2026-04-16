import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
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
    select: { id: true, nombre: true, codigo: true },
  });
  if (!proyecto) notFound();

  const [entradas, alertasStock] = await Promise.all([
    getEntradasBitacora(id),
    getAlertasStock(id),
  ]);

  return (
    <>
      {/* Sticky nav header */}
      <div className="sticky top-[52px] z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/90 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href={`/proyectos/${id}`}
            className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
          >
            <ArrowLeft size={15} />
            Centro de Mando
          </Link>
          <div className="w-px h-3.5 dark:bg-white/10 bg-slate-200" />
          <Link
            href={`/proyectos/${id}`}
            className="text-xs dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
          >
            {proyecto.codigo}
          </Link>
          <div className="w-px h-3.5 dark:bg-white/10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="dark:text-teal-400 text-teal-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">Bitácora de Obra</p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">{proyecto.nombre}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <BitacoraClient
          proyectoId={id}
          proyectoNombre={proyecto.nombre}
          entradas={entradas}
          alertasStock={alertasStock}
        />
      </main>
    </>
  );
}
