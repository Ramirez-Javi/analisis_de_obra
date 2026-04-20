import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { checkRateLimit, resetRateLimit } from "./rate-limit";
import { loginSchema } from "./schemas";
import { verifyTotpCode } from "./totp";
import { decryptTotpSecret } from "./crypto";
import { logger } from "./logger";

const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        totpCode: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Validar formato con Zod antes de tocar la base de datos
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Rate limiting por IP — máx. 5 intentos en 15 minutos
        // Usar IP como clave evita la enumeración de usuarios: un atacante
        // no puede rotar entre diferentes cuentas desde la misma dirección.
        const clientIp =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request?.headers?.get("x-real-ip") ??
          null;
        const rlKey = clientIp ?? email;
        const rl = checkRateLimit(rlKey);
        if (!rl.allowed) {
          const minLeft = Math.ceil((rl.remainingMs ?? 0) / 60_000);
          throw new Error(
            `Demasiados intentos fallidos. Intentá nuevamente en ${minLeft} min.`
          );
        }

        try {
          const usuario = await prisma.usuario.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              nombre: true,
              apellido: true,
              password: true,
              rol: true,
              activo: true,
              empresaId: true,
              totpEnabled: true,
              totpSecret: true,
              permisos: { select: { modulo: true } },
            },
          });

          if (!usuario || !usuario.activo) return null;

          const passwordMatch = await bcrypt.compare(password, usuario.password);
          if (!passwordMatch) return null;

          // ── Verificación 2FA ──────────────────────────────────────────
          if (usuario.totpEnabled && usuario.totpSecret) {
            const totpCode = (credentials.totpCode as string | undefined)?.trim();
            if (!totpCode) {
              throw new Error("2FA_REQUIRED");
            }
            // Descifrar el secreto antes de verificar (compatibilidad backward)
            const secretPlaintext = decryptTotpSecret(usuario.totpSecret);
            if (!verifyTotpCode(secretPlaintext, totpCode)) {
              throw new Error("Código 2FA incorrecto. Intentá nuevamente.");
            }
          }

          // Login exitoso — resetear contador
          resetRateLimit(rlKey);

          // Capturar IP y UserAgent para el historial de sesiones
          const ip = clientIp;
          const userAgent = request?.headers?.get("user-agent") ?? null;

          // Registrar inicio de sesión en historial (non-blocking)
          prisma.sesionHistorial
            .create({ data: { usuarioId: usuario.id, ipAddress: ip, userAgent } })
            .catch(() => {});

          return {
            id: usuario.id,
            email: usuario.email,
            name: [usuario.nombre, usuario.apellido].filter(Boolean).join(" "),
            role: usuario.rol,
            empresaId: usuario.empresaId,
            permisos: usuario.permisos.map((p) => p.modulo),
          };
        } catch (err) {
          // Re-throw rate limit errors
          if (err instanceof Error && err.message.startsWith("Demasiados")) throw err;
          logger.error("auth", "authorize error", { err });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Extiende el callback jwt de authConfig con re-validación periódica de activo+permisos.
     * Cada 5 minutos consulta la DB para verificar que el usuario sigue activo
     * y que sus permisos no cambiaron.
     * Se ejecuta en Node.js runtime (no Edge) — tiene acceso a Prisma.
     */
    async jwt({ token, user }) {
      // Paso 1: setup inicial en el momento del login
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.empresaId = (user as { empresaId?: string }).empresaId;
        token.permisos = (user as { permisos?: string[] }).permisos ?? [];
        token.activo = true;
        token.lastValidated = Date.now();
        return token;
      }

      // Paso 2: re-validación periódica (cada 5 min) — sin login reciente
      const now = Date.now();
      const lastValidated = (token.lastValidated as number | undefined) ?? 0;
      if (token.id && now - lastValidated > REVALIDATE_INTERVAL_MS) {
        try {
          const u = await prisma.usuario.findUnique({
            where: { id: token.id as string },
            select: {
              activo: true,
              permisos: { select: { modulo: true } },
            },
          });
          token.activo = u?.activo ?? false;
          token.permisos = u?.permisos.map((p) => p.modulo) ?? [];
          token.lastValidated = now;
        } catch {
          // Fallo de DB: no invalidar la sesión, simplemente no actualizar
          // El usuario seguirá con los permisos del token anterior
        }
      }

      return token;
    },
  },
});
