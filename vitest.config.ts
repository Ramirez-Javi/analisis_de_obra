import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["src/__tests__/e2e/**", "node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/app/**/actions.ts"],
      exclude: ["src/__tests__/**", "node_modules", ".next"],
    },
  },
});
