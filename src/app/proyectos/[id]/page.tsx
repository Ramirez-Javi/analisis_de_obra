import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ModuleCard } from "@/components/hub/ModuleCard";
import { MODULES } from "@/components/hub/moduleData";

async function getProyecto(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, codigo: true, nombre: true },
  });
}

export default async function ProyectoHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [proyecto, session] = await Promise.all([
    getProyecto(id),
    getSession(),
  ]);
  if (!proyecto) notFound();

  const role = (session?.user as { role?: string } | undefined)?.role;
  const permisos = (session?.user as { permisos?: string[] } | undefined)?.permisos ?? [];

  // Construir módulos con href relativo al proyecto y filtrar por permisos
  const modulesConId = MODULES
    .filter((mod) => role === "ADMIN" || !session?.user || permisos.includes(mod.moduloEnum))
    .map((mod) => ({
      ...mod,
      href:
        mod.id === "proyecto"
          ? `/proyectos/${id}/ficha`
          : `/proyectos/${id}/${mod.id}`,
    }));

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Link
            href="/proyectos"
            className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
          >
            <ArrowLeft size={13} />
            Mis Proyectos
          </Link>
        </div>

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight dark:text-slate-100 text-slate-800">
            Centro de Mando
          </h1>
          <p className="mt-2 text-sm dark:text-slate-400 text-slate-500">
            Seleccioná un módulo para trabajar en{" "}
            <span className="dark:text-teal-400 text-teal-600 font-medium">
              {proyecto.nombre}
            </span>
            .
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {modulesConId.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </main>
    </div>
  );
}

