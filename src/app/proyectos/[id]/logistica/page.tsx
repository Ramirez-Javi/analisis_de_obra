import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { LogisticaClient } from "@/components/logistica/LogisticaClient";

export default async function LogisticaPage({
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
    <LogisticaClient
      backHref={`/proyectos/${id}`}
      proyecto={proyecto}
      stickyTop="top-[52px]"
    />
  );
}
