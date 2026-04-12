/**
 * Unit tests for Zod schemas (schemas/index.ts)
 */
import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registroSchema,
  passwordSchema,
  nuevoUsuarioSchema,
  proveedorSchema,
  movimientoSchema,
} from "@/lib/schemas";

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("aprueba datos válidos", () => {
    const r = loginSchema.safeParse({ email: "admin@test.com", password: "abc" });
    expect(r.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const r = loginSchema.safeParse({ email: "no-es-email", password: "abc" });
    expect(r.success).toBe(false);
  });

  it("rechaza contraseña vacía", () => {
    const r = loginSchema.safeParse({ email: "admin@test.com", password: "" });
    expect(r.success).toBe(false);
  });
});

// ─── registroSchema ───────────────────────────────────────────────────────────

describe("registroSchema", () => {
  const valid = {
    nombre: "Juan",
    apellido: "Pérez",
    email: "juan@empresa.com",
    password: "Secret1!",
  };

  it("aprueba datos válidos", () => {
    expect(registroSchema.safeParse(valid).success).toBe(true);
  });

  it("normaliza email a minúsculas", () => {
    const r = registroSchema.safeParse({ ...valid, email: "JUAN@EMPRESA.COM" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("juan@empresa.com");
  });

  it("rechaza contraseña sin mayúscula", () => {
    const r = registroSchema.safeParse({ ...valid, password: "secret1!" });
    expect(r.success).toBe(false);
  });

  it("rechaza contraseña sin número", () => {
    const r = registroSchema.safeParse({ ...valid, password: "Secreto!" });
    expect(r.success).toBe(false);
  });

  it("rechaza contraseña sin caracter especial", () => {
    const r = registroSchema.safeParse({ ...valid, password: "Secret01" });
    expect(r.success).toBe(false);
  });

  it("rechaza contraseña corta", () => {
    const r = registroSchema.safeParse({ ...valid, password: "Ab1!" });
    expect(r.success).toBe(false);
  });
});

// ─── passwordSchema ───────────────────────────────────────────────────────────

describe("passwordSchema", () => {
  it("acepta contraseña válida", () => {
    expect(passwordSchema.safeParse("Segura1!").success).toBe(true);
  });

  it("rechaza menos de 8 caracteres", () => {
    expect(passwordSchema.safeParse("Ab1!").success).toBe(false);
  });
});

// ─── nuevoUsuarioSchema ───────────────────────────────────────────────────────

describe("nuevoUsuarioSchema", () => {
  const valid = {
    nombre: "Ana",
    apellido: "García",
    email: "ana@empresa.com",
    password: "Valida1!",
    permisos: ["PROYECTO", "FINANCIERO"],
  };

  it("aprueba datos completos válidos", () => {
    expect(nuevoUsuarioSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza permisos vacíos", () => {
    const r = nuevoUsuarioSchema.safeParse({ ...valid, permisos: [] });
    expect(r.success).toBe(false);
  });

  it("rechaza nombre vacío", () => {
    const r = nuevoUsuarioSchema.safeParse({ ...valid, nombre: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza módulo inexistente en permisos", () => {
    const r = nuevoUsuarioSchema.safeParse({ ...valid, permisos: ["MODULO_FALSO"] });
    expect(r.success).toBe(false);
  });
});

// ─── proveedorSchema ──────────────────────────────────────────────────────────

describe("proveedorSchema", () => {
  it("aprueba con solo razonSocial", () => {
    const r = proveedorSchema.safeParse({ razonSocial: "Proveedor S.A." });
    expect(r.success).toBe(true);
  });

  it("rechaza razonSocial vacía", () => {
    const r = proveedorSchema.safeParse({ razonSocial: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza email de empresa inválido", () => {
    const r = proveedorSchema.safeParse({
      razonSocial: "Test S.A.",
      emailEmpresa: "no-es-email",
    });
    expect(r.success).toBe(false);
  });
});

// ─── movimientoSchema ─────────────────────────────────────────────────────────

describe("movimientoSchema", () => {
  const valid = {
    fecha: "2026-04-11",
    concepto: "Pago anticipo",
    beneficiario: "Contratista X",
    monto: 1500,
    metodoPago: "TRANSFERENCIA",
    tipo: "EGRESO",
  };

  it("aprueba movimiento válido", () => {
    expect(movimientoSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza monto negativo", () => {
    const r = movimientoSchema.safeParse({ ...valid, monto: -100 });
    expect(r.success).toBe(false);
  });

  it("rechaza monto cero", () => {
    const r = movimientoSchema.safeParse({ ...valid, monto: 0 });
    expect(r.success).toBe(false);
  });

  it("rechaza tipo inválido", () => {
    const r = movimientoSchema.safeParse({ ...valid, tipo: "OTRO" });
    expect(r.success).toBe(false);
  });
});
