import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManoObraClient } from "@/components/mano-obra/ManoObraClient";
import { cargarManoObraProyecto } from "@/app/actions/init-modulos";

export default async function ManoObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [proyecto, moData] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, codigo: true, nombre: true },
    }),
    cargarManoObraProyecto(id),
  ]);

  if (!proyecto) notFound();

  return (
    <ManoObraClient
      backHref={`/proyectos/${id}`}
      proyecto={proyecto}
      stickyTop="top-[52px]"
      initialContratistas={moData.contratistas}
      initialPagosMap={moData.pagosMap}
    />
  );
}
