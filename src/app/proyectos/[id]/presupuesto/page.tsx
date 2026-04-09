import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";

async function getProyecto(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, codigo: true, nombre: true, superficieM2: true },
  });
}

export default async function PresupuestoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyecto = await getProyecto(id);
  if (!proyecto) notFound();

  return (
    <PresupuestoClient
      backHref={`/proyectos/${id}`}
      backLabel="Centro de Mando"
      proyecto={proyecto}
      stickyTop="top-[52px]"
    />
  );
}