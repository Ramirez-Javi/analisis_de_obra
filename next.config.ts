import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",

  /**
   * Security headers estáticos — aplicados a todas las rutas.
   * La Content-Security-Policy dinámica (con nonce) la gestiona src/middleware.ts.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",         value: "DENY" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", // 2 años + preload
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },

  // Reduce el bundle eliminando imports innecesarios de librerías grandes
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default withSentryConfig(nextConfig, {
  // DSN del servidor (no expuesto al cliente)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Subir source maps solo cuando hay auth token (no bloquea builds sin token)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Ocultar los source maps del bundle público
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // No mostrar logs de Sentry en build
  silent: true,

  // Deshabilitar telemetría interna de Sentry
  telemetry: false,

  // Elimina los uploads si no hay token (dev local)
  disableLogger: true,
});
