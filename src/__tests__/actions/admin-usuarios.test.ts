/**
 * Unit tests for admin/usuarios/actions.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  crearUsuario,
  cambiarPasswordUsuario,
  toggleActivarUsuario,
} from "@/app/admin/usuarios/actions";

// Mock auth() — admin-usuarios usa auth() de @/lib/auth, no getSession
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";

// Helper para acceder a mocks sin conflicto de tipos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const ADMIN_SESSION = { user: { id: "admin-id", role: "ADMIN" } };

const USUARIO_VALIDO = {
  nombre: "Ana",
  apellido: "García",
  email: "ana@empresa.com",
  password: "Valida1!",
  permisos: ["PROYECTO", "FINANCIERO"] as const,
};

beforeEach(() => {
  vi.clearAllMocks();

  m(auth).mockResolvedValue(ADMIN_SESSION);

  // findUnique: admin-id → empresaId, cualquier email o id desconocido → null
  m(prisma.usuario.findUnique).mockImplementation(
    ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id === "admin-id") return Promise.resolve({ empresaId: "emp-1" });
      return Promise.resolve(null);
    }
  );

  m(prisma.usuario.count).mockResolvedValue(0);
  m(prisma.usuario.create).mockResolvedValue({ id: "new-user" });
  m(prisma.usuario.update).mockResolvedValue({ id: "user-1" });
});

// ─── crearUsuario ─────────────────────────────────────────────────────────────

describe("crearUsuario", () => {
  it("crea usuario con datos válidos", async () => {
    const result = await crearUsuario(USUARIO_VALIDO as Parameters<typeof crearUsuario>[0]);
    expect(result.ok).toBe(true);
    expect(prisma.usuario.create).toHaveBeenCalledOnce();
  });

  it("rechaza si no es admin", async () => {
    m(auth).mockResolvedValue({ user: { id: "u1", role: "USUARIO" } });
    await expect(
      crearUsuario(USUARIO_VALIDO as Parameters<typeof crearUsuario>[0])
    ).rejects.toThrow(/administradores/i);
  });

  it("rechaza si ya existe el email", async () => {
    m(prisma.usuario.findUnique).mockImplementation(
      ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id === "admin-id") return Promise.resolve({ empresaId: "emp-1" });
        if (where.email) return Promise.resolve({ id: "existing" });
        return Promise.resolve(null);
      }
    );
    const result = await crearUsuario(USUARIO_VALIDO as Parameters<typeof crearUsuario>[0]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/correo/i);
  });

  it("rechaza si se superó el límite de 10 usuarios", async () => {
    m(prisma.usuario.count).mockResolvedValue(10);
    const result = await crearUsuario(USUARIO_VALIDO as Parameters<typeof crearUsuario>[0]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/máximo/i);
  });

  it("rechaza contraseña sin mayúscula (Zod)", async () => {
    const result = await crearUsuario({
      ...USUARIO_VALIDO,
      password: "valida1!",
    } as Parameters<typeof crearUsuario>[0]);
    expect(result.ok).toBe(false);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it("rechaza sin permisos asignados (Zod)", async () => {
    const result = await crearUsuario({
      ...USUARIO_VALIDO,
      permisos: [],
    } as unknown as Parameters<typeof crearUsuario>[0]);
    expect(result.ok).toBe(false);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });
});

// ─── cambiarPasswordUsuario ───────────────────────────────────────────────────

describe("cambiarPasswordUsuario", () => {
  it("cambia password con contraseña válida", async () => {
    const result = await cambiarPasswordUsuario("user-1", "NuevaPass1!");
    expect(result.ok).toBe(true);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    );
  });

  it("rechaza contraseña menor a 8 caracteres", async () => {
    const result = await cambiarPasswordUsuario("user-1", "Ab1!");
    expect(result.ok).toBe(false);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it("rechaza contraseña sin número", async () => {
    const result = await cambiarPasswordUsuario("user-1", "SinNumero!");
    expect(result.ok).toBe(false);
  });

  it("rechaza si no es admin", async () => {
    m(auth).mockResolvedValue({ user: { id: "u1", role: "USUARIO" } });
    await expect(cambiarPasswordUsuario("user-1", "NuevaPass1!")).rejects.toThrow(
      /administradores/i
    );
  });
});

// ─── toggleActivarUsuario ─────────────────────────────────────────────────────

describe("toggleActivarUsuario", () => {
  it("desactiva un usuario", async () => {
    const result = await toggleActivarUsuario("user-1", false);
    expect(result.ok).toBe(true);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activo: false } })
    );
  });

  it("reactiva un usuario", async () => {
    const result = await toggleActivarUsuario("user-1", true);
    expect(result.ok).toBe(true);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activo: true } })
    );
  });
});
