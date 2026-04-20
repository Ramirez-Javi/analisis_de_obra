import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReportesClient from "@/components/reportes/ReportesClient";
import { cargarRubrosPresupuesto } from "@/app/actions/init-modulos";

async function getProyecto(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      ubicacion: true,
      superficieM2: true,
      superficieTerreno: true,
      fechaInicio: true,
      fechaFinEstimada: true,
      estado: true,
      empresa: {
        select: {
          nombre: true,
          titulo: true,
          direccion: true,
          telefono: true,
          email: true,
          web: true,
          ciudad: true,
          pais: true,
          logoUrl: true,
        },
      },
      propietarios: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          direccion: true,
          telefono: true,
          email: true,
        },
      },
      equipoTecnico: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          rol: true,
        },
      },
    },
  });
}

export default async function ReportesPage({
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
    <ReportesClient
      proyecto={proyecto}
      backHref={`/proyectos/${id}`}
      stickyTop="top-[52px]"
      initialRubros={initialRubros}
    />
  );
}
