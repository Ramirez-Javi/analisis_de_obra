import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";
import { cargarRubrosPresupuesto } from "@/app/actions/init-modulos";

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
  const [proyecto, initialRubros] = await Promise.all([
    getProyecto(id),
    cargarRubrosPresupuesto(id),
  ]);
  if (!proyecto) notFound();

  return (
    <PresupuestoClient
      backHref={`/proyectos/${id}`}
      backLabel="Centro de Mando"
      proyecto={proyecto}
      stickyTop="top-[52px]"
      initialRubros={initialRubros}
    />
  );
}