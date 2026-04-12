/**
 * setup.integration.ts — Setup global para integration tests.
 *
 * - Carga .env.local (DATABASE_URL, AUTH_SECRET, etc.) antes de cualquier test.
 * - Expone helpers globales: `seedDb()` y `cleanDb()`.
 * - Cada test suite usa una empresa/usuario únicos (prefijo cuid) para evitar
 *   colisiones entre tests que corren en paralelo o en re-runs.
 */

import { config } from "dotenv";
import path from "path";
import fs from "fs";

// Cargar variables de entorno antes de que Prisma lo necesite.
// Intenta .env.local primero (override local), luego .env como fallback.
function cargarEnv() {
  const root = process.cwd();
  const envLocal = path.resolve(root, ".env.local");
  const envFile = path.resolve(root, ".env");
  if (fs.existsSync(envLocal)) {
    config({ path: envLocal, quiet: true } as never);
  } else if (fs.existsSync(envFile)) {
    config({ path: envFile, quiet: true } as never);
  }
}
cargarEnv();

// Importar Prisma DESPUÉS de cargar las vars de entorno
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll } from "vitest";

// Prisma 7 requiere driver adapter explícito (igual que src/lib/prisma.ts)
function crearClienteIntegracion() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 1,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 15_000,
  });
  return new PrismaClient({ adapter });
}

// Cliente Prisma real — apunta a Neon via DATABASE_URL
export const db = crearClienteIntegracion();

// ─────────────────────────────────────────────────────────────
// Tipos de datos de prueba
// ─────────────────────────────────────────────────────────────

export interface TestEmpresa {
  id: string;
  nombre: string;
}

export interface TestUsuario {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
}

export interface TestContext {
  empresa: TestEmpresa;
  admin: TestUsuario;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Crea empresa + usuario ADMIN de prueba con sufijo único.
 * Retorna el contexto para usar en los tests.
 */
export async function seedTestContext(suffix: string): Promise<TestContext> {
  const empresa = await db.empresa.create({
    data: { nombre: `TEST_EMPRESA_${suffix}` },
  });

  const admin = await db.usuario.create({
    data: {
      email: `test-admin-${suffix}@tekoinnova.test`,
      nombre: "Admin",
      apellido: "Test",
      password: "$2b$10$testhashnothashed00000000000000000000000000000000000000", // bcrypt placeholder
      rol: "ADMIN",
      activo: true,
      empresaId: empresa.id,
    },
  });

  return {
    empresa: { id: empresa.id, nombre: empresa.nombre },
    admin: { id: admin.id, email: admin.email, nombre: admin.nombre, empresaId: empresa.id },
  };
}

/**
 * Elimina todos los datos creados para un sufijo de prueba.
 * Cascade: empresa → usuarios → proyectos → todo lo demás.
 */
export async function cleanTestContext(empresaId: string): Promise<void> {
  // Elimina proyectos y todo lo que "cuelga" de ellos (cascade en schema)
  const proyectos = await db.proyecto.findMany({
    where: { empresaId },
    select: { id: true },
  });
  for (const p of proyectos) {
    await db.proyecto.delete({ where: { id: p.id } }).catch(() => {});
  }

  // Proveedores
  await db.proveedor.deleteMany({ where: { empresaId } }).catch(() => {});

  // Usuarios
  await db.usuario.deleteMany({ where: { empresaId } }).catch(() => {});

  // Empresa
  await db.empresa.delete({ where: { id: empresaId } }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────
// Hooks globales
// ─────────────────────────────────────────────────────────────

afterAll(async () => {
  // Cerrar conexión Prisma al terminar todos los tests
  await db.$disconnect();
});
