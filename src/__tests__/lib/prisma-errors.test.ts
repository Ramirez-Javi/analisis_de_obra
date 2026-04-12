/**
 * Unit tests for lib/prisma-errors.ts
 */
import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "@/lib/prisma-errors";

function makePrismaKnownError(code: string) {
  const err = new Prisma.PrismaClientKnownRequestError("test", {
    code,
    clientVersion: "7.0.0",
  });
  return err;
}

describe("handlePrismaError", () => {
  it("P2002 → DUPLICATE", () => {
    const result = handlePrismaError(makePrismaKnownError("P2002"));
    expect(result.code).toBe("DUPLICATE");
    expect(result.message).toMatch(/ya existe/i);
  });

  it("P2003 → FOREIGN_KEY", () => {
    const result = handlePrismaError(makePrismaKnownError("P2003"));
    expect(result.code).toBe("FOREIGN_KEY");
  });

  it("P2025 → NOT_FOUND", () => {
    const result = handlePrismaError(makePrismaKnownError("P2025"));
    expect(result.code).toBe("NOT_FOUND");
  });

  it("código desconocido → DB_ERROR", () => {
    const result = handlePrismaError(makePrismaKnownError("P9999"));
    expect(result.code).toBe("DB_ERROR");
  });

  it("Error genérico no autorizado → UNAUTHORIZED", () => {
    const result = handlePrismaError(new Error("No autorizado para esta acción"));
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("valor no-Error → UNKNOWN", () => {
    const result = handlePrismaError("un string cualquiera");
    expect(result.code).toBe("UNKNOWN");
  });

  it("null → UNKNOWN", () => {
    const result = handlePrismaError(null);
    expect(result.code).toBe("UNKNOWN");
  });
});
