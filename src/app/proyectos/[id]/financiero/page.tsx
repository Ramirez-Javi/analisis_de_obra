import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getMovimientos } from "./actions";
import { FinancieroClient } from "@/components/financiero/FinancieroClient";
import { Landmark } from "lucide-react";

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
    <div className="p-4 md:p-6 space-y-6">
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
    </div>
  );
}
