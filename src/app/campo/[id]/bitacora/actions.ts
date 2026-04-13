"use server";

import { prisma } from "@/lib/prisma";
import { getCampoSession } from "@/lib/campo-session";
import { revalidatePath } from "next/cache";

async function requireCampoSession(proyectoId: string) {
  const sesion = await getCampoSession();
  if (!sesion || sesion.proyectoId !== proyectoId) {
    throw new Error("Sesión de campo no válida. Volvé a escanear el QR.");
  }
  return sesion;
}

// ─── Lecturas ────────────────────────────────────────────────

export async function getEntradasCampo(proyectoId: string) {
  await requireCampoSession(proyectoId);
  return prisma.bitacoraEntrada.findMany({
    where: { proyectoId },
    orderBy: { fecha: "desc" },
    take: 30,
    include: {
      rubrosDelDia: { orderBy: { id: "asc" } },
      personalDelDia: { orderBy: { nombre: "asc" } },
    },
  });
}

// ─── Crear entrada (desde campo) ─────────────────────────────

export type EntradaCampoData = {
  fecha: string;         // ISO date
  turno?: string;
  clima?: string;
  temperatura?: number;
  descripcionGeneral: string;
  enlaceFotos?: string;
  personalDelDia?: { nombre: string; categoria?: string; horasTrabajadas?: number }[];
  rubrosDelDia?: { descripcion: string; cantidad?: number; unidad?: string; avancePct?: number }[];
};

export async function crearEntradaCampo(
  proyectoId: string,
  data: EntradaCampoData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const sesion = await requireCampoSession(proyectoId);

    // Validar enlace de fotos si se provee
    if (data.enlaceFotos) {
      try {
        const url = new URL(data.enlaceFotos.trim());
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          return { ok: false, error: "El enlace de fotos debe ser una URL http/https válida" };
        }
      } catch {
        return { ok: false, error: "El enlace de fotos no es una URL válida" };
      }
    }

    await prisma.bitacoraEntrada.create({
      data: {
        proyectoId,
        fecha: new Date(data.fecha),
        turno: data.turno ?? null,
        clima: data.clima ?? null,
        temperatura: data.temperatura ?? null,
        descripcionGeneral: data.descripcionGeneral.trim(),
        enlaceFotos: data.enlaceFotos?.trim() || null,
        responsableFirma: sesion.nombre,
        rubrosDelDia: data.rubrosDelDia?.length
          ? {
              create: data.rubrosDelDia.map((r) => ({
                descripcion: r.descripcion,
                cantidad: r.cantidad ?? null,
                unidad: r.unidad ?? null,
                avancePct: r.avancePct ?? null,
              })),
            }
          : undefined,
        personalDelDia: data.personalDelDia?.length
          ? {
              create: data.personalDelDia.map((p) => ({
                nombre: p.nombre,
                categoria: p.categoria ?? null,
                horasTrabajadas: p.horasTrabajadas ?? null,
              })),
            }
          : undefined,
      },
    });

    revalidatePath(`/campo/${proyectoId}/bitacora`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al crear entrada" };
  }
}
