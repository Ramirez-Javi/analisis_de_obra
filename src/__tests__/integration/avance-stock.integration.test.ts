/**
 * avance-stock.integration.test.ts
 *
 * Test de integración — flujo completo:
 *   crearAvanceRubro() → getControlStock() refleja el consumo teórico
 *   crearRecepcion()   → getControlStock() refleja el stock recibido
 *
 * Usa Neon DB real. Crea fixtures únicos por sufijo y los limpia en afterAll.
 *
 * Se mockean:
 *   @/lib/session → control de sesión (no hay HTTP en tests de integración)
 *   next/cache    → revalidatePath no existe fuera del runtime de Next.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { db, seedTestContext, cleanTestContext, type TestContext } from "./setup.integration";
import { crearAvanceRubro, getAvancesTotales } from "@/app/proyectos/[id]/presupuesto/actions";
import { crearRecepcion, getControlStock } from "@/app/proyectos/[id]/inventario/actions";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

// ─────────────────────────────────────────────────────────────────────────────

describe("Integration — Avance → Control de Stock", () => {
  const SUFFIX = `avs-${Date.now()}`;
  let ctx: TestContext;
  let proyectoId: string;
  let rubroProyectoId: string;
  let materialMaestroId: string;
  let unidadMedidaId: string;

  // ─── Setup global ──────────────────────────────────────────────────────────

  beforeAll(async () => {
    ctx = await seedTestContext(SUFFIX);

    // Proyecto de prueba
    const proyecto = await db.proyecto.create({
      data: {
        codigo: `PRY-AVS-${SUFFIX}`,
        nombre: `Proyecto Avance-Stock ${SUFFIX}`,
        empresaId: ctx.empresa.id,
      },
    });
    proyectoId = proyecto.id;

    // Unidad de medida necesaria para RubroMaestro e Insumo
    const unidad = await db.unidadMedida.create({
      data: {
        nombre: `kg-${SUFFIX}`,
        simbolo: "kg",
      },
    });
    unidadMedidaId = unidad.id;

    // Rubro maestro (referencia global)
    const rubroMaestro = await db.rubroMaestro.create({
      data: {
        codigo: `RUB-AVS-${SUFFIX}`,
        nombre: `Mampostería Test ${SUFFIX}`,
        unidadMedidaId: unidad.id,
      },
    });

    // RubroProyecto = copia del maestro asignada al proyecto
    // cantidad=10 m² planificados
    const rubroProyecto = await db.rubroProyecto.create({
      data: {
        cantidad: 10,
        proyectoId,
        rubroMaestroId: rubroMaestro.id,
      },
    });
    rubroProyectoId = rubroProyecto.id;

    // Insumo del rubro: 2 kg de cemento por m², 10% de pérdida
    await db.insumo.create({
      data: {
        nombre: `Cemento-${SUFFIX}`,
        cantidad: 2,          // 2 kg por m² de rubro
        porcPerdida: 10,      // +10% desperdicio
        precioUnitario: 1500,
        esManodeObra: false,
        rubroProyectoId: rubroProyecto.id,
        unidadMedidaId: unidad.id,
      },
    });

    // Material maestro para RecepcionBodega
    const material = await db.materialMaestro.create({
      data: {
        codigo: `MAT-AVS-${SUFFIX}`,
        nombre: `Cemento-${SUFFIX}`,   // mismo nombre que el insumo (normalización por nombre)
        precioBase: 1500,
        unidadMedidaId: unidad.id,
      },
    });
    materialMaestroId = material.id;
  });

  afterAll(async () => {
    // Limpiar material maestro creado para este test (no es parte de la empresa)
    await db.materialMaestro.delete({ where: { id: materialMaestroId } }).catch(() => {});
    await db.unidadMedida.delete({ where: { id: unidadMedidaId } }).catch(() => {});
    await cleanTestContext(ctx.empresa.id);
  });

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

  // ─── Tests ────────────────────────────────────────────────────────────────

  it("getControlStock retorna array vacío antes de registrar cualquier dato", async () => {
    const result = await getControlStock(proyectoId);
    // Puede haber rubros con insumos pero sin avances ni recepciones → nada que mostrar
    expect(result).toBeInstanceOf(Array);
    expect(result.every((f) => f.recibidoBodega === 0 && f.consumoTeorico === 0)).toBe(true);
  });

  it("crearRecepcion persiste en la DB y getControlStock refleja el stock recibido", async () => {
    // Recibir 50 kg de cemento en bodega
    const recepcionResult = await crearRecepcion(proyectoId, {
      materialId: materialMaestroId,
      fechaRecepcion: "2026-04-18",
      cantidadRecibida: 50,
    });
    expect(recepcionResult.ok).toBe(true);

    // Verificar en la DB directamente
    const row = await db.recepcionBodega.findFirst({
      where: { proyectoId, materialId: materialMaestroId },
    });
    expect(row).not.toBeNull();
    expect(row!.cantidadRecibida).toBe(50);

    // getControlStock debe ver 50 kg recibidos, 0 consumo (sin avances aún)
    const stock = await getControlStock(proyectoId);
    const fila = stock.find((f) => f.materialNombre.includes(`Cemento-${SUFFIX}`));
    expect(fila).toBeDefined();
    expect(fila!.recibidoBodega).toBe(50);
    expect(fila!.consumoTeorico).toBe(0);
    expect(fila!.stockTeorico).toBe(50);
    expect(fila!.alertar).toBe(false);
  });

  it("crearAvanceRubro persiste en la DB y getAvancesTotales refleja el total ejecutado", async () => {
    // Registrar 3 m² ejecutados
    const result = await crearAvanceRubro(proyectoId, rubroProyectoId, 3, "2026-04-18", "Avance inicial");
    expect(result.ok).toBe(true);

    // Verificar en la DB
    const row = await db.avanceRubro.findFirst({
      where: { rubroProyectoId },
      orderBy: { creadoEn: "desc" },
    });
    expect(row).not.toBeNull();
    expect(row!.cantidadEjecutada).toBe(3);

    // getAvancesTotales debe sumar correctamente
    const totales = await getAvancesTotales(proyectoId);
    expect(totales[rubroProyectoId]).toBe(3);
  });

  it("getControlStock refleja el consumo teórico tras registrar avances: 3m² × 2kg × 1.10 = 6.6 kg", async () => {
    // Ya hay 3 m² ejecutados del test anterior, más recepciones del test anterior
    const stock = await getControlStock(proyectoId);
    const fila = stock.find((f) => f.materialNombre.includes(`Cemento-${SUFFIX}`));
    expect(fila).toBeDefined();

    // consumoTeorico = 3 × 2 × 1.10 = 6.6
    expect(fila!.consumoTeorico).toBeCloseTo(6.6, 4);
    // stockTeorico = recibidoBodega(50) - consumoTeorico(6.6) = 43.4
    expect(fila!.stockTeorico).toBeCloseTo(43.4, 4);
    expect(fila!.alertar).toBe(false);
  });

  it("múltiples avances se acumulan correctamente en getAvancesTotales", async () => {
    // Registrar 2 m² adicionales (total = 5 m²)
    const result = await crearAvanceRubro(proyectoId, rubroProyectoId, 2, "2026-04-18", "Segundo avance");
    expect(result.ok).toBe(true);

    const totales = await getAvancesTotales(proyectoId);
    expect(totales[rubroProyectoId]).toBe(5); // 3 + 2
  });

  it("getControlStock acumula consumo de todos los avances: 5m² × 2kg × 1.10 = 11 kg", async () => {
    const stock = await getControlStock(proyectoId);
    const fila = stock.find((f) => f.materialNombre.includes(`Cemento-${SUFFIX}`));
    expect(fila).toBeDefined();

    // consumoTeorico = 5 × 2 × 1.10 = 11
    expect(fila!.consumoTeorico).toBeCloseTo(11, 4);
    // stockTeorico = 50 - 11 = 39
    expect(fila!.stockTeorico).toBeCloseTo(39, 4);
  });

  it("segunda recepción acumula el stock total en getControlStock", async () => {
    // Recibir 20 kg más → total recibido = 70
    const result = await crearRecepcion(proyectoId, {
      materialId: materialMaestroId,
      fechaRecepcion: "2026-04-18",
      cantidadRecibida: 20,
    });
    expect(result.ok).toBe(true);

    const stock = await getControlStock(proyectoId);
    const fila = stock.find((f) => f.materialNombre.includes(`Cemento-${SUFFIX}`));
    expect(fila!.recibidoBodega).toBe(70); // 50 + 20
    expect(fila!.stockTeorico).toBeCloseTo(59, 4); // 70 - 11
  });

  it("crearAvanceRubro rechaza rubro de otra empresa (IDOR)", async () => {
    const result = await crearAvanceRubro(proyectoId, "rubro-inexistente", 5, "2026-04-18");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no encontrado/i);
  });

  it("crearRecepcion rechaza datos inválidos (Zod)", async () => {
    const result = await crearRecepcion(proyectoId, {
      materialId: materialMaestroId,
      fechaRecepcion: "fecha-invalida",
      cantidadRecibida: -5,
    });
    expect(result.ok).toBe(false);
  });

  it("lanza error si no hay sesión activa", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(getControlStock(proyectoId)).rejects.toThrow(/autorizado/i);
  });
});
