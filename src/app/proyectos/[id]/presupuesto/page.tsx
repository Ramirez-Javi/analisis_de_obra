import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";
import { cargarRubrosPresupuesto, cargarRubrosMaestrosEmpresa } from "@/app/actions/init-modulos";

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
  const [proyecto, initialRubros, rubrosMaestrosDB] = await Promise.all([
    getProyecto(id),
    cargarRubrosPresupuesto(id),
    cargarRubrosMaestrosEmpresa(),
  ]);
  if (!proyecto) notFound();

  return (
    <PresupuestoClient
      backHref={`/proyectos/${id}`}
      backLabel="Centro de Mando"
      proyecto={proyecto}
      stickyTop="top-[52px]"
      initialRubros={initialRubros}
      rubrosMaestrosDB={rubrosMaestrosDB as import("@/components/presupuesto/types").RubroMaestroMock[]}
    />
  );
}