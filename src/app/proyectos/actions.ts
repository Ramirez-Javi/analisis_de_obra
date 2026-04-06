"use server";

import { prisma } from "@/lib/prisma";
import type { NuevoProyectoFormValues } from "@/components/proyecto/types";

// Tipo de retorno explícito para manejo de errores en el cliente
export type AccionResultado =
  | { ok: true; proyectoId: string; codigo: string }
  | { ok: false; error: string };

/** Genera un código único correlativo: PRY-2026-001 */
async function generarCodigo(): Promise<string> {
  const anio = new Date().getFullYear();
  const count = await prisma.proyecto.count({
    where: { codigo: { startsWith: `PRY-${anio}-` } },
  });
  return `PRY-${anio}-${String(count + 1).padStart(3, "0")}`;
}

export async function crearProyecto(
  data: NuevoProyectoFormValues
): Promise<AccionResultado> {
  try {
    const codigo = await generarCodigo();

    // ── Empresa: upsert del registro global (primer registro existente o nuevo) ──
    let empresaId: string | null = null;
    if (data.empresa.nombre.trim() !== "") {
      const empresaExistente = await prisma.empresa.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (empresaExistente) {
        await prisma.empresa.update({
          where: { id: empresaExistente.id },
          data: {
            nombre:    data.empresa.nombre.trim(),
            titulo:    data.empresa.titulo.trim()    || null,
            direccion: data.empresa.direccion.trim() || null,
            telefono:  data.empresa.telefono.trim()  || null,
            email:     data.empresa.email.trim()     || null,
            web:       data.empresa.web.trim()       || null,
            ciudad:    data.empresa.ciudad.trim()    || null,
            pais:      data.empresa.pais.trim()      || null,
            logoUrl:   data.empresa.logoUrl.trim()   || null,
          },
        });
        empresaId = empresaExistente.id;
      } else {
        const nueva = await prisma.empresa.create({
          data: {
            nombre:    data.empresa.nombre.trim(),
            titulo:    data.empresa.titulo.trim()    || null,
            direccion: data.empresa.direccion.trim() || null,
            telefono:  data.empresa.telefono.trim()  || null,
            email:     data.empresa.email.trim()     || null,
            web:       data.empresa.web.trim()       || null,
            ciudad:    data.empresa.ciudad.trim()    || null,
            pais:      data.empresa.pais.trim()      || null,
            logoUrl:   data.empresa.logoUrl.trim()   || null,
          },
          select: { id: true },
        });
        empresaId = nueva.id;
      }
    }

    // ── Equipo técnico: convierte campos sueltos en registros MiembroEquipo ──
    const equipoData = [
      { nombre: data.equipoElaboracion, rol: "ARQUITECTO" as const },
      { nombre: data.equipoPlanos,      rol: "OTRO" as const },
      { nombre: data.equipoRenders,     rol: "OTRO" as const },
    ]
      .filter((m) => m.nombre.trim() !== "")
      .map((m) => ({ nombre: m.nombre.trim(), apellido: "", rol: m.rol }));

    // ── Propietarios: filtra vacíos ──
    const propietariosData = data.propietarios
      .filter((p) => p.nombre.trim() !== "")
      .map((p) => ({
        nombre:    p.nombre.trim(),
        apellido:  "",
        direccion: p.direccion.trim() || null,
        telefono:  p.telefono.trim()  || null,
        email:     p.email.trim()     || null,
      }));

    // ── Láminas: filtra filas totalmente vacías ──
    const laminasData = data.laminas
      .filter((l) => l.codigo.trim() !== "" || l.nombre.trim() !== "")
      .map((l) => ({
        codigo:     l.codigo.trim(),
        titulo:     l.nombre.trim(),
        disciplina: "General",
      }));

    const proyecto = await prisma.proyecto.create({
      data: {
        codigo,
        nombre:      data.nombre.trim(),
        descripcion: data.descripcion.trim() || null,
        ubicacion:   data.ubicacion.trim()   || null,
        empresaId,
        propietarios:  { create: propietariosData },
        equipoTecnico: { create: equipoData },
        laminas:       { create: laminasData },
      },
      select: { id: true, codigo: true },
    });

    return { ok: true, proyectoId: proyecto.id, codigo: proyecto.codigo };
  } catch (err) {
    console.error("[crearProyecto]", err);
    return {
      ok: false,
      error: "Ocurrió un error al guardar el proyecto. Intenta nuevamente.",
    };
  }
}
