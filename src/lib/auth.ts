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
            select: { id: true, email: true, nombre: true, password: true, rol: true, activo: true },
          });

          if (!usuario || !usuario.activo) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            usuario.password,
          );
          if (!passwordMatch) return null;

          return {
            id: usuario.id,
            email: usuario.email,
            name: usuario.nombre,
            role: usuario.rol,
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
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
