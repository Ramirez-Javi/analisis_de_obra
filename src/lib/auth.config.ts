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
      }
      return session;
    },
  },
};
