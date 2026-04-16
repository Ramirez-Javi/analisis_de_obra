import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LogisticaClient } from "@/components/logistica/LogisticaClient";
import { cargarLogisticaProyecto } from "@/app/actions/init-modulos";

export default async function LogisticaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [proyecto, logData] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, codigo: true, nombre: true },
    }),
    cargarLogisticaProyecto(id),
  ]);

  if (!proyecto) notFound();

  return (
    <LogisticaClient
      backHref={`/proyectos/${id}`}
      proyecto={proyecto}
      stickyTop="top-[52px]"
      initialEquipos={logData.equipos}
      initialGastos={logData.gastos}
      initialRubrosMock={logData.rubrosMock}
    />
  );
}
