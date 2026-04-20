import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Auth — solo ADMIN
  const session = await auth();
  const user = session?.user as { id?: string; email?: string; role?: string; empresaId?: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const empresaId = user.empresaId;
  if (!empresaId) {
    return NextResponse.json({ error: "Sin empresa asociada" }, { status: 403 });
  }

  // 2. Recolectar datos de la empresa
  const [empresa, proyectos, usuarios] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true, nombre: true, titulo: true, direccion: true,
        telefono: true, email: true, web: true, ciudad: true, pais: true,
        createdAt: true,
      },
    }),
    prisma.proyecto.findMany({
      where: { empresaId },
      include: {
        propietarios:   { select: { id: true, nombre: true, telefono: true, email: true } },
        equipoTecnico: { select: { id: true, nombre: true, apellido: true, rol: true, titulo: true, email: true } },
        rubrosProyecto: {
          include: {
            insumos: {
              select: {
                id: true, nombre: true, cantidad: true, porcPerdida: true,
                precioUnitario: true, esManodeObra: true, descripcionMO: true,
              },
            },
          },
        },
        movimientosFinancieros: {
          select: {
            id: true, tipo: true, concepto: true, monto: true, fecha: true,
            beneficiario: true, metodoPago: true, observacion: true, createdAt: true,
          },
        },
        cronograma: {
          select: {
            id: true, nombre: true, diaInicio: true, duracionDias: true,
          },
        },
      },
    }),
    prisma.usuario.findMany({
      where: { empresaId },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        rol: true, activo: true, createdAt: true,
      },
    }),
  ]);

  // 3. Actualizar timestamp de último backup
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { ultimoBackupAt: new Date() },
  });

  // 4. Auditar
  if (user.id && user.email) {
    audit({
      accion: "BACKUP_DESCARGADO",
      entidad: "Empresa",
      entidadId: empresaId,
      userId: user.id,
      userEmail: user.email,
    }).catch(() => {});
  }

  // 5. Construir payload y devolver como archivo JSON descargable
  const payload = {
    _meta: {
      exportadoEn: new Date().toISOString(),
      version: "1.0",
      sistema: "TekoInnova CMD",
    },
    empresa,
    usuarios,
    proyectos,
  };

  const filename = `tekoga-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
