import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CronogramaClient } from "@/components/cronograma/CronogramaClient";
import { cargarRubrosPresupuesto } from "@/app/actions/init-modulos";

async function getProyecto(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, codigo: true, nombre: true },
  });
}

/** Produce YYYY-MM-DD en la zona horaria local del servidor */
function serverToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function CronogramaPage({
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
    <CronogramaClient
      backHref={`/proyectos/${id}`}
      proyecto={proyecto}
      today={serverToday()}
      initialRubros={initialRubros}
    />
  );
}
