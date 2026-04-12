/**
 * Unit tests for registro/actions.ts — registrarUsuario()
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { registrarUsuario } from "@/app/registro/actions";

const mockPrisma = prisma as unknown as {
  usuario: {
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

// El mock de prisma está en setup.ts, aquí solo accedemos a los mocks
const mockCount = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Por defecto: sin usuarios existentes, count = 0
  (mockPrisma.usuario.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (prisma.usuario as { count?: ReturnType<typeof vi.fn> }).count = mockCount;
  mockCount.mockResolvedValue(0);
  (mockPrisma.usuario.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1" });
});

const DATOS_VALIDOS = {
  nombre: "Carlos",
  apellido: "Ramírez",
  email: "carlos@empresa.com",
  password: "Segura1!",
};

describe("registrarUsuario", () => {
  it("crea el primer usuario exitosamente (ADMIN)", async () => {
    const result = await registrarUsuario(DATOS_VALIDOS);
    expect(result.ok).toBe(true);
    expect(mockPrisma.usuario.create).toHaveBeenCalledOnce();
  });

  it("rechaza si ya existe un usuario registrado (totalUsuarios > 0)", async () => {
    mockCount.mockResolvedValue(1);
    const result = await registrarUsuario(DATOS_VALIDOS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/administrador/i);
  });

  it("rechaza si el email ya está en uso", async () => {
    (mockPrisma.usuario.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing" });
    const result = await registrarUsuario(DATOS_VALIDOS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/correo/i);
  });

  it("rechaza email malformado (validación Zod)", async () => {
    const result = await registrarUsuario({ ...DATOS_VALIDOS, email: "no-email" });
    expect(result.ok).toBe(false);
    expect(mockPrisma.usuario.create).not.toHaveBeenCalled();
  });

  it("rechaza contraseña débil (sin mayúscula)", async () => {
    const result = await registrarUsuario({ ...DATOS_VALIDOS, password: "segura1!" });
    expect(result.ok).toBe(false);
    expect(mockPrisma.usuario.create).not.toHaveBeenCalled();
  });

  it("rechaza contraseña sin carácter especial", async () => {
    const result = await registrarUsuario({ ...DATOS_VALIDOS, password: "Segura12" });
    expect(result.ok).toBe(false);
  });
});
