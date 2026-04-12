/**
 * Unit tests for proyectos/[id]/financiero/actions.ts
 * Cubre: crearMovimiento y eliminarMovimiento con ownership check y Zod.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { crearMovimiento, eliminarMovimiento } from "@/app/proyectos/[id]/financiero/actions";
import { getSession } from "@/lib/session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const SESION_USUARIO = {
  user: {
    id: "user-1",
    email: "user@empresa.com",
    empresaId: "emp-1",
    role: "USUARIO",
  },
};

const MOVIMIENTO_VALIDO = {
  fecha: "2026-04-11",
  tipo: "EGRESO_PROVEEDOR" as const,
  concepto: "Pago materiales hormigón",
  beneficiario: "Hormigones del Sur S.A.",
  monto: 500000,
  metodoPago: "TRANSFERENCIA" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  m(getSession).mockResolvedValue(SESION_USUARIO);

  // Por defecto: el proyecto pertenece a la empresa del usuario
  m(prisma.proyecto.findFirst).mockResolvedValue({ id: "proj-1" });
  m(prisma.movimientoFinanciero.create).mockResolvedValue({ id: "mov-1" });
  m(prisma.movimientoFinanciero.delete).mockResolvedValue({ id: "mov-1" });
});

// ─── crearMovimiento ──────────────────────────────────────────────────────────

describe("crearMovimiento", () => {
  it("crea el movimiento con datos válidos", async () => {
    const result = await crearMovimiento("proj-1", MOVIMIENTO_VALIDO);
    expect(result.ok).toBe(true);
    expect(prisma.movimientoFinanciero.create).toHaveBeenCalledOnce();
  });

  it("rechaza si el usuario no está autenticado", async () => {
    m(getSession).mockResolvedValue(null);
    await expect(crearMovimiento("proj-1", MOVIMIENTO_VALIDO)).rejects.toThrow(/autorizado/i);
  });

  it("rechaza si el proyecto no pertenece a la empresa del usuario (IDOR)", async () => {
    m(prisma.proyecto.findFirst).mockResolvedValue(null); // proyecto de otra empresa
    await expect(crearMovimiento("proj-otro", MOVIMIENTO_VALIDO)).rejects.toThrow(/no encontrado|sin acceso/i);
    expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
  });

  it("rechaza monto negativo (Zod)", async () => {
    const result = await crearMovimiento("proj-1", { ...MOVIMIENTO_VALIDO, monto: -100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/mayor a 0/i);
    expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
  });

  it("rechaza tipo de movimiento inválido (Zod)", async () => {
    const result = await crearMovimiento("proj-1", {
      ...MOVIMIENTO_VALIDO,
      tipo: "INGRESO" as "INGRESO_CLIENTE", // tipo incorrecto del schema viejo
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/inválido/i);
    expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
  });

  it("rechaza concepto vacío (Zod)", async () => {
    const result = await crearMovimiento("proj-1", { ...MOVIMIENTO_VALIDO, concepto: "" });
    expect(result.ok).toBe(false);
    expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
  });

  it("rechaza beneficiario vacío (Zod)", async () => {
    const result = await crearMovimiento("proj-1", { ...MOVIMIENTO_VALIDO, beneficiario: "" });
    expect(result.ok).toBe(false);
    expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
  });

  it("rechaza fecha vacía (Zod)", async () => {
    const result = await crearMovimiento("proj-1", { ...MOVIMIENTO_VALIDO, fecha: "" });
    expect(result.ok).toBe(false);
    expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
  });

  it("usa $transaction al incluir cuotaPagoId", async () => {
    m(prisma.$transaction).mockResolvedValue([{ id: "mov-1" }, { id: "cuota-1" }]);
    const result = await crearMovimiento("proj-1", {
      ...MOVIMIENTO_VALIDO,
      cuotaPagoId: "cuota-1",
    });
    expect(result.ok).toBe(true);
    // Con cuotaPagoId, la operación se envuelve en $transaction para atomicidad
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});

// ─── eliminarMovimiento ───────────────────────────────────────────────────────

describe("eliminarMovimiento", () => {
  it("elimina el movimiento vinculado al proyecto correcto", async () => {
    const result = await eliminarMovimiento("proj-1", "mov-1");
    expect(result.ok).toBe(true);
    expect(prisma.movimientoFinanciero.delete).toHaveBeenCalledWith({
      where: { id: "mov-1", proyectoId: "proj-1" },
    });
  });

  it("rechaza si el usuario no está autenticado", async () => {
    m(getSession).mockResolvedValue(null);
    await expect(eliminarMovimiento("proj-1", "mov-1")).rejects.toThrow(/autorizado/i);
  });

  it("rechaza si el proyecto no pertenece a la empresa (IDOR)", async () => {
    m(prisma.proyecto.findFirst).mockResolvedValue(null);
    await expect(eliminarMovimiento("proj-otro", "mov-1")).rejects.toThrow(/no encontrado|sin acceso/i);
    expect(prisma.movimientoFinanciero.delete).not.toHaveBeenCalled();
  });

  it("propaga error de prisma si el movimiento no existe (P2025)", async () => {
    const { Prisma } = await import("@prisma/client");
    m(prisma.movimientoFinanciero.delete).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "7.0.0",
      })
    );
    const result = await eliminarMovimiento("proj-1", "mov-inexistente");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no fue encontrado/i);
  });
});
