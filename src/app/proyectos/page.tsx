import Link from "next/link";
import { ArrowLeft, Plus, FolderOpen, MapPin, User, ArrowRight, Calculator, Info, Archive } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DeleteProyectoButton } from "@/components/proyecto/DeleteProyectoButton";
import { PapeleraProyectos } from "@/components/proyecto/PapeleraProyectos";

async function getProyectos() {
  const session = await getSession();
  if (!session?.user) return [];
  const empresaId = (session.user as { empresaId?: string }).empresaId;
  return prisma.proyecto.findMany({
    where: { empresaId: empresaId ?? undefined, archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      ubicacion: true,
      createdAt: true,
      propietarios: { select: { nombre: true }, take: 1 },
    },
  });
}

async function getProyectosArchivados() {
  const session = await getSession();
  if (!session?.user) return [];
  const empresaId = (session.user as { empresaId?: string }).empresaId;
  return prisma.proyecto.findMany({
    where: { empresaId: empresaId ?? undefined, archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      archivedAt: true,
    },
  });
}

const MODULO_LABELS: Record<string, string> = {
  financiero: "Estado Financiero",
  compras:    "Proveedores y Compras",
};

export default async function ProyectosLobbyPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string }>;
}) {
  const { modulo } = await searchParams;
  const [proyectos, archivados] = await Promise.all([
    getProyectos(),
    getProyectosArchivados(),
  ]);
  const moduloLabel = modulo ? MODULO_LABELS[modulo] : null;

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
          >
            <ArrowLeft size={15} />
            Centro de Mando
          </Link>
          <div className="w-px h-4 dark:bg-white/10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <FolderOpen size={15} className="dark:text-blue-400 text-blue-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                Proyectos
              </p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">
                Módulo 1 — Seleccioná o creá un proyecto
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Encabezado */}
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight dark:text-slate-100 text-slate-800">
              Mis Proyectos
            </h1>
            <p className="mt-1.5 text-sm dark:text-slate-400 text-slate-500">
              Seleccioná un proyecto para ver o editar su ficha.
            </p>
          </div>
          <Link
            href="/proyectos/nuevo"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors duration-150 shadow-lg shadow-teal-500/25"
          >
            <Plus size={16} />
            Nuevo Proyecto
          </Link>
        </div>

        {/* Banner informativo cuando viene desde tarjeta proyecto-específica */}
        {moduloLabel && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              El módulo <span className="font-semibold">{moduloLabel}</span> es específico de cada proyecto.
              Seleccioná un proyecto para acceder a él.
            </p>
          </div>
        )}

        {/* Estado vacío */}
        {proyectos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center">
              <FolderOpen size={28} className="dark:text-teal-400 text-teal-600" />
            </div>
            <div>
              <p className="text-base font-semibold dark:text-slate-200 text-slate-700 mb-1">
                No hay proyectos aún
              </p>
              <p className="text-sm dark:text-slate-500 text-slate-400">
                Creá tu primer proyecto para comenzar a trabajar.
              </p>
            </div>
            <Link
              href="/proyectos/nuevo"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors duration-150"
            >
              <Plus size={15} />
              Crear primer proyecto
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proyectos.map((p) => (
              <div
                key={p.id}
                className="group relative flex flex-col rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white shadow-sm dark:shadow-none overflow-hidden transition-all duration-300"
              >
                {/* Línea superior en hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-70 transition-opacity duration-300" />

                {/* Zona superior — click → ficha */}
                <Link
                  href={`/proyectos/${p.id}/ficha`}
                  className="flex flex-col p-5 pb-4 flex-1 hover:bg-white/[0.02] transition-colors duration-150"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                      <FolderOpen size={19} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold dark:text-slate-100 text-slate-800 truncate">
                        {p.nombre}
                      </p>
                      <p className="text-[11px] font-mono dark:text-blue-400 text-blue-600 mt-0.5">
                        {p.codigo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-1.5">
                    {p.ubicacion && (
                      <p className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{p.ubicacion}</span>
                      </p>
                    )}
                    {p.propietarios[0] && (
                      <p className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500">
                        <User size={11} className="shrink-0" />
                        <span className="truncate">{p.propietarios[0].nombre}</span>
                      </p>
                    )}
                    <p className="text-[11px] dark:text-slate-600 text-slate-400 mt-0.5">
                      Creado{" "}
                      {new Date(p.createdAt).toLocaleDateString("es-PY", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </Link>

                {/* Barra inferior de acciones */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t dark:border-white/[0.05] border-slate-100">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/proyectos/${p.id}/ficha`}
                      className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700 transition-colors duration-150"
                    >
                      <ArrowRight size={12} />
                      Ver ficha
                    </Link>
                    <DeleteProyectoButton id={p.id} nombre={p.nombre} />
                  </div>
                  <Link
                    href={`/proyectos/${p.id}/presupuesto`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors duration-150 shadow-md shadow-emerald-500/20"
                  >
                    <Calculator size={12} />
                    Abrir Presupuesto
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Papelera ─────────────────────────────────────────── */}
        {archivados.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <Archive size={15} className="dark:text-slate-500 text-slate-400" />
              <h2 className="text-sm font-semibold dark:text-slate-400 text-slate-500">
                Papelera ({archivados.length})
              </h2>
            </div>
            <PapeleraProyectos proyectos={archivados} />
          </div>
        )}
      </main>
    </div>
  );
}
