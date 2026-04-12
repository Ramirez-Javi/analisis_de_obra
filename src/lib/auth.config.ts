import type { NextAuthConfig } from "next-auth";

/**
 * Configuración de NextAuth sin dependencias de Node.js (Edge-safe).
 * Usada por proxy.ts (Edge Runtime) y extendida por auth.ts (Node.js Runtime).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8-hour sessions
  pages: {
    signIn: "/login",
  },
  // Los providers se agregan en auth.ts — aquí no va Prisma
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.empresaId = (user as { empresaId?: string }).empresaId;
        token.permisos = (user as { permisos?: string[] }).permisos ?? [];
        // activo y lastValidated los gestiona auth.ts (Node.js) en su jwt callback extendido
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { empresaId?: string }).empresaId =
          token.empresaId as string | undefined;
        (session.user as { permisos?: string[] }).permisos =
          (token.permisos as string[]) ?? [];
        // Exponer activo en la sesión para que proxy.ts pueda verificarlo
        // Default true para que sessiones legacy (sin activo en token) no se rompan
        (session.user as { activo?: boolean }).activo =
          (token.activo as boolean | undefined) ?? true;
      }
      return session;
    },
  },
};
