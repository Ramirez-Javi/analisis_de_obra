"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

const MAX_USUARIOS_ADICIONALES = 5; // Máximo usuarios no-admin

// ── Helper de autorización ──────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    throw new Error("Solo los administradores pueden realizar esta acción.");
  }
  return session;
}

// ── Tipos públicos ──────────────────────────────────────────────────────────

export type ModuloPermiso =
  | "PROYECTO"
  | "PRESUPUESTO"
  | "CRONOGRAMA"
  | "MANO_OBRA"
  | "LOGISTICA"
  | "REPORTES"
  | "FINANCIERO"
  | "COMPRAS";

export interface NuevoUsuarioData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  permisos: ModuloPermiso[];
}

export type AccionUsuarioResultado =
  | { ok: true }
  | { ok: false; error: string };

// ── Crear usuario USUARIO ───────────────────────────────────────────────────

export async function crearUsuario(
  data: NuevoUsuarioData
): Promise<AccionUsuarioResultado> {
  await requireAdmin();

  const email = data.email.trim().toLowerCase();
  const nombre = data.nombre.trim();
  const apellido = data.apellido.trim();

  if (!email || !nombre || !data.password) {
    return { ok: false, error: "Completá todos los campos obligatorios." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "El correo no es válido." };
  }

  if (data.password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (data.permisos.length === 0) {
    return { ok: false, error: "Asigná al menos un módulo al usuario." };
  }

  // Límite de usuarios USUARIO
  const cantidadUsuarios = await prisma.usuario.count({
    where: { rol: "USUARIO" },
  });
  if (cantidadUsuarios >= MAX_USUARIOS_ADICIONALES) {
    return {
      ok: false,
      error: `El sistema permite máximo ${MAX_USUARIOS_ADICIONALES} usuarios adicionales. Desactivá uno existente antes de crear otro.`,
    };
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return { ok: false, error: "Ya existe una cuenta con ese correo." };
  }

  const hash = await bcrypt.hash(data.password, 12);

  await prisma.usuario.create({
    data: {
      email,
      nombre,
      apellido,
      password: hash,
      rol: "USUARIO",
      activo: true,
      permisos: {
        create: data.permisos.map((modulo) => ({ modulo })),
      },
    },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

// ── Actualizar permisos de usuario ─────────────────────────────────────────

export async function actualizarPermisos(
  usuarioId: string,
  permisos: ModuloPermiso[]
): Promise<AccionUsuarioResultado> {
  await requireAdmin();

  if (permisos.length === 0) {
    return { ok: false, error: "Asigná al menos un módulo." };
  }

  // Reemplazar todos los permisos
  await prisma.$transaction([
    prisma.permisoModulo.deleteMany({ where: { usuarioId } }),
    prisma.permisoModulo.createMany({
      data: permisos.map((modulo) => ({ modulo, usuarioId })),
    }),
  ]);

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

// ── Cambiar contraseña de usuario ───────────────────────────────────────────

export async function cambiarPasswordUsuario(
  usuarioId: string,
  nuevaPassword: string
): Promise<AccionUsuarioResultado> {
  await requireAdmin();

  if (nuevaPassword.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const hash = await bcrypt.hash(nuevaPassword, 12);
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { password: hash },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

// ── Activar / Desactivar usuario ────────────────────────────────────────────

export async function toggleActivarUsuario(
  usuarioId: string,
  activo: boolean
): Promise<AccionUsuarioResultado> {
  await requireAdmin();

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { activo },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

// ── Eliminar usuario ────────────────────────────────────────────────────────

export async function eliminarUsuario(
  usuarioId: string
): Promise<AccionUsuarioResultado> {
  await requireAdmin();

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true },
  });

  if (usuario?.rol === "ADMIN") {
    return { ok: false, error: "No se puede eliminar una cuenta de administrador." };
  }

  await prisma.usuario.delete({ where: { id: usuarioId } });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

// ── Historial de sesiones ───────────────────────────────────────────────────

export async function getHistorialSesiones(usuarioId: string) {
  await requireAdmin();

  return prisma.sesionHistorial.findMany({
    where: { usuarioId },
    orderBy: { fechaHora: "desc" },
    take: 20,
    select: { id: true, fechaHora: true, ipAddress: true },
  });
}
