import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
