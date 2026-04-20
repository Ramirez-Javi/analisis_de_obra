"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { NuevoProyectoFormValues } from "@/components/proyecto/types";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";

// Tipo de retorno explícito para manejo de errores en el cliente
export type AccionResultado =
  | { ok: true; proyectoId: string; codigo: string }
  | { ok: false; error: string };

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

    // Resolve the current admin's empresaId from the DB (JWT may be stale)
    const userId = (session.user as { id?: string }).id!;
    const userRecord = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresaId: true },
    });
    let sessionEmpresaId = userRecord?.empresaId ?? null;

    // ── Empresa: upsert del registro de la propia empresa ──────────────
    let empresaId: string | null = null;
    if (data.empresa.nombre.trim() !== "") {
      if (sessionEmpresaId) {
        await prisma.empresa.update({
          where: { id: sessionEmpresaId },
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
        empresaId = sessionEmpresaId;
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
        // Link admin user to the new empresa
        await prisma.usuario.update({
          where: { id: userId },
          data: { empresaId: nueva.id },
        });
        empresaId = nueva.id;
        sessionEmpresaId = nueva.id;
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
        superficieM2:    data.superficieM2 ? parseFloat(data.superficieM2) || null : null,
        superficieTerreno: data.superficieTerreno ? parseFloat(data.superficieTerreno) || null : null,
        empresaId,
        propietarios:  { create: propietariosData },
        equipoTecnico: { create: equipoData },
        laminas:       { create: laminasData },
      },
      select: { id: true, codigo: true },
    });

    const actorId = (session.user as { id?: string }).id;
    const actorEmail = session.user.email ?? undefined;
    audit({ accion: "PROYECTO_CREADO", entidad: "Proyecto", entidadId: proyecto.id, userId: actorId, userEmail: actorEmail, despues: { codigo, nombre: data.nombre.trim() } }).catch(() => {});

    return { ok: true, proyectoId: proyecto.id, codigo: proyecto.codigo };
  } catch (err) {
    const session2 = await auth();
    const actorId = (session2?.user as { id?: string })?.id;
    const actorEmail = session2?.user?.email ?? undefined;
    audit({ accion: "PROYECTO_CREADO", entidad: "Proyecto", userId: actorId, userEmail: actorEmail, exito: false, error: String(err) }).catch(() => {});
    logger.error("proyectos", "crearProyecto falló", { err });
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
    const userId = (session.user as { id?: string }).id!;
    const userRecord = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresaId: true },
    });
    const sessionEmpresaId = userRecord?.empresaId;
    if (!sessionEmpresaId) {
      return { ok: false, error: "No autorizado. El usuario no tiene empresa asignada." };
    }

    const proyecto = await prisma.proyecto.findFirst({
      where: { id, empresaId: sessionEmpresaId },
      select: { id: true },
    });
    if (!proyecto) return { ok: false, error: "Proyecto no encontrado." };

    // Soft delete: marcar como archivado en lugar de borrar permanentemente
    await prisma.proyecto.update({
      where: { id, empresaId: sessionEmpresaId },
      data: { archivedAt: new Date() },
    });

    const { revalidatePath } = await import("next/cache");
    const actorId = (session.user as { id?: string }).id;
    const actorEmail = session.user.email ?? undefined;
    audit({ accion: "PROYECTO_ARCHIVADO", entidad: "Proyecto", entidadId: id, userId: actorId, userEmail: actorEmail }).catch(() => {});

    revalidatePath("/proyectos");
    return { ok: true };
  } catch (err) {
    logger.error("proyectos", "eliminarProyecto falló", { err });
    return { ok: false, error: "No se pudo archivar el proyecto." };
  }
}

export async function restaurarProyecto(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autorizado." };

  try {
    const userId = (session.user as { id?: string }).id!;
    const userRecord = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresaId: true },
    });
    const sessionEmpresaId = userRecord?.empresaId;
    if (!sessionEmpresaId) {
      return { ok: false, error: "No autorizado." };
    }

    const proyecto = await prisma.proyecto.findFirst({
      where: { id, empresaId: sessionEmpresaId },
      select: { id: true },
    });
    if (!proyecto) return { ok: false, error: "Proyecto no encontrado." };

    await prisma.proyecto.update({
      where: { id },
      data: { archivedAt: null },
    });

    const { revalidatePath } = await import("next/cache");
    const actorId = (session.user as { id?: string }).id;
    const actorEmail = session.user.email ?? undefined;
    audit({ accion: "PROYECTO_RESTAURADO", entidad: "Proyecto", entidadId: id, userId: actorId, userEmail: actorEmail }).catch(() => {});

    revalidatePath("/proyectos");
    return { ok: true };
  } catch (err) {
    logger.error("proyectos", "restaurarProyecto falló", { err });
    return { ok: false, error: "No se pudo restaurar el proyecto." };
  }
}

export async function eliminarProyectoPermanente(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autorizado." };

  try {
    const userId = (session.user as { id?: string }).id!;
    const userRecord = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresaId: true, rol: true },
    });
    const sessionEmpresaId = userRecord?.empresaId;
    if (!sessionEmpresaId) {
      return { ok: false, error: "No autorizado." };
    }

    // Solo se pueden eliminar permanentemente proyectos que ya están en la papelera
    const proyecto = await prisma.proyecto.findFirst({
      where: { id, empresaId: sessionEmpresaId, archivedAt: { not: null } },
      select: { id: true },
    });
    if (!proyecto) {
      return { ok: false, error: "Proyecto no encontrado en la papelera." };
    }

    await prisma.proyecto.delete({ where: { id, empresaId: sessionEmpresaId } });

    const { revalidatePath } = await import("next/cache");
    const actorId = (session.user as { id?: string }).id;
    const actorEmail = session.user.email ?? undefined;
    audit({ accion: "PROYECTO_ELIMINADO_PERMANENTE", entidad: "Proyecto", entidadId: id, userId: actorId, userEmail: actorEmail }).catch(() => {});

    revalidatePath("/proyectos");
    return { ok: true };
  } catch (err) {
    logger.error("proyectos", "eliminarProyectoPermanente falló", { err });
    return { ok: false, error: "No se pudo eliminar el proyecto permanentemente." };
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
    // Resolve and verify ownership
    const userId = (session.user as { id?: string }).id!;
    const userRecord = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresaId: true },
    });
    const sessionEmpresaId = userRecord?.empresaId ?? null;

    // Row-level security: sin empresa = sin acceso
    if (!sessionEmpresaId) {
      return { ok: false, error: "No autorizado. El usuario no tiene empresa asignada." };
    }

    const proyectoOwned = await prisma.proyecto.findFirst({
      where: { id, empresaId: sessionEmpresaId },
      select: { id: true },
    });
    if (!proyectoOwned) return { ok: false, error: "Proyecto no encontrado." };

    // ── Empresa: upsert del registro de la propia empresa ──────────────
    let empresaId: string | null = null;
    if (data.empresa.nombre.trim() !== "") {
      if (sessionEmpresaId) {
        await prisma.empresa.update({
          where: { id: sessionEmpresaId },
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
        empresaId = sessionEmpresaId;
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
        await prisma.usuario.update({
          where: { id: userId },
          data: { empresaId: nueva.id },
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
    const proyectoActual = await prisma.proyecto.findUnique({
      where: { id, empresaId: sessionEmpresaId },
      select: { codigo: true },
    });
    if (!proyectoActual) return { ok: false, error: "Proyecto no encontrado." };

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
          superficieM2:    data.superficieM2 ? parseFloat(data.superficieM2) || null : null,
          superficieTerreno: data.superficieTerreno ? parseFloat(data.superficieTerreno) || null : null,
          empresaId,
          propietarios:  { create: propietariosData },
          equipoTecnico: { create: equipoData },
          laminas:       { create: laminasData },
        },
      }),
    ]);

    const actorEmail = session.user.email ?? undefined;
    audit({ accion: "PROYECTO_EDITADO", entidad: "Proyecto", entidadId: id, userId, userEmail: actorEmail, despues: { nombre: data.nombre.trim(), estado: data.estado } }).catch(() => {});

    return { ok: true, proyectoId: id, codigo: proyectoActual.codigo };
  } catch (err) {
    const session2 = await auth();
    const actorId = (session2?.user as { id?: string })?.id;
    const actorEmail = session2?.user?.email ?? undefined;
    audit({ accion: "PROYECTO_EDITADO", entidad: "Proyecto", entidadId: id, userId: actorId, userEmail: actorEmail, exito: false, error: String(err) }).catch(() => {});
    logger.error("proyectos", "editarProyecto falló", { err });
    return {
      ok: false,
      error: "Ocurrió un error al actualizar el proyecto. Intenta nuevamente.",
    };
  }
}
