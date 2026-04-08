"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPO TÉCNICO
// ─────────────────────────────────────────────────────────────────────────────

export interface MiembroData {
  nombre: string;
  titulo?: string;
  rol: string;
  matricula?: string;
  telefono?: string;
  email?: string;
}

export async function agregarMiembro(proyectoId: string, data: MiembroData) {
  await prisma.miembroEquipo.create({
    data: {
      nombre: data.nombre.trim(),
      apellido: "",
      titulo: data.titulo?.trim() || null,
      rol: data.rol as never,
      matricula: data.matricula?.trim() || null,
      telefono: data.telefono?.trim() || null,
      email: data.email?.trim() || null,
      proyectoId,
    },
  });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}

export async function eliminarMiembro(id: string, proyectoId: string) {
  await prisma.miembroEquipo.delete({ where: { id } });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}

// ─────────────────────────────────────────────────────────────────────────────
// REUNIONES
// ─────────────────────────────────────────────────────────────────────────────

export interface ReunionData {
  fecha: string;           // ISO date string
  hora?: string;
  lugar?: string;
  temas?: string;
  acta?: string;
  estado: "PROGRAMADA" | "REALIZADA" | "CANCELADA";
  representantes?: string;
}

export async function agregarReunion(proyectoId: string, data: ReunionData) {
  await prisma.reunion.create({
    data: {
      fecha: new Date(data.fecha),
      hora: data.hora?.trim() || null,
      lugar: data.lugar?.trim() || null,
      temas: data.temas?.trim() || null,
      acta: data.acta?.trim() || null,
      estado: data.estado,
      representantes: data.representantes?.trim() || null,
      proyectoId,
    },
  });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}

export async function actualizarReunion(id: string, proyectoId: string, data: ReunionData) {
  await prisma.reunion.update({
    where: { id },
    data: {
      fecha: new Date(data.fecha),
      hora: data.hora?.trim() || null,
      lugar: data.lugar?.trim() || null,
      temas: data.temas?.trim() || null,
      acta: data.acta?.trim() || null,
      estado: data.estado,
      representantes: data.representantes?.trim() || null,
    },
  });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}

export async function eliminarReunion(id: string, proyectoId: string) {
  await prisma.reunion.delete({ where: { id } });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}

// ─────────────────────────────────────────────────────────────────────────────
// BITÁCORA / ANOTACIONES
// ─────────────────────────────────────────────────────────────────────────────

export interface AnotacionData {
  fecha: string;           // ISO date string
  hora?: string;
  categoria: "REUNION" | "MODIFICACION" | "AJUSTE" | "NOTA_LEGAL" | "OTRO";
  titulo: string;
  contenido: string;
  autor?: string;
}

export async function agregarAnotacion(proyectoId: string, data: AnotacionData) {
  await prisma.anotacion.create({
    data: {
      fecha: new Date(data.fecha),
      hora: data.hora?.trim() || null,
      categoria: data.categoria,
      titulo: data.titulo.trim(),
      contenido: data.contenido.trim(),
      autor: data.autor?.trim() || null,
      proyectoId,
    },
  });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}

export async function eliminarAnotacion(id: string, proyectoId: string) {
  await prisma.anotacion.delete({ where: { id } });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}

// ─────────────────────────────────────────────────────────────────────────────
// APROBACIONES
// ─────────────────────────────────────────────────────────────────────────────

export interface AprobacionData {
  fechaInicioContractual?: string;
  fechaFinContractual?: string;
  plazoEnDias?: number;
  montoContratoGs?: number;

  fechaAprobacionPlanos?: string;
  firmanteAprobacionPlanos?: string;
  obsAprobacionPlanos?: string;

  fechaAprobacionPres?: string;
  firmanteAprobacionPres?: string;
  obsAprobacionPres?: string;

  aprobadoPor?: string;

  revisorNombre?: string;
  revisorProfesion?: string;
  fechaRevision?: string;
  obsRevision?: string;

  respPresupuesto?: string;
  respPresupuestoProfesion?: string;
}

function toDate(s?: string) {
  return s && s.trim() ? new Date(s) : null;
}

export async function guardarAprobacion(proyectoId: string, data: AprobacionData) {
  const payload = {
    fechaInicioContractual:    toDate(data.fechaInicioContractual),
    fechaFinContractual:       toDate(data.fechaFinContractual),
    plazoEnDias:               data.plazoEnDias ?? null,
    montoContratoGs:           data.montoContratoGs ?? null,
    fechaAprobacionPlanos:     toDate(data.fechaAprobacionPlanos),
    firmanteAprobacionPlanos:  data.firmanteAprobacionPlanos?.trim() || null,
    obsAprobacionPlanos:       data.obsAprobacionPlanos?.trim() || null,
    fechaAprobacionPres:       toDate(data.fechaAprobacionPres),
    firmanteAprobacionPres:    data.firmanteAprobacionPres?.trim() || null,
    obsAprobacionPres:         data.obsAprobacionPres?.trim() || null,
    aprobadoPor:               data.aprobadoPor?.trim() || null,
    revisorNombre:             data.revisorNombre?.trim() || null,
    revisorProfesion:          data.revisorProfesion?.trim() || null,
    fechaRevision:             toDate(data.fechaRevision),
    obsRevision:               data.obsRevision?.trim() || null,
    respPresupuesto:           data.respPresupuesto?.trim() || null,
    respPresupuestoProfesion:  data.respPresupuestoProfesion?.trim() || null,
  };

  await prisma.aprobacionProyecto.upsert({
    where: { proyectoId },
    update: payload,
    create: { ...payload, proyectoId },
  });
  revalidatePath(`/proyectos/${proyectoId}/ficha`);
}
