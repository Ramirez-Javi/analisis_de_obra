"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export type RegistroResultado =
  | { ok: true }
  | { ok: false; error: string };

export async function registrarUsuario(data: {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}): Promise<RegistroResultado> {
  const email = data.email.trim().toLowerCase();
  const nombre = data.nombre.trim();
  const apellido = data.apellido.trim();
  const { password } = data;

  if (!email || !nombre || !password) {
    return { ok: false, error: "Completá todos los campos obligatorios." };
  }

  // Validar formato de email básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "El correo ingresado no es válido." };
  }

  if (password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: "La contraseña debe incluir al menos una letra mayúscula." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "La contraseña debe incluir al menos un número." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, error: "La contraseña debe incluir al menos un caracter especial." };
  }

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

  return { ok: true };
}
