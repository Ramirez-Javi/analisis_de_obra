import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma v7 requiere un driver adapter explícito para PostgreSQL
function crearCliente() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 1,                        // límite para serverless / PgBouncer
    connectionTimeoutMillis: 10000, // 10s timeout de conexión
    idleTimeoutMillis: 10000,       // liberar conexiones idle rápido
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

// Evita múltiples instancias de PrismaClient en desarrollo (HMR de Next.js)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
