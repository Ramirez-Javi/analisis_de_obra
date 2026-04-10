import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const usuario = await prisma.usuario.findUnique({
            where: { email: credentials.email as string },
            select: {
              id: true,
              email: true,
              nombre: true,
              apellido: true,
              password: true,
              rol: true,
              activo: true,
              empresaId: true,
              permisos: { select: { modulo: true } },
            },
          });

          if (!usuario || !usuario.activo) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            usuario.password,
          );
          if (!passwordMatch) return null;

          // Registrar inicio de sesión en historial (non-blocking)
          prisma.sesionHistorial.create({
            data: { usuarioId: usuario.id },
          }).catch(() => {});

          return {
            id: usuario.id,
            email: usuario.email,
            name: [usuario.nombre, usuario.apellido].filter(Boolean).join(" "),
            role: usuario.rol,
            empresaId: usuario.empresaId,
            permisos: usuario.permisos.map((p) => p.modulo),
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
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
        (session.user as { empresaId?: string }).empresaId = token.empresaId as string | undefined;
        (session.user as { permisos?: string[] }).permisos =
          (token.permisos as string[]) ?? [];
      }
      return session;
    },
  },
});
