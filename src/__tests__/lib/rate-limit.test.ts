/**
 * Unit tests for rate-limit.ts
 */
import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  const key = "test-key-unique";

  beforeEach(() => {
    // Reset entre tests limpando el estado
    resetRateLimit(key);
  });

  it("permite el primer intento", () => {
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
  });

  it("permite hasta 5 intentos consecutivos", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(true);
    }
  });

  it("bloquea el 6to intento", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remainingMs).toBeGreaterThan(0);
  });

  it("resetRateLimit permite volver a intentar", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    resetRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(true);
  });
});
