"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registroSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

export type RegistroResultado =
  | { ok: true }
  | { ok: false; error: string };

export async function registrarUsuario(data: {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}): Promise<RegistroResultado> {
  // Validación completa con Zod
  const parsed = registroSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { ok: false, error: firstError.message };
  }

  const { nombre, apellido, email, password } = parsed.data;

  // Verificar si ya existe un usuario con ese email
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return { ok: false, error: "Ya existe una cuenta con ese correo." };
  }

  // El primer usuario del sistema se convierte en ADMIN
  const totalUsuarios = await prisma.usuario.count();
  if (totalUsuarios > 0) {
    return {
      ok: false,
      error:
        "El registro público solo está disponible para la configuración inicial. Contactá al administrador del sistema para obtener acceso.",
    };
  }

  const hash = await bcrypt.hash(password, 12);

  await prisma.usuario.create({
    data: {
      email,
      nombre,
      apellido,
      password: hash,
      rol: "ADMIN",
    },
  });

  audit({ accion: "USUARIO_REGISTRO", entidad: "Usuario", userEmail: email, despues: { email, nombre, apellido, rol: "ADMIN" } }).catch(() => {});

  return { ok: true };
}

