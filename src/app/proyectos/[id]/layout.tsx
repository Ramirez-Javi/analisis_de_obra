import { notFound } from "next/navigation";
import { MapPin, User, HardHat } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getProyecto(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: {
      codigo: true,
      nombre: true,
      ubicacion: true,
      propietarios: {
        select: { nombre: true, apellido: true },
        take: 1,
      },
      equipoTecnico: {
        where: { rol: "ARQUITECTO" },
        select: { nombre: true, apellido: true },
        take: 1,
      },
    },
  });
}

export default async function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyecto = await getProyecto(id);
  if (!proyecto) notFound();

  const propietario = proyecto.propietarios[0];
  const responsable = proyecto.equipoTecnico[0];

  return (
    <>
      {/* ── Barra de contexto del proyecto — sticky, h-[52px] ── */}
      <div className="sticky top-0 z-50 h-[52px] flex items-center border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/95 bg-white/95 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3 flex-wrap">

          {/* Código + Nombre */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md dark:bg-teal-500/10 bg-teal-50 dark:text-teal-400 text-teal-700 border dark:border-teal-500/20 border-teal-200">
              {proyecto.codigo}
            </span>
            <span className="text-sm font-bold dark:text-slate-100 text-slate-800 max-w-[200px] sm:max-w-xs truncate">
              {proyecto.nombre}
            </span>
          </div>

          <div className="w-px h-4 dark:bg-white/10 bg-slate-200 hidden sm:block shrink-0" />

          {/* Meta: ubicación, propietario, responsable */}
          <div className="hidden sm:flex items-center gap-4">
            {proyecto.ubicacion && (
              <span className="flex items-center gap-1 text-[11px] dark:text-slate-400 text-slate-500">
                <MapPin size={10} className="shrink-0" />
                {proyecto.ubicacion}
              </span>
            )}
            {propietario && (
              <span className="flex items-center gap-1 text-[11px] dark:text-slate-400 text-slate-500">
                <User size={10} className="shrink-0" />
                {propietario.nombre} {propietario.apellido}
              </span>
            )}
            {responsable && (
              <span className="flex items-center gap-1 text-[11px] dark:text-slate-400 text-slate-500">
                <HardHat size={10} className="shrink-0" />
                Arq. {responsable.nombre} {responsable.apellido}
              </span>
            )}
          </div>
        </div>
      </div>

      {children}
    </>
  );
}
