/**
 * compras.integration.test.ts
 *
 * Tests de integración para crearFactura, actualizarEstadoFactura,
 * eliminarFactura y getProveedoresDelProyecto — con Neon DB real.
 *
 * Se mockean:
 *  - @/lib/session → control de sesión activa
 *  - next/cache    → revalidatePath no existe fuera de Next.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import {
  db,
  seedTestContext,
  cleanTestContext,
  type TestContext,
} from "./setup.integration";
import {
  crearFactura,
  actualizarEstadoFactura,
  eliminarFactura,
  getProveedoresDelProyecto,
} from "@/app/proyectos/[id]/compras/actions";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

// ─────────────────────────────────────────────────────────────
// Suite principal
// ─────────────────────────────────────────────────────────────
describe("Integration — Compras", () => {
  const SUFFIX = `cmp-${Date.now()}`;
  let ctx: TestContext;
  let proyectoId: string;
  let proveedorId: string;

  beforeAll(async () => {
    ctx = await seedTestContext(SUFFIX);

    const proyecto = await db.proyecto.create({
      data: {
        codigo: `PRY-CMP-${SUFFIX}`,
        nombre: `Proyecto Compras ${SUFFIX}`,
        empresaId: ctx.empresa.id,
      },
    });
    proyectoId = proyecto.id;

    const proveedor = await db.proveedor.create({
      data: {
        razonSocial: `Proveedor Test ${SUFFIX}`,
        ruc: `RUC-${SUFFIX}`,
        empresaId: ctx.empresa.id,
      },
    });
    proveedorId = proveedor.id;
  });

  afterAll(async () => {
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

  // ── CREAR FACTURA ────────────────────────────────────────────

  it("crea una factura en la DB y retorna { ok: true }", async () => {
    const result = await crearFactura(proyectoId, {
      nroFactura: `F001-${SUFFIX}`,
      fecha: "2026-04-15",
      concepto: "Materiales de construcción",
      monto: 1_200_000,
      proveedorId,
    });

    expect(result).toEqual({ ok: true });

    const row = await db.facturaProveedor.findFirst({
      where: { proyectoId, proveedorId, nroFactura: `F001-${SUFFIX}` },
    });
    expect(row).not.toBeNull();
    expect(Number(row!.monto)).toBeCloseTo(1_200_000, 0);
    expect(row!.estado).toBe("PENDIENTE"); // estado inicial por defecto
  });

  it("crea factura con fecha de vencimiento opcional", async () => {
    const result = await crearFactura(proyectoId, {
      nroFactura: `F002-${SUFFIX}`,
      fecha: "2026-04-16",
      concepto: "Servicio topografía",
      monto: 350_000,
      proveedorId,
      fechaVencimiento: "2026-05-16",
      observacion: "30 días plazo",
    });

    expect(result).toEqual({ ok: true });

    const row = await db.facturaProveedor.findFirst({
      where: { nroFactura: `F002-${SUFFIX}` },
    });
    expect(row?.fechaVencimiento).not.toBeNull();
  });

  // ── ACTUALIZAR ESTADO ────────────────────────────────────────

  it("marca una factura como PAGADA con monto pagado", async () => {
    // Crear factura primero
    await crearFactura(proyectoId, {
      nroFactura: `F003-${SUFFIX}`,
      fecha: "2026-04-17",
      concepto: "Alquiler maquinaria",
      monto: 800_000,
      proveedorId,
    });

    const factura = await db.facturaProveedor.findFirst({
      where: { nroFactura: `F003-${SUFFIX}` },
    });
    expect(factura).not.toBeNull();

    const result = await actualizarEstadoFactura(
      proyectoId,
      factura!.id,
      "PAGADA",
      800_000
    );
    expect(result).toEqual({ ok: true });

    const actualizada = await db.facturaProveedor.findUnique({
      where: { id: factura!.id },
    });
    expect(actualizada?.estado).toBe("PAGADA");
    expect(Number(actualizada?.montoPagado)).toBeCloseTo(800_000, 0);
  });

  it("marca una factura como ANULADA", async () => {
    await crearFactura(proyectoId, {
      nroFactura: `F004-${SUFFIX}`,
      fecha: "2026-04-18",
      concepto: "Servicio anulado",
      monto: 100_000,
      proveedorId,
    });

    const factura = await db.facturaProveedor.findFirst({
      where: { nroFactura: `F004-${SUFFIX}` },
    });
    const result = await actualizarEstadoFactura(proyectoId, factura!.id, "ANULADA");
    expect(result).toEqual({ ok: true });

    const actualizada = await db.facturaProveedor.findUnique({
      where: { id: factura!.id },
    });
    expect(actualizada?.estado).toBe("ANULADA");
  });

  // ── ELIMINAR FACTURA ─────────────────────────────────────────

  it("elimina una factura de la DB y retorna { ok: true }", async () => {
    await crearFactura(proyectoId, {
      nroFactura: `F005-${SUFFIX}`,
      fecha: "2026-04-19",
      concepto: "Factura para eliminar",
      monto: 50_000,
      proveedorId,
    });

    const factura = await db.facturaProveedor.findFirst({
      where: { nroFactura: `F005-${SUFFIX}` },
    });
    expect(factura).not.toBeNull();

    const result = await eliminarFactura(proyectoId, factura!.id);
    expect(result).toEqual({ ok: true });

    const borrada = await db.facturaProveedor.findUnique({
      where: { id: factura!.id },
    });
    expect(borrada).toBeNull();
  });

  // ── DECIMAL → NUMBER ─────────────────────────────────────────

  it("getProveedoresDelProyecto retorna monto y montoPagado como number", async () => {
    const proveedores = await getProveedoresDelProyecto(proyectoId);

    expect(proveedores.length).toBeGreaterThan(0);

    for (const p of proveedores) {
      for (const f of p.facturas) {
        expect(typeof f.monto).toBe("number");
        expect(typeof f.montoPagado).toBe("number");
      }
    }
  });

  it("getProveedoresDelProyecto solo incluye proveedores con facturas en este proyecto", async () => {
    // Proveedor sin facturas en ningún lado
    const proveedorSinFacturas = await db.proveedor.create({
      data: {
        razonSocial: `Sin-Facturas-${SUFFIX}`,
        empresaId: ctx.empresa.id,
      },
    });

    const proveedores = await getProveedoresDelProyecto(proyectoId);
    const ids = proveedores.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(proveedorSinFacturas.id);
  });

  // ── SIN SESIÓN ───────────────────────────────────────────────

  it("lanza error si no hay sesión activa", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(
      crearFactura(proyectoId, {
        nroFactura: `F-UNAUTH`,
        fecha: "2026-04-20",
        concepto: "Sin sesión",
        monto: 1,
        proveedorId,
      })
    ).rejects.toThrow(/autorizado/i);
  });
});
