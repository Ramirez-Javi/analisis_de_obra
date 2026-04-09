"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { NuevoProyectoFormValues } from "@/components/proyecto/types";

// Tipo de retorno explícito para manejo de errores en el cliente
export type AccionResultado =
  | { ok: true; proyectoId: string; codigo: string }
  | { ok: false; error: string };

/** Genera un código único correlativo: PRY-2026-001 (solo como fallback interno) */
async function generarCodigo(): Promise<string> {
  const anio = new Date().getFullYear();
  const count = await prisma.proyecto.count({
    where: { codigo: { startsWith: `PRY-${anio}-` } },
  });
  return `PRY-${anio}-${String(count + 1).padStart(3, "0")}`;
}

// Helper to parse date string safely
function parseDate(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export async function crearProyecto(
  data: NuevoProyectoFormValues
): Promise<AccionResultado> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autorizado. Iniciá sesión." };

  try {
    // Código REQUERIDO — no se auto-genera
    const codigo = data.codigo?.trim();
    if (!codigo) {
      return { ok: false, error: "El código de obra es obligatorio. Ingresá un código único para tu empresa." };
    }

    // Validate uniqueness
    const existing = await prisma.proyecto.findUnique({ where: { codigo } });
    if (existing) {
      return {
        ok: false,
        error: `El código "${codigo}" ya está en uso. Elegí un código diferente.`,
      };
    }

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
      { nombre: data.equipoElaboracion, titulo: data.equipoElaboracionCargo },
      { nombre: data.equipoPlanos,      titulo: data.equipoPlanosCargo },
      { nombre: data.equipoRenders,     titulo: data.equipoRendersCargo },
    ]
      .filter((m) => m.nombre.trim() !== "")
      .map((m) => ({ nombre: m.nombre.trim(), apellido: "", rol: "OTRO" as const, titulo: m.titulo?.trim() || null }));

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
        nombre:          data.nombre.trim(),
        descripcion:     data.descripcion.trim() || null,
        ubicacion:       data.ubicacion.trim()   || null,
        estado:          (data.estado || "ANTEPROYECTO") as never,
        fechaInicio:     parseDate(data.fechaInicio),
        duracionSemanas: data.duracionSemanas ? parseInt(data.duracionSemanas) || null : null,
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

export async function eliminarProyecto(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autorizado." };

  try {
    await prisma.proyecto.delete({ where: { id } });
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/proyectos");
    return { ok: true };
  } catch (err) {
    console.error("[eliminarProyecto]", err);
    return { ok: false, error: "No se pudo eliminar el proyecto." };
  }
}

// ─────────────────────────────────────────────────────────────
// Editar proyecto existente
// ─────────────────────────────────────────────────────────────

export async function editarProyecto(
  id: string,
  data: NuevoProyectoFormValues
): Promise<AccionResultado> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autorizado." };

  try {
    // ── Empresa: upsert global ──
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

    // ── Equipo técnico: reemplazar ──
    const equipoData = [
      { nombre: data.equipoElaboracion, titulo: data.equipoElaboracionCargo },
      { nombre: data.equipoPlanos,      titulo: data.equipoPlanosCargo },
      { nombre: data.equipoRenders,     titulo: data.equipoRendersCargo },
    ]
      .filter((m) => m.nombre.trim() !== "")
      .map((m) => ({ nombre: m.nombre.trim(), apellido: "", rol: "OTRO" as const, titulo: m.titulo?.trim() || null }));

    // ── Propietarios: reemplazar ──
    const propietariosData = data.propietarios
      .filter((p) => p.nombre.trim() !== "")
      .map((p) => ({
        nombre:    p.nombre.trim(),
        apellido:  "",
        direccion: p.direccion.trim() || null,
        telefono:  p.telefono.trim()  || null,
        email:     p.email.trim()     || null,
      }));

    // ── Láminas: reemplazar ──
    const laminasData = data.laminas
      .filter((l) => l.codigo.trim() !== "" || l.nombre.trim() !== "")
      .map((l) => ({
        codigo:     l.codigo.trim(),
        titulo:     l.nombre.trim(),
        disciplina: "General",
      }));

    // ── Obtener el código actual ──
    const existing = await prisma.proyecto.findUnique({
      where: { id },
      select: { codigo: true },
    });
    if (!existing) return { ok: false, error: "Proyecto no encontrado." };

    // ── Transacción: update proyecto + reemplazar relaciones ──
    await prisma.$transaction([
      prisma.miembroEquipo.deleteMany({ where: { proyectoId: id } }),
      prisma.propietario.deleteMany({ where: { proyectoId: id } }),
      prisma.laminaPlano.deleteMany({ where: { proyectoId: id } }),
      prisma.proyecto.update({
        where: { id },
        data: {
          nombre:          data.nombre.trim(),
          descripcion:     data.descripcion.trim() || null,
          ubicacion:       data.ubicacion.trim()   || null,
          estado:          (data.estado || "ANTEPROYECTO") as never,
          fechaInicio:     parseDate(data.fechaInicio),
          duracionSemanas: data.duracionSemanas ? parseInt(data.duracionSemanas) || null : null,
          empresaId,
          propietarios:  { create: propietariosData },
          equipoTecnico: { create: equipoData },
          laminas:       { create: laminasData },
        },
      }),
    ]);

    return { ok: true, proyectoId: id, codigo: existing.codigo };
  } catch (err) {
    console.error("[editarProyecto]", err);
    return {
      ok: false,
      error: "Ocurrió un error al actualizar el proyecto. Intenta nuevamente.",
    };
  }
}
