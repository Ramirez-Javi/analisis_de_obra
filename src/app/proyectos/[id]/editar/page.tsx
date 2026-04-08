import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EditarProyectoForm } from "@/components/proyecto/EditarProyectoForm";
import type { NuevoProyectoFormValues } from "@/components/proyecto/types";

async function getProyectoParaEditar(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      ubicacion: true,
      estado: true,
      fechaInicio: true,
      duracionSemanas: true,
      empresa: {
        select: {
          nombre: true,
          titulo: true,
          direccion: true,
          telefono: true,
          email: true,
          web: true,
          ciudad: true,
          pais: true,
          logoUrl: true,
        },
      },
      propietarios: {
        select: { nombre: true, apellido: true, direccion: true, telefono: true, email: true },
      },
      equipoTecnico: {
        select: { nombre: true, apellido: true, rol: true, titulo: true },
        orderBy: { id: "asc" },
      },
      laminas: {
        select: { codigo: true, titulo: true },
        orderBy: { codigo: "asc" },
      },
    },
  });
}

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getProyectoParaEditar(id);
  if (!p) notFound();

  // ── Mapear datos de BD → estructura del formulario ──────────────────────────
  // All team members are now stored as OTRO; order is preserved by id asc
  const equipo = p.equipoTecnico;

  const defaultValues: NuevoProyectoFormValues = {
    empresa: {
      nombre:    p.empresa?.nombre    ?? "",
      titulo:    p.empresa?.titulo    ?? "",
      direccion: p.empresa?.direccion ?? "",
      telefono:  p.empresa?.telefono  ?? "",
      email:     p.empresa?.email     ?? "",
      web:       p.empresa?.web       ?? "",
      ciudad:    p.empresa?.ciudad    ?? "",
      pais:      p.empresa?.pais      ?? "",
      logoUrl:   p.empresa?.logoUrl   ?? "",
    },
    nombre:          p.nombre          ?? "",
    ubicacion:       p.ubicacion        ?? "",
    descripcion:     p.descripcion      ?? "",
    codigo:          p.codigo           ?? "",
    estado:          p.estado          ?? "ANTEPROYECTO",
    fechaInicio:     p.fechaInicio ? p.fechaInicio.toISOString().slice(0, 10) : "",
    duracionSemanas: p.duracionSemanas != null ? String(p.duracionSemanas) : "",
    propietarios:
      p.propietarios.length > 0
        ? p.propietarios.map((prop) => ({
            nombre:    [prop.nombre, prop.apellido].filter(Boolean).join(" "),
            direccion: prop.direccion ?? "",
            telefono:  prop.telefono  ?? "",
            email:     prop.email     ?? "",
          }))
        : [{ nombre: "", direccion: "", telefono: "", email: "" }],
    equipoElaboracion:      equipo[0] ? [equipo[0].nombre, equipo[0].apellido].filter(Boolean).join(" ") : "",
    equipoElaboracionCargo: equipo[0]?.titulo ?? "",
    equipoPlanos:           equipo[1] ? [equipo[1].nombre, equipo[1].apellido].filter(Boolean).join(" ") : "",
    equipoPlanosCargo:      equipo[1]?.titulo ?? "",
    equipoRenders:          equipo[2] ? [equipo[2].nombre, equipo[2].apellido].filter(Boolean).join(" ") : "",
    equipoRendersCargo:     equipo[2]?.titulo ?? "",
    laminas:
      p.laminas.length > 0
        ? p.laminas.map((l) => ({ codigo: l.codigo, nombre: l.titulo }))
        : [{ codigo: "", nombre: "" }],
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      <div className="sticky top-[52px] z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href={`/proyectos/${id}/ficha`}
            className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
          >
            <ArrowLeft size={15} />
            Ficha Técnica
          </Link>
          <div className="w-px h-4 dark:bg-white/10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Pencil size={15} className="dark:text-teal-400 text-teal-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                Editar Proyecto
              </p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">
                {p.codigo} · Módulo 1
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <EditarProyectoForm proyectoId={id} defaultValues={defaultValues} />
      </main>
    </div>
  );
}
