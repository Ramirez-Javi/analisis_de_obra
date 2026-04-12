"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { nuevoUsuarioSchema, passwordSchema } from "@/lib/schemas";
import { generateTotpSecret, generateTotpQR, verifyTotpCode } from "@/lib/totp";
import { encryptTotpSecret, decryptTotpSecret } from "@/lib/crypto";
import { audit } from "@/lib/audit";

const MAX_USUARIOS_ADICIONALES = 10;

// ── Helper de autorización ──────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    throw new Error("Solo los administradores pueden realizar esta acción.");
  }
  const userId = (session.user as { id?: string }).id!;
  const userEmail = session.user.email ?? undefined;
  const userRecord = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { empresaId: true },
  });
  const empresaId = userRecord?.empresaId ?? null;
  return { session, empresaId, userId, userEmail };
}

// ── Tipos públicos ──────────────────────────────────────────────────────────

export type ModuloPermiso =
  | "PROYECTO" | "PRESUPUESTO" | "CRONOGRAMA" | "MANO_OBRA"
  | "LOGISTICA" | "REPORTES" | "FINANCIERO" | "COMPRAS"
  | "INVENTARIO" | "BITACORA";

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
  const { empresaId, userId, userEmail } = await requireAdmin();

  // Validación completa con Zod
  const parsed = nuevoUsuarioSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { nombre, apellido, email, password, permisos } = parsed.data;

  // Límite de usuarios USUARIO scoped a esta empresa
  const cantidadUsuarios = await prisma.usuario.count({
    where: { rol: "USUARIO", empresaId: empresaId ?? undefined },
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

  const hash = await bcrypt.hash(password, 12);

  await prisma.usuario.create({
    data: {
      email,
      nombre,
      apellido,
      password: hash,
      rol: "USUARIO",
      activo: true,
      empresaId: empresaId ?? undefined,
      permisos: {
        create: permisos.map((modulo) => ({ modulo })),
      },
    },
  });

  audit({ accion: "USUARIO_CREADO", entidad: "Usuario", userId, userEmail, despues: { email, nombre, apellido, permisos } }).catch(() => {});

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
  const { userId, userEmail } = await requireAdmin();

  const parsed = passwordSchema.safeParse(nuevaPassword);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const hash = await bcrypt.hash(parsed.data, 12);
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { password: hash },
  });

  audit({ accion: "USUARIO_PASSWORD_CAMBIADO", entidad: "Usuario", entidadId: usuarioId, userId, userEmail }).catch(() => {});

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

// ── Activar / Desactivar usuario ────────────────────────────────────────────

export async function toggleActivarUsuario(
  usuarioId: string,
  activo: boolean
): Promise<AccionUsuarioResultado> {
  const { userId, userEmail } = await requireAdmin();

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { activo },
  });

  audit({ accion: activo ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO", entidad: "Usuario", entidadId: usuarioId, userId, userEmail }).catch(() => {});

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

// ── Eliminar usuario ────────────────────────────────────────────────────────

export async function eliminarUsuario(
  usuarioId: string
): Promise<AccionUsuarioResultado> {
  const { userId, userEmail } = await requireAdmin();

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true, email: true, nombre: true, apellido: true },
  });

  if (usuario?.rol === "ADMIN") {
    return { ok: false, error: "No se puede eliminar una cuenta de administrador." };
  }

  await prisma.usuario.delete({ where: { id: usuarioId } });

  audit({ accion: "USUARIO_ELIMINADO", entidad: "Usuario", entidadId: usuarioId, userId, userEmail, antes: { email: usuario?.email, nombre: usuario?.nombre, apellido: usuario?.apellido } }).catch(() => {});

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
    select: { id: true, fechaHora: true, ipAddress: true, userAgent: true },
  });
}

// ── 2FA / TOTP ──────────────────────────────────────────────────────────────

/**
 * Paso 1: Genera un secreto TOTP pendiente y devuelve la imagen QR.
 * El secreto queda en `totpPendingSecret` hasta que el usuario confirma con un código válido.
 */
export async function iniciarConfiguracion2FA(
  usuarioId: string
): Promise<{ ok: true; qrDataUrl: string; secret: string } | { ok: false; error: string }> {
  await requireAdmin();

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { email: true, totpEnabled: true },
  });
  if (!usuario) return { ok: false, error: "Usuario no encontrado." };
  if (usuario.totpEnabled) return { ok: false, error: "El usuario ya tiene 2FA activo." };

  const secret = generateTotpSecret();
  // Cifrar antes de persistir en DB (AES-256-GCM si TOTP_ENCRYPTION_KEY está configurada)
  const secretCifrado = encryptTotpSecret(secret);

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { totpPendingSecret: secretCifrado },
  });

  // El QR usa el secreto en texto plano (base32) — nunca el cifrado
  const qrDataUrl = await generateTotpQR(usuario.email, secret);

  revalidatePath("/admin/usuarios");
  return { ok: true, qrDataUrl, secret };
}

/**
 * Paso 2: Verifica el código TOTP ingresado por el usuario contra el secreto pendiente.
 * Si es válido, activa 2FA y limpia el secreto pendiente.
 */
export async function confirmar2FA(
  usuarioId: string,
  code: string
): Promise<AccionUsuarioResultado> {
  const { userId, userEmail } = await requireAdmin();

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { totpPendingSecret: true, totpEnabled: true },
  });
  if (!usuario) return { ok: false, error: "Usuario no encontrado." };
  if (!usuario.totpPendingSecret)
    return { ok: false, error: "No hay configuración 2FA en curso. Iniciá el proceso nuevamente." };
  if (usuario.totpEnabled) return { ok: false, error: "El usuario ya tiene 2FA activo." };

  // Descifrar el secreto pendiente para verificar el código
  const secretPlaintext = decryptTotpSecret(usuario.totpPendingSecret);
  const valid = verifyTotpCode(secretPlaintext, code);
  if (!valid) {
    return { ok: false, error: "Código incorrecto. Verificá que la hora de tu dispositivo sea correcta." };
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      totpSecret: usuario.totpPendingSecret, // ya está cifrado
      totpPendingSecret: null,
      totpEnabled: true,
    },
  });

  audit({ accion: "USUARIO_2FA_HABILITADO", entidad: "Usuario", entidadId: usuarioId, userId, userEmail }).catch(() => {});

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * Deshabilita 2FA de un usuario y elimina los secretos almacenados.
 */
export async function deshabilitar2FA(usuarioId: string): Promise<AccionUsuarioResultado> {
  const { userId, userEmail } = await requireAdmin();

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      totpEnabled: false,
      totpSecret: null,
      totpPendingSecret: null,
    },
  });

  audit({ accion: "USUARIO_2FA_DESHABILITADO", entidad: "Usuario", entidadId: usuarioId, userId, userEmail }).catch(() => {});

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/**
 * Devuelve el estado 2FA de un usuario (sin exponer el secreto).
 */
export async function get2FAStatus(
  usuarioId: string
): Promise<{ totpEnabled: boolean; hasPending: boolean }> {
  await requireAdmin();

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { totpEnabled: true, totpPendingSecret: true },
  });

  return {
    totpEnabled: usuario?.totpEnabled ?? false,
    hasPending: !!usuario?.totpPendingSecret,
  };
}
