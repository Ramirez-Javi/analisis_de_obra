"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// JWT sessions son stateless: el servidor lee el token de la cookie directamente.
// No hay razón para que el cliente re-fetche la sesión en cada navegación o foco.
// Desactivamos el polling para eliminar las llamadas redundantes a /api/auth/session.
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </SessionProvider>
  );
}
