import { redirect } from "next/navigation";
import { getCampoSession } from "@/lib/campo-session";
import { prisma } from "@/lib/prisma";
import { getEntradasCampo } from "./actions";
import { CampoBitacoraClient } from "./CampoBitacoraClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampoBitacoraPage({ params }: Props) {
  const { id } = await params;

  const sesion = await getCampoSession();
  if (!sesion || sesion.proyectoId !== id) {
    redirect(`/campo/${id}`);
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { nombre: true, codigo: true },
  });

  if (!proyecto) {
    redirect(`/campo/${id}`);
  }

  const entradas = await getEntradasCampo(id);

  return (
    <CampoBitacoraClient
      proyectoId={id}
      proyectoNombre={proyecto.nombre}
      proyectoCodigo={proyecto.codigo ?? ""}
      nombreFiscal={sesion.nombre}
      entradas={entradas}
    />
  );
}
