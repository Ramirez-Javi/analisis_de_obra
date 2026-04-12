/**
 * usuarios.integration.test.ts
 *
 * Tests de integración para creación y gestión de usuarios.
 * Usa la DB real (Neon) — NO usa mocks de Prisma.
 * Cada describe crea su propio sufijo único para evitar colisiones.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import {
  db,
  seedTestContext,
  cleanTestContext,
  type TestContext,
} from "./setup.integration";

// ─────────────────────────────────────────────────────────────
// Suite: gestión directa de usuarios en DB
// ─────────────────────────────────────────────────────────────

describe("Integration — Usuarios", () => {
  const SUFFIX = `usr-${Date.now()}`;
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await seedTestContext(SUFFIX);
  });

  afterAll(async () => {
    await cleanTestContext(ctx.empresa.id);
  });

  // ── CREATE ──────────────────────────────────────────────────

  it("crea un usuario con password hasheada", async () => {
    const plain = "TestPass123!";
    const hash = await bcrypt.hash(plain, 12);

    const usuario = await db.usuario.create({
      data: {
        email: `test-create-${SUFFIX}@tekoinnova.test`,
        nombre: "Nuevo",
        apellido: "Usuario",
        password: hash,
        rol: "USUARIO",
        activo: true,
        empresaId: ctx.empresa.id,
      },
    });

    expect(usuario.id).toBeTruthy();
    expect(usuario.email).toBe(`test-create-${SUFFIX}@tekoinnova.test`);
    expect(usuario.password).not.toBe(plain);
    expect(await bcrypt.compare(plain, usuario.password)).toBe(true);
  });

  // ── UNIQUE EMAIL ─────────────────────────────────────────────

  it("rechaza email duplicado (unique constraint)", async () => {
    const email = `dup-${SUFFIX}@tekoinnova.test`;
    await db.usuario.create({
      data: {
        email,
        nombre: "Primero",
        apellido: "",
        password: "hash1",
        rol: "USUARIO",
        empresaId: ctx.empresa.id,
      },
    });

    await expect(
      db.usuario.create({
        data: {
          email,
          nombre: "Segundo",
          apellido: "",
          password: "hash2",
          rol: "USUARIO",
          empresaId: ctx.empresa.id,
        },
      })
    ).rejects.toThrow(); // Prisma lanza P2002
  });

  // ── ACTIVATE / DEACTIVATE ────────────────────────────────────

  it("desactiva y reactiva un usuario", async () => {
    const usuario = await db.usuario.findFirst({
      where: { empresaId: ctx.empresa.id, rol: "ADMIN" },
    });
    expect(usuario).not.toBeNull();

    const desactivado = await db.usuario.update({
      where: { id: usuario!.id },
      data: { activo: false },
    });
    expect(desactivado.activo).toBe(false);

    const reactivado = await db.usuario.update({
      where: { id: usuario!.id },
      data: { activo: true },
    });
    expect(reactivado.activo).toBe(true);
  });

  // ── PERMISOS ─────────────────────────────────────────────────

  it("asigna y lee permisos de módulo", async () => {
    const usuario = await db.usuario.create({
      data: {
        email: `permisos-${SUFFIX}@tekoinnova.test`,
        nombre: "Con",
        apellido: "Permisos",
        password: "hash",
        rol: "USUARIO",
        empresaId: ctx.empresa.id,
      },
    });

    await db.permisoModulo.createMany({
      data: [
        { usuarioId: usuario.id, modulo: "FINANCIERO" },
        { usuarioId: usuario.id, modulo: "COMPRAS" },
      ],
    });

    const permisos = await db.permisoModulo.findMany({
      where: { usuarioId: usuario.id },
      select: { modulo: true },
    });

    const modulos = permisos.map((p) => p.modulo);
    expect(modulos).toContain("FINANCIERO");
    expect(modulos).toContain("COMPRAS");
    expect(modulos).toHaveLength(2);
  });
});
