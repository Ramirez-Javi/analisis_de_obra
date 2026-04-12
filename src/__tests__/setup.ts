import "@testing-library/jest-dom";

// Mock next/cache (no-op in tests)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Map()),
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

// Mock next-auth session
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

// Mock Prisma client
vi.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    proyecto: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    permisoModulo: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    movimientoFinanciero: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    cuotaPago: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    facturaProveedor: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    proveedor: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}));
