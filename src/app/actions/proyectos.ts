"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export interface ProyectoSimple {
  id: string;
  codigo: string;
  nombre: string;
}

/** Devuelve todos los proyectos de la empresa del usuario activo */
export async function getProyectosSimple(): Promise<ProyectoSimple[]> {
  const session = await getSession();
  if (!session?.user) return [];

  const empresaId = (session.user as { empresaId?: string }).empresaId;
  return prisma.proyecto.findMany({
    where: { empresaId: empresaId ?? undefined },
    select: { id: true, codigo: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}
