/**
 * Unit tests — proyectos/[id]/presupuesto/actions.ts
 *
 * Cubre:
 *   - getAvancesTotales(): agregación JS de avances por rubro
 *   - getAvancesRubro(): historial de un rubro específico
 *   - crearAvanceRubro(): validación Zod + IDOR check + inserción
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  getAvancesTotales,
  getAvancesRubro,
  crearAvanceRubro,
} from "@/app/proyectos/[id]/presupuesto/actions";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESION = {
  user: { id: "u1", email: "user@empresa.com", empresaId: "emp-1", role: "USUARIO" },
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  m(getSession).mockResolvedValue(SESION);
  m(prisma.proyecto.findFirst).mockResolvedValue({ id: "proj-1" });
  m(prisma.rubroProyecto.findMany).mockResolvedValue([]);
  m(prisma.avanceRubro.findMany).mockResolvedValue([]);
  m(prisma.rubroProyecto.findFirst).mockResolvedValue({ id: "r1" });
  m(prisma.avanceRubro.create).mockResolvedValue({ id: "av-1" });
  m(prisma.avanceRubro.delete).mockResolvedValue({ id: "av-1" });
});

// ─── getAvancesTotales ────────────────────────────────────────────────────────

describe("getAvancesTotales", () => {
  it("retorna {} si el proyecto no tiene rubros", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([]);

    const result = await getAvancesTotales("proj-1");

    expect(result).toEqual({});
    // Sin rubros no debe consultar avances (optimización de la función)
    expect(prisma.avanceRubro.findMany).not.toHaveBeenCalled();
  });

  it("retorna {} si los rubros no tienen avances registrados", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    m(prisma.avanceRubro.findMany).mockResolvedValue([]);

    const result = await getAvancesTotales("proj-1");

    expect(result).toEqual({});
  });

  it("retorna la suma correcta de múltiples avances para un mismo rubro", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([{ id: "r1" }]);
    m(prisma.avanceRubro.findMany).mockResolvedValue([
      { rubroProyectoId: "r1", cantidadEjecutada: 5 },
      { rubroProyectoId: "r1", cantidadEjecutada: 3 },
    ]);

    const result = await getAvancesTotales("proj-1");

    expect(result).toEqual({ r1: 8 });
  });

  it("retorna cada rubro por separado cuando hay múltiples rubros", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    m(prisma.avanceRubro.findMany).mockResolvedValue([
      { rubroProyectoId: "r1", cantidadEjecutada: 10 },
      { rubroProyectoId: "r2", cantidadEjecutada: 4 },
      { rubroProyectoId: "r2", cantidadEjecutada: 2 },
    ]);

    const result = await getAvancesTotales("proj-1");

    expect(result).toEqual({ r1: 10, r2: 6 });
  });

  it("rechaza si el usuario no está autenticado", async () => {
    m(getSession).mockResolvedValue(null);
    await expect(getAvancesTotales("proj-1")).rejects.toThrow(/autorizado/i);
  });

  it("rechaza si el proyecto no pertenece a la empresa (IDOR)", async () => {
    m(prisma.proyecto.findFirst).mockResolvedValue(null);
    await expect(getAvancesTotales("proj-otro")).rejects.toThrow(/no encontrado|sin acceso/i);
    expect(prisma.avanceRubro.findMany).not.toHaveBeenCalled();
  });
});

// ─── getAvancesRubro ──────────────────────────────────────────────────────────

describe("getAvancesRubro", () => {
  it("retorna historial vacío si no hay avances para ese rubro", async () => {
    m(prisma.avanceRubro.findMany).mockResolvedValue([]);

    const result = await getAvancesRubro("proj-1", "r1");

    expect(result).toEqual([]);
    expect(prisma.avanceRubro.findMany).toHaveBeenCalledOnce();
  });

  it("retorna los avances del rubro en orden descendente de fecha", async () => {
    const avances = [
      { id: "av-2", cantidadEjecutada: 3, fecha: new Date("2026-04-15"), nota: null, creadoEn: new Date() },
      { id: "av-1", cantidadEjecutada: 5, fecha: new Date("2026-04-10"), nota: "primera medición", creadoEn: new Date() },
    ];
    m(prisma.avanceRubro.findMany).mockResolvedValue(avances);

    const result = await getAvancesRubro("proj-1", "r1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("av-2"); // más reciente primero
  });

  it("rechaza si el usuario no está autenticado", async () => {
    m(getSession).mockResolvedValue(null);
    await expect(getAvancesRubro("proj-1", "r1")).rejects.toThrow(/autorizado/i);
  });

  it("rechaza si el proyecto no pertenece a la empresa (IDOR)", async () => {
    m(prisma.proyecto.findFirst).mockResolvedValue(null);
    await expect(getAvancesRubro("proj-otro", "r1")).rejects.toThrow(/no encontrado|sin acceso/i);
  });
});

// ─── crearAvanceRubro ─────────────────────────────────────────────────────────

describe("crearAvanceRubro", () => {
  it("crea el avance con datos válidos", async () => {
    const result = await crearAvanceRubro("proj-1", "r1", 5, "2026-04-18", "Primera medición");

    expect(result.ok).toBe(true);
    expect(prisma.avanceRubro.create).toHaveBeenCalledOnce();
  });

  it("rechaza cantidadEjecutada = 0 (Zod)", async () => {
    const result = await crearAvanceRubro("proj-1", "r1", 0, "2026-04-18");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/mayor a 0/i);
    expect(prisma.avanceRubro.create).not.toHaveBeenCalled();
  });

  it("rechaza cantidadEjecutada negativa (Zod)", async () => {
    const result = await crearAvanceRubro("proj-1", "r1", -3, "2026-04-18");

    expect(result.ok).toBe(false);
    expect(prisma.avanceRubro.create).not.toHaveBeenCalled();
  });

  it("rechaza fecha con formato inválido (Zod)", async () => {
    const result = await crearAvanceRubro("proj-1", "r1", 5, "18-04-2026");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/fecha/i);
    expect(prisma.avanceRubro.create).not.toHaveBeenCalled();
  });

  it("rechaza nota que excede 1000 caracteres (Zod)", async () => {
    const notaLarga = "A".repeat(1001);
    const result = await crearAvanceRubro("proj-1", "r1", 5, "2026-04-18", notaLarga);

    expect(result.ok).toBe(false);
    expect(prisma.avanceRubro.create).not.toHaveBeenCalled();
  });

  it("rechaza rubroProyectoId vacío (Zod)", async () => {
    const result = await crearAvanceRubro("proj-1", "", 5, "2026-04-18");

    expect(result.ok).toBe(false);
    expect(prisma.avanceRubro.create).not.toHaveBeenCalled();
  });

  it("rechaza si el rubro no pertenece al proyecto (IDOR)", async () => {
    m(prisma.rubroProyecto.findFirst).mockResolvedValue(null);

    const result = await crearAvanceRubro("proj-1", "r-ajena", 5, "2026-04-18");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no encontrado/i);
    expect(prisma.avanceRubro.create).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario no está autenticado", async () => {
    m(getSession).mockResolvedValue(null);
    await expect(crearAvanceRubro("proj-1", "r1", 5, "2026-04-18")).rejects.toThrow(/autorizado/i);
  });

  it("rechaza si el proyecto no pertenece a la empresa (IDOR)", async () => {
    m(prisma.proyecto.findFirst).mockResolvedValue(null);
    await expect(crearAvanceRubro("proj-otro", "r1", 5, "2026-04-18")).rejects.toThrow(
      /no encontrado|sin acceso/i
    );
    expect(prisma.avanceRubro.create).not.toHaveBeenCalled();
  });

  it("crea correctamente sin nota (campo opcional)", async () => {
    const result = await crearAvanceRubro("proj-1", "r1", 2.5, "2026-04-18");

    expect(result.ok).toBe(true);
    expect(prisma.avanceRubro.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nota: null }),
      })
    );
  });
});
