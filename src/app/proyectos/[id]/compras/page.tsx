import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProveedoresDelProyecto, getProveedoresParaSelect } from "./actions";
import { ComprasClient } from "@/components/compras/ComprasClient";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Proveedores y Compras — TEKÓGA" };

export default async function ComprasPage({
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

  const [proveedores, proveedoresDisponibles] = await Promise.all([
    getProveedoresDelProyecto(id),
    getProveedoresParaSelect(),
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
            <ShoppingCart size={14} className="dark:text-orange-400 text-orange-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">Proveedores y Compras</p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">{proyecto.nombre}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-[66.5%] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        <ComprasClient
          proyectoId={id}
          proveedores={proveedores}
          proveedoresDisponibles={proveedoresDisponibles}
        />
      </div>
    </>
  );
}

