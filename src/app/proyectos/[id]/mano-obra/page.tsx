import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ManoObraClient } from "@/components/mano-obra/ManoObraClient";

export default async function ManoObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, codigo: true, nombre: true },
  });

  if (!proyecto) notFound();

  return (
    <ManoObraClient
      backHref={`/proyectos/${id}`}
      proyecto={proyecto}
      stickyTop="top-[52px]"
    />
  );
}
