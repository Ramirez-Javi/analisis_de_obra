import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FolderOpen, LayoutDashboard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ModuleCard } from "@/components/hub/ModuleCard";
import { MODULES } from "@/components/hub/moduleData";
import type { EstadoProyecto } from "@prisma/client";

const ESTADO_CONFIG: Record<EstadoProyecto, { label: string; cls: string }> = {
  ANTEPROYECTO:       { label: "Anteproyecto",       cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  BORRADOR:           { label: "Borrador",            cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  PROYECTO_EJECUTIVO: { label: "Proyecto Ejecutivo",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  CONTRATO_CONFIRMADO:{ label: "Contrato Confirmado", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  PRESUPUESTADO:      { label: "Presupuestado",       cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  EN_EJECUCION:       { label: "En Ejecución",        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  PAUSADO:            { label: "Pausado",             cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  FINALIZADO:         { label: "Finalizado",          cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  CANCELADO:          { label: "Cancelado",           cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  OTRO:               { label: "Otro",                cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
};

async function getProyecto(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, codigo: true, nombre: true, estado: true, ubicacion: true },
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
        <nav className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Centro de Mando
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <Link
            href="/proyectos"
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            Proyectos
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="dark:text-slate-200 text-slate-700 truncate max-w-[180px]">
            {proyecto.nombre}
          </span>
        </nav>

        {/* ── Banner de contexto del proyecto ── */}
        <div className="relative mb-8 rounded-2xl overflow-hidden border dark:border-teal-900/60 border-teal-200/80">
          {/* Fondo con gradiente sutil */}
          <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-teal-950/80 dark:via-slate-900 dark:to-slate-900 bg-gradient-to-r from-teal-50 to-white" />
          {/* Línea de acento izquierda */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-teal-600 rounded-l-2xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5">
            {/* Icono */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>

            {/* Info del proyecto */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-semibold dark:text-teal-400 text-teal-600 tracking-widest uppercase">
                  {proyecto.codigo}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_CONFIG[proyecto.estado].cls}`}>
                  {ESTADO_CONFIG[proyecto.estado].label}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold dark:text-white text-slate-800 truncate">
                {proyecto.nombre}
              </h1>
              {proyecto.ubicacion && (
                <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 truncate">
                  {proyecto.ubicacion}
                </p>
              )}
            </div>

            {/* Etiqueta de contexto */}
            <div className="shrink-0 hidden sm:flex flex-col items-end gap-1">
              <span className="text-xs dark:text-slate-500 text-slate-400 uppercase tracking-widest font-medium">
                Trabajando en
              </span>
              <span className="text-xs font-semibold dark:text-teal-300 text-teal-700 bg-teal-100 dark:bg-teal-900/40 px-2.5 py-1 rounded-lg">
                Panel del Proyecto
              </span>
            </div>
          </div>
        </div>

        {/* Subtítulo de módulos */}
        <p className="text-sm dark:text-slate-400 text-slate-500 mb-5">
          Seleccioná un módulo para continuar trabajando en este proyecto.
        </p>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {modulesConId.map((mod) => (
            <ModuleCard key={mod.id} module={mod} variant="project" />
          ))}
        </div>
      </main>
    </div>
  );
}

