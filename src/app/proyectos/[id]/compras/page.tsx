import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProveedoresDelProyecto, getProveedoresParaSelect } from "./actions";
import { ComprasClient } from "@/components/compras/ComprasClient";
import { ShoppingCart } from "lucide-react";

export const metadata = { title: "Proveedores y Compras — TEKOINNOVA" };

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
    select: { id: true, nombre: true },
  });
  if (!proyecto) notFound();

  const [proveedores, proveedoresDisponibles] = await Promise.all([
    getProveedoresDelProyecto(id),
    getProveedoresParaSelect(),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-600 p-2.5">
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Proveedores y Compras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{proyecto.nombre}</p>
        </div>
      </div>

      <ComprasClient
        proyectoId={id}
        proveedores={proveedores}
        proveedoresDisponibles={proveedoresDisponibles}
      />
    </div>
  );
}

