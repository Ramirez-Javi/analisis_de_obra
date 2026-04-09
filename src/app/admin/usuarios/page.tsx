import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UsuariosManager } from "@/components/admin/UsuariosManager";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestión de Usuarios — TEKOINNOVA",
};

async function getUsuarios() {
  return prisma.usuario.findMany({
    orderBy: [{ rol: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
      permisos: { select: { modulo: true } },
    },
  });
}

export default async function AdminUsuariosPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") redirect("/sin-acceso");

  const usuarios = await getUsuarios();

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Centro de Mando
          </Link>
          <div className="w-px h-4 dark:bg-white/10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Users size={15} className="dark:text-teal-400 text-teal-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                Gestión de Usuarios
              </p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">
                Administrá los accesos y permisos del sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100 text-slate-800">
            Usuarios del sistema
          </h1>
          <p className="mt-2 text-sm dark:text-slate-400 text-slate-500 max-w-xl">
            El administrador puede agregar hasta <strong className="dark:text-slate-300 text-slate-700">5 funcionarios</strong> con acceso
            restringido a módulos específicos del Centro de Mando.
          </p>
        </div>

        <UsuariosManager usuarios={usuarios} />
      </main>
    </div>
  );
}
