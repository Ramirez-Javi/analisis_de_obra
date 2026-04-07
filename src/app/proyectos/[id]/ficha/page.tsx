import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutGrid,
  Building2,
  MapPin,
  User,
  Users,
  HardHat,
  FileImage,
  CalendarDays,
  Ruler,
  FileText,
  Globe,
  Phone,
  Mail,
  Pencil,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getFicha(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      ubicacion: true,
      superficieM2: true,
      fechaInicio: true,
      fechaFinEstimada: true,
      estado: true,
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
        },
      },
      propietarios: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          direccion: true,
          telefono: true,
          email: true,
        },
      },
      equipoTecnico: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          rol: true,
        },
      },
      laminas: {
        select: {
          id: true,
          codigo: true,
          titulo: true,
          disciplina: true,
        },
        orderBy: { codigo: "asc" },
      },
    },
  });
}

function SectionCard({
  icon: Icon,
  title,
  children,
  accent = "text-blue-400",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-6 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} className={accent} />
        <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold dark:text-slate-500 text-slate-400 mb-0.5">
        {label}
      </p>
      <p className="text-sm dark:text-slate-200 text-slate-700">
        {value || <span className="dark:text-slate-600 text-slate-400 italic">—</span>}
      </p>
    </div>
  );
}

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  PRESUPUESTADO: "Presupuestado",
  EN_EJECUCION: "En ejecución",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};
const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-300 text-slate-600",
  PRESUPUESTADO: "dark:bg-blue-500/15 bg-blue-50 dark:text-blue-300 text-blue-700",
  EN_EJECUCION: "dark:bg-teal-500/15 bg-teal-50 dark:text-teal-300 text-teal-700",
  PAUSADO: "dark:bg-amber-500/15 bg-amber-50 dark:text-amber-300 text-amber-700",
  FINALIZADO: "dark:bg-emerald-500/15 bg-emerald-50 dark:text-emerald-300 text-emerald-700",
  CANCELADO: "dark:bg-red-500/15 bg-red-50 dark:text-red-300 text-red-700",
};
const ROL_LABELS: Record<string, string> = {
  ARQUITECTO: "Arquitecto",
  INGENIERO: "Ingeniero",
  DIBUJANTE: "Dibujante",
  OTRO: "Responsable",
};

export default async function FichaProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getFicha(id);
  if (!p) notFound();

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      {/* Toolbar */}
      <div className="sticky top-[52px] z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/90 bg-white/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/proyectos"
              className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150"
            >
              <ArrowLeft size={13} />
              Mis Proyectos
            </Link>
            <div className="w-px h-3.5 dark:bg-white/10 bg-slate-200" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                Ficha Técnica
              </p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">
                {p.codigo} · Módulo 1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/proyectos/${id}/editar`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border dark:border-white/[0.1] border-slate-200 dark:text-slate-300 text-slate-600 dark:hover:bg-white/[0.05] hover:bg-slate-100 text-xs font-semibold transition-colors duration-150"
            >
              <Pencil size={13} />
              Editar
            </Link>
            <Link
              href={`/proyectos/${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors duration-150 shadow-md shadow-teal-500/20"
            >
              <LayoutGrid size={13} />
              Centro de Mando
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Datos Generales ─────────────────────────────── */}
        <SectionCard icon={FileText} title="Datos Generales" accent="dark:text-blue-400 text-blue-600">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold dark:text-slate-500 text-slate-400 mb-0.5">
                Estado
              </p>
              <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${ESTADO_COLORS[p.estado]}`}>
                {ESTADO_LABELS[p.estado]}
              </span>
            </div>
            <Field label="Código" value={p.codigo} />
            <Field label="Nombre del proyecto" value={p.nombre} />
            <Field label="Ubicación" value={p.ubicacion} />
            {p.descripcion && (
              <div className="sm:col-span-2">
                <Field label="Descripción" value={p.descripcion} />
              </div>
            )}
            {p.superficieM2 && (
              <Field label="Superficie" value={`${p.superficieM2} m²`} />
            )}
            {p.fechaInicio && (
              <Field
                label="Fecha de inicio"
                value={new Date(p.fechaInicio).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}
              />
            )}
            {p.fechaFinEstimada && (
              <Field
                label="Fecha fin estimada"
                value={new Date(p.fechaFinEstimada).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}
              />
            )}
          </div>
        </SectionCard>

        {/* ── Empresa ─────────────────────────────────────── */}
        {p.empresa && (
          <SectionCard icon={Building2} title="Empresa / Estudio" accent="dark:text-violet-400 text-violet-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Nombre" value={p.empresa.nombre} />
              {p.empresa.titulo && <Field label="Titulo / Eslogan" value={p.empresa.titulo} />}
              {p.empresa.direccion && <Field label="Dirección" value={p.empresa.direccion} />}
              {p.empresa.ciudad && <Field label="Ciudad" value={`${p.empresa.ciudad}${p.empresa.pais ? `, ${p.empresa.pais}` : ""}`} />}
              {p.empresa.telefono && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="dark:text-slate-500 text-slate-400 shrink-0" />
                  <Field label="Teléfono" value={p.empresa.telefono} />
                </div>
              )}
              {p.empresa.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="dark:text-slate-500 text-slate-400 shrink-0" />
                  <Field label="Email" value={p.empresa.email} />
                </div>
              )}
              {p.empresa.web && (
                <div className="flex items-center gap-2">
                  <Globe size={12} className="dark:text-slate-500 text-slate-400 shrink-0" />
                  <Field label="Sitio web" value={p.empresa.web} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Propietarios ─────────────────────────────────── */}
        {p.propietarios.length > 0 && (
          <SectionCard icon={Users} title="Propietarios" accent="dark:text-amber-400 text-amber-600">
            <div className="space-y-4">
              {p.propietarios.map((prop, i) => (
                <div
                  key={prop.id}
                  className="flex items-start gap-3 p-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.04] border-slate-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 flex-1">
                    <Field label="Nombre" value={`${prop.nombre} ${prop.apellido}`.trim()} />
                    {prop.direccion && <Field label="Dirección" value={prop.direccion} />}
                    {prop.telefono && <Field label="Teléfono" value={prop.telefono} />}
                    {prop.email && <Field label="Email" value={prop.email} />}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Equipo Técnico ───────────────────────────────── */}
        {p.equipoTecnico.length > 0 && (
          <SectionCard icon={HardHat} title="Equipo Técnico" accent="dark:text-teal-400 text-teal-600">
            <div className="space-y-3">
              {p.equipoTecnico.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 py-2.5 px-4 rounded-xl dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.04] border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <User size={14} className="dark:text-teal-400 text-teal-600 shrink-0" />
                    <span className="text-sm dark:text-slate-200 text-slate-700 font-medium">
                      {m.nombre} {m.apellido}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500">
                    {ROL_LABELS[m.rol] ?? m.rol}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Láminas / Planos ─────────────────────────────── */}
        {p.laminas.length > 0 && (
          <SectionCard icon={FileImage} title={`Índice de Planos (${p.laminas.length} láminas)`} accent="dark:text-rose-400 text-rose-600">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-white/[0.06] border-slate-200">
                    <th className="text-left text-[10px] uppercase tracking-wider font-semibold dark:text-slate-500 text-slate-400 pb-2 pr-4">
                      Código
                    </th>
                    <th className="text-left text-[10px] uppercase tracking-wider font-semibold dark:text-slate-500 text-slate-400 pb-2 pr-4">
                      Título
                    </th>
                    <th className="text-left text-[10px] uppercase tracking-wider font-semibold dark:text-slate-500 text-slate-400 pb-2">
                      Disciplina
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                  {p.laminas.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 pr-4 font-mono text-xs dark:text-rose-400 text-rose-600">
                        {l.codigo}
                      </td>
                      <td className="py-2 pr-4 dark:text-slate-300 text-slate-600">
                        {l.titulo}
                      </td>
                      <td className="py-2 text-xs dark:text-slate-500 text-slate-400">
                        {l.disciplina}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

      </main>
    </div>
  );
}
