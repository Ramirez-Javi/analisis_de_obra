/**
 * Unit tests — proyectos/[id]/inventario/actions.ts
 *
 * Cubre:
 *   - getControlStock(): lógica de cruce de 3 queries + cálculos JS
 *   - crearRecepcion(): validación Zod + IDOR check + inserción
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getControlStock, crearRecepcion } from "@/app/proyectos/[id]/inventario/actions";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESION = {
  user: { id: "u1", email: "user@empresa.com", empresaId: "emp-1", role: "USUARIO" },
};

/** Rubro con 1 insumo y avances registrados */
const rubroConInsumo = (
  nombre: string,
  insumoNombre: string,
  cantidadInsumo: number,
  porcPerdida: number,
  ejecutado: number[]
) => ({
  rubroMaestro: { nombre },
  insumos: [
    {
      nombre: insumoNombre,
      cantidad: cantidadInsumo,
      porcPerdida,
      unidadMedida: { simbolo: "kg", nombre: "kilogramo" },
    },
  ],
  avancesRubro: ejecutado.map((cantidadEjecutada) => ({ cantidadEjecutada })),
});

/** Recepción de bodega para un material */
const recepcion = (nombre: string, cantidad: number) => ({
  cantidadRecibida: cantidad,
  material: {
    nombre,
    unidadMedida: { simbolo: "kg", nombre: "kilogramo" },
  },
});

/** Conteo físico */
const conteo = (nombre: string, cantidad: number, fecha = new Date("2026-04-01")) => ({
  materialNombre: nombre,
  unidad: "kg",
  cantidad,
  fecha,
});

const RECEPCION_VALIDA = {
  materialId: "mat-1",
  fechaRecepcion: "2026-04-18",
  cantidadRecibida: 50,
  proveedorId: "prov-1",
  marca: "Holcim",
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  m(getSession).mockResolvedValue(SESION);
  m(prisma.proyecto.findFirst).mockResolvedValue({ id: "proj-1" });

  // Por defecto: sin datos en la DB
  m(prisma.rubroProyecto.findMany).mockResolvedValue([]);
  m(prisma.recepcionBodega.findMany).mockResolvedValue([]);
  m(prisma.conteoFisicoBodega.findMany).mockResolvedValue([]);
  m(prisma.recepcionBodega.create).mockResolvedValue({ id: "rec-1" });
});

// ─── getControlStock ─────────────────────────────────────────────────────────

describe("getControlStock", () => {
  it("retorna array vacío cuando no hay rubros ni recepciones", async () => {
    const result = await getControlStock("proj-1");
    expect(result).toEqual([]);
  });

  it("rechaza si el usuario no está autenticado", async () => {
    m(getSession).mockResolvedValue(null);
    await expect(getControlStock("proj-1")).rejects.toThrow(/autorizado/i);
  });

  it("rechaza si el proyecto no pertenece a la empresa (IDOR)", async () => {
    m(prisma.proyecto.findFirst).mockResolvedValue(null);
    await expect(getControlStock("proj-otro")).rejects.toThrow(/no encontrado|sin acceso/i);
  });

  it("material recibido sin avances → stockTeorico positivo, sin alerta", async () => {
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("Cemento", 100)]);

    const result = await getControlStock("proj-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      materialNombre: "Cemento",
      recibidoBodega: 100,
      consumoTeorico: 0,
      stockTeorico: 100,
      varianza: null,
      alertar: false,
    });
  });

  it("calcula el consumo teórico correctamente: avance × cantidad × (1 + porcPerdida/100)", async () => {
    // 5 unidades ejecutadas × 2 kg/unidad × 1.10 (10% pérdida) = 11 kg
    m(prisma.rubroProyecto.findMany).mockResolvedValue([
      rubroConInsumo("Mampostería", "Cemento", 2, 10, [5]),
    ]);
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("Cemento", 20)]);

    const result = await getControlStock("proj-1");

    expect(result).toHaveLength(1);
    expect(result[0].consumoTeorico).toBeCloseTo(11, 5);
    expect(result[0].stockTeorico).toBeCloseTo(9, 5); // 20 - 11
  });

  it("suma avances múltiples del mismo rubro", async () => {
    // avances: [3, 2] → total = 5 → consumo = 5 × 2 × 1.0 = 10
    m(prisma.rubroProyecto.findMany).mockResolvedValue([
      rubroConInsumo("Rubro", "Arena", 2, 0, [3, 2]),
    ]);
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("Arena", 15)]);

    const result = await getControlStock("proj-1");
    expect(result[0].consumoTeorico).toBeCloseTo(10, 5);
  });

  it("varianza negativa (conteo < stock teórico) → alertar = true", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([
      rubroConInsumo("Rubro", "Cemento", 2, 0, [5]), // consumo = 10
    ]);
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("Cemento", 20)]); // stock = 10
    m(prisma.conteoFisicoBodega.findMany).mockResolvedValue([conteo("Cemento", 8)]); // conteo = 8

    const result = await getControlStock("proj-1");

    expect(result[0].conteoFisico).toBe(8);
    expect(result[0].varianza).toBeCloseTo(-2, 5); // 8 - 10 = -2
    expect(result[0].alertar).toBe(true);
  });

  it("varianza positiva (conteo > stock teórico) → alertar = false", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([
      rubroConInsumo("Rubro", "Cemento", 1, 0, [5]), // consumo = 5
    ]);
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("Cemento", 20)]); // stock = 15
    m(prisma.conteoFisicoBodega.findMany).mockResolvedValue([conteo("Cemento", 16)]); // conteo = 16

    const result = await getControlStock("proj-1");
    expect(result[0].varianza).toBeCloseTo(1, 5); // 16 - 15
    expect(result[0].alertar).toBe(false);
  });

  it("normalización case-insensitive: 'CEMENTO' y 'cemento' se unen en el mismo material", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([
      rubroConInsumo("Rubro", "cemento", 1, 0, [5]), // consumo = 5
    ]);
    // Recepción con nombre en mayúsculas
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("CEMENTO", 20)]);

    const result = await getControlStock("proj-1");

    // Debe unirse en una sola fila con stock y consumo
    expect(result).toHaveLength(1);
    expect(result[0].recibidoBodega).toBe(20);
    expect(result[0].consumoTeorico).toBeCloseTo(5, 5);
  });

  it("múltiples rubros que comparten el mismo insumo → consumo acumulado y rubros combinados", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([
      rubroConInsumo("Mampostería", "Cemento", 2, 0, [5]), // consumo = 10
      rubroConInsumo("Enlucido",   "Cemento", 1, 0, [3]), // consumo =  3
    ]);
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("Cemento", 30)]);

    const result = await getControlStock("proj-1");

    expect(result).toHaveLength(1);
    expect(result[0].consumoTeorico).toBeCloseTo(13, 5); // 10 + 3
    expect(result[0].rubrosRelacionados).toContain("Mampostería");
    expect(result[0].rubrosRelacionados).toContain("Enlucido");
  });

  it("usa el conteo físico más reciente cuando hay varios conteos del mismo material", async () => {
    // findMany retorna ordenado desc por fecha → el primero en la lista es el más reciente
    m(prisma.conteoFisicoBodega.findMany).mockResolvedValue([
      conteo("Cemento", 15, new Date("2026-04-15")), // más reciente
      conteo("Cemento", 10, new Date("2026-04-01")), // más antiguo
    ]);
    m(prisma.recepcionBodega.findMany).mockResolvedValue([recepcion("Cemento", 20)]);

    const result = await getControlStock("proj-1");
    expect(result[0].conteoFisico).toBe(15);
  });

  it("ordena: filas alertadas primero, luego alfabético", async () => {
    m(prisma.rubroProyecto.findMany).mockResolvedValue([
      rubroConInsumo("Rubro", "Zinc", 1, 0, [5]), // consumo = 5
      rubroConInsumo("Rubro", "Arena", 1, 0, [5]), // consumo = 5
    ]);
    m(prisma.recepcionBodega.findMany).mockResolvedValue([
      recepcion("Zinc",  20), // stock = 15
      recepcion("Arena", 20), // stock = 15
    ]);
    // Arena tiene varianza negativa → alertar
    m(prisma.conteoFisicoBodega.findMany).mockResolvedValue([
      conteo("Arena", 10), // varianza = 10 - 15 = -5 → alerta
    ]);

    const result = await getControlStock("proj-1");
    expect(result[0].materialNombre).toMatch(/arena/i);
    expect(result[0].alertar).toBe(true);
    expect(result[1].alertar).toBe(false);
  });
});

// ─── crearRecepcion ───────────────────────────────────────────────────────────

describe("crearRecepcion", () => {
  it("crea la recepción con datos válidos", async () => {
    const result = await crearRecepcion("proj-1", RECEPCION_VALIDA);
    expect(result.ok).toBe(true);
    expect(prisma.recepcionBodega.create).toHaveBeenCalledOnce();
  });

  it("rechaza si el usuario no está autenticado", async () => {
    m(getSession).mockResolvedValue(null);
    await expect(crearRecepcion("proj-1", RECEPCION_VALIDA)).rejects.toThrow(/autorizado/i);
  });

  it("rechaza si el proyecto no pertenece a la empresa (IDOR)", async () => {
    m(prisma.proyecto.findFirst).mockResolvedValue(null);
    await expect(crearRecepcion("proj-otro", RECEPCION_VALIDA)).rejects.toThrow(/no encontrado|sin acceso/i);
    expect(prisma.recepcionBodega.create).not.toHaveBeenCalled();
  });

  it("rechaza cantidadRecibida ≤ 0 (Zod)", async () => {
    const result = await crearRecepcion("proj-1", { ...RECEPCION_VALIDA, cantidadRecibida: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/mayor a 0/i);
    expect(prisma.recepcionBodega.create).not.toHaveBeenCalled();
  });

  it("rechaza cantidad negativa (Zod)", async () => {
    const result = await crearRecepcion("proj-1", { ...RECEPCION_VALIDA, cantidadRecibida: -5 });
    expect(result.ok).toBe(false);
    expect(prisma.recepcionBodega.create).not.toHaveBeenCalled();
  });

  it("rechaza materialId vacío (Zod)", async () => {
    const result = await crearRecepcion("proj-1", { ...RECEPCION_VALIDA, materialId: "" });
    expect(result.ok).toBe(false);
    expect(prisma.recepcionBodega.create).not.toHaveBeenCalled();
  });

  it("rechaza fecha con formato inválido (Zod)", async () => {
    const result = await crearRecepcion("proj-1", { ...RECEPCION_VALIDA, fechaRecepcion: "18/04/2026" });
    expect(result.ok).toBe(false);
    expect(prisma.recepcionBodega.create).not.toHaveBeenCalled();
  });

  it("acepta campos opcionales omitidos", async () => {
    const result = await crearRecepcion("proj-1", {
      materialId: "mat-1",
      fechaRecepcion: "2026-04-18",
      cantidadRecibida: 10,
    });
    expect(result.ok).toBe(true);
    expect(prisma.recepcionBodega.create).toHaveBeenCalledOnce();
  });

  it("rechaza marca con más de 100 caracteres (Zod)", async () => {
    const result = await crearRecepcion("proj-1", {
      ...RECEPCION_VALIDA,
      marca: "A".repeat(101),
    });
    expect(result.ok).toBe(false);
    expect(prisma.recepcionBodega.create).not.toHaveBeenCalled();
  });
});
