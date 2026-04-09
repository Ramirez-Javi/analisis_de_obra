/**
 * Script para crear el usuario administrador inicial.
 * Ejecutar: npx tsx scripts/crear-admin.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@tekoinnova.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin1234!";
  const nombre = process.env.ADMIN_NOMBRE ?? "Administrador";

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Usuario ${email} ya existe.`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  // Buscar la primera empresa disponible para asignar al admin
  const empresa = await prisma.empresa.findFirst();

  await prisma.usuario.create({
    data: {
      email,
      nombre,
      password: hash,
      rol: "ADMIN",
      ...(empresa ? { empresaId: empresa.id } : {}),
    },
  });

  console.log(`✓ Usuario administrador creado:`);
  console.log(`  Email:      ${email}`);
  console.log(`  Contraseña: ${password}`);
  console.log(`  ⚠ Cambia la contraseña después del primer ingreso.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
