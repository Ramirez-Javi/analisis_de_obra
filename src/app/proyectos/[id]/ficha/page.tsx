import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FichaClient } from "@/components/ficha/FichaClient";

async function getFicha(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true, codigo: true, nombre: true, descripcion: true,
      ubicacion: true, superficieM2: true, fechaInicio: true,
      fechaFinEstimada: true, estado: true,
      empresa: { select: { nombre: true, titulo: true, direccion: true, telefono: true, email: true, web: true, ciudad: true, pais: true } },
      propietarios: { select: { id: true, nombre: true, apellido: true, direccion: true, telefono: true, email: true } },
      equipoTecnico: { select: { id: true, nombre: true, apellido: true, titulo: true, rol: true, matricula: true, telefono: true, email: true } },
      laminas: { select: { id: true, codigo: true, titulo: true, disciplina: true }, orderBy: { codigo: "asc" } },
      reuniones: { select: { id: true, fecha: true, hora: true, lugar: true, temas: true, acta: true, estado: true, representantes: true }, orderBy: { fecha: "desc" } },
      anotaciones: { select: { id: true, fecha: true, hora: true, categoria: true, titulo: true, contenido: true, autor: true }, orderBy: { fecha: "desc" } },
      aprobacion: { select: { fechaInicioContractual: true, fechaFinContractual: true, plazoEnDias: true, montoContratoGs: true, fechaAprobacionPlanos: true, firmanteAprobacionPlanos: true, obsAprobacionPlanos: true, fechaAprobacionPres: true, firmanteAprobacionPres: true, obsAprobacionPres: true, aprobadoPor: true, revisorNombre: true, revisorProfesion: true, fechaRevision: true, obsRevision: true, respPresupuesto: true, respPresupuestoProfesion: true } },
    },
  });
}

export default async function FichaProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyecto = await getFicha(id);
  if (!proyecto) notFound();
  // Decimal → number en el boundary Server/Client
  const fichaData = {
    ...proyecto,
    aprobacion: proyecto.aprobacion
      ? {
          ...proyecto.aprobacion,
          montoContratoGs:
            proyecto.aprobacion.montoContratoGs != null
              ? Number(proyecto.aprobacion.montoContratoGs)
              : null,
        }
      : null,
  };
  return <FichaClient proyecto={fichaData} />;
}