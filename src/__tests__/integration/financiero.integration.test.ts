/**
 * financiero.integration.test.ts
 *
 * Tests de integración para crearMovimiento, eliminarMovimiento y
 * getMovimientos — con Neon DB real. Sin mocks de Prisma.
 *
 * Se mockean SOLO:
 *  - @/lib/session  → control de sesión activa
 *  - next/cache     → revalidatePath no existe fuera de Next.js
 *  - @/lib/audit    → sin efectos secundarios en los logs de auditoría
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import {
  db,
  seedTestContext,
  cleanTestContext,
  type TestContext,
} from "./setup.integration";
import {
  crearMovimiento,
  eliminarMovimiento,
  getMovimientos,
} from "@/app/proyectos/[id]/financiero/actions";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

// ─────────────────────────────────────────────────────────────
// Datos de prueba base
// ─────────────────────────────────────────────────────────────
const MOVIMIENTO_BASE = {
  fecha: "2026-04-15",
  tipo: "EGRESO_PROVEEDOR" as const,
  concepto: "Pago hormigón premezclado",
  beneficiario: "Proveedor Test SA",
  monto: 500_000.5,
  metodoPago: "EFECTIVO" as const,
} as const;

// ─────────────────────────────────────────────────────────────
// Suite principal
// ─────────────────────────────────────────────────────────────
describe("Integration — Financiero", () => {
  const SUFFIX = `fin-${Date.now()}`;
  let ctx: TestContext;
  let proyectoId: string;

  beforeAll(async () => {
    ctx = await seedTestContext(SUFFIX);

    const proyecto = await db.proyecto.create({
      data: {
        codigo: `PRY-TEST-${SUFFIX}`,
        nombre: `Proyecto Test ${SUFFIX}`,
        empresaId: ctx.empresa.id,
      },
    });
    proyectoId = proyecto.id;
  });

  afterAll(async () => {
    await cleanTestContext(ctx.empresa.id);
  });

  // Sesión válida del admin de prueba antes de cada test
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      user: {
        id: ctx.admin.id,
        email: ctx.admin.email,
        empresaId: ctx.empresa.id,
      } as never,
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    });
  });

  // ── CREAR ────────────────────────────────────────────────────

  it("crea un movimiento financiero en la DB y retorna { ok: true }", async () => {
    const result = await crearMovimiento(proyectoId, MOVIMIENTO_BASE);
    expect(result).toEqual({ ok: true });

    const row = await db.movimientoFinanciero.findFirst({
      where: { proyectoId, concepto: MOVIMIENTO_BASE.concepto },
    });
    expect(row).not.toBeNull();
    expect(row!.beneficiario).toBe(MOVIMIENTO_BASE.beneficiario);
    // Decimal en DB → Number en server action → verifica que el valor llega correcto
    expect(Number(row!.monto)).toBeCloseTo(MOVIMIENTO_BASE.monto, 2);
  });

  it("rechaza monto negativo sin tocar la DB", async () => {
    const count0 = await db.movimientoFinanciero.count({ where: { proyectoId } });

    const result = await crearMovimiento(proyectoId, { ...MOVIMIENTO_BASE, monto: -1 });
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error");

    const count1 = await db.movimientoFinanciero.count({ where: { proyectoId } });
    expect(count1).toBe(count0); // sin cambios
  });

  it("rechaza concepto vacío sin tocar la DB", async () => {
    const count0 = await db.movimientoFinanciero.count({ where: { proyectoId } });

    const result = await crearMovimiento(proyectoId, { ...MOVIMIENTO_BASE, concepto: "" });
    expect(result.ok).toBe(false);

    const count1 = await db.movimientoFinanciero.count({ where: { proyectoId } });
    expect(count1).toBe(count0);
  });

  // ── IDOR CHECK ───────────────────────────────────────────────

  it("previene IDOR: rechaza proyecto de otra empresa", async () => {
    // Empresa y proyecto de un tercero
    const otraEmpresa = await db.empresa.create({
      data: { nombre: `Empresa-IDOR-${SUFFIX}` },
    });
    const otroProyecto = await db.proyecto.create({
      data: {
        codigo: `PRY-IDOR-${SUFFIX}`,
        nombre: "Proyecto Ajeno",
        empresaId: otraEmpresa.id,
      },
    });

    // Usuario de ctx.empresa intenta escribir en proyecto ajeno
    await expect(
      crearMovimiento(otroProyecto.id, MOVIMIENTO_BASE)
    ).rejects.toThrow(/no encontrado|sin acceso/i);

    // Cleanup inline (fuera del contexto principal para no afectar cleanTestContext)
    await db.proyecto.delete({ where: { id: otroProyecto.id } });
    await db.empresa.delete({ where: { id: otraEmpresa.id } });
  });

  // ── ELIMINAR ─────────────────────────────────────────────────

  it("elimina un movimiento de la DB y retorna { ok: true }", async () => {
    // Crear uno para luego eliminarlo
    await crearMovimiento(proyectoId, {
      ...MOVIMIENTO_BASE,
      concepto: "Movimiento para eliminar",
    });

    const row = await db.movimientoFinanciero.findFirst({
      where: { proyectoId, concepto: "Movimiento para eliminar" },
    });
    expect(row).not.toBeNull();

    const result = await eliminarMovimiento(proyectoId, row!.id);
    expect(result).toEqual({ ok: true });

    const rowBorrado = await db.movimientoFinanciero.findUnique({
      where: { id: row!.id },
    });
    expect(rowBorrado).toBeNull();
  });

  // ── TIPO Decimal → number ────────────────────────────────────

  it("getMovimientos retorna monto como number (no Decimal)", async () => {
    const movimientos = await getMovimientos(proyectoId);
    expect(movimientos.length).toBeGreaterThan(0);

    for (const m of movimientos) {
      expect(typeof m.monto).toBe("number");
    }
  });

  // ── SIN SESIÓN ───────────────────────────────────────────────

  it("lanza error si no hay sesión activa", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(crearMovimiento(proyectoId, MOVIMIENTO_BASE)).rejects.toThrow(
      /autorizado/i
    );
  });
});
