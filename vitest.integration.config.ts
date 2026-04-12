import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Configuración separada para integration tests.
 * Ejecuta contra la DB real (Neon) usando transacciones rollback.
 *
 * Uso:
 *   npm run test:integration
 *
 * IMPORTANTE: requiere DATABASE_URL en el entorno (lee .env.local automáticamente).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Node runtime — no jsdom, acceso real al sistema de archivos y red
    environment: "node",
    globals: true,
    setupFiles: ["./src/__tests__/integration/setup.integration.ts"],
    include: ["src/__tests__/integration/**/*.integration.{test,spec}.ts"],
    exclude: ["node_modules", ".next"],
    // Correr en serie para evitar conflictos de transacciones concurrentes
    pool: "forks",
    maxWorkers: 1,
    // Timeout alto: la DB remota puede tardar
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
