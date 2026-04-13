import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCampoSession } from "@/lib/campo-session";
import { PinForm } from "./PinForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { nombre: true },
  });
  return { title: proyecto ? `Acceso de Campo — ${proyecto.nombre}` : "Acceso de Campo" };
}

export default async function CampoProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Si ya hay sesión de campo activa para este proyecto, redirigir directo
  const sesion = await getCampoSession();
  if (sesion?.proyectoId === id) {
    redirect(`/campo/${id}/bitacora`);
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, codigo: true, nombre: true, empresaId: true },
  });
  if (!proyecto) notFound();

  // Verificar que la empresa tiene al menos un usuario con PIN asignado
  const tieneUsuariosConPin = await prisma.usuario.count({
    where: { empresaId: proyecto.empresaId, pinHash: { not: null }, activo: true },
  });
  if (tieneUsuariosConPin === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-400 text-sm max-w-xs">
          El acceso de campo no está configurado para este proyecto. Contactá al administrador.
        </p>
      </div>
    );
  }

  return (
    <PinForm
      proyectoId={proyecto.id}
      proyectoNombre={proyecto.nombre}
      proyectoCodigo={proyecto.codigo}
    />
  );
}
