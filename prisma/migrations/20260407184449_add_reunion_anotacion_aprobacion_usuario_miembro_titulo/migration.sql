-- CreateEnum
CREATE TYPE "EstadoReunion" AS ENUM ('PROGRAMADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaAnotacion" AS ENUM ('REUNION', 'MODIFICACION', 'AJUSTE', 'NOTA_LEGAL', 'OTRO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'USUARIO');

-- AlterTable
ALTER TABLE "miembro_equipo" ADD COLUMN     "titulo" TEXT;

-- CreateTable
CREATE TABLE "reunion" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "lugar" TEXT,
    "temas" TEXT,
    "acta" TEXT,
    "estado" "EstadoReunion" NOT NULL DEFAULT 'PROGRAMADA',
    "representantes" TEXT,
    "proyectoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anotacion" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora" TEXT,
    "categoria" "CategoriaAnotacion" NOT NULL DEFAULT 'OTRO',
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "autor" TEXT,
    "proyectoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprobacion_proyecto" (
    "id" TEXT NOT NULL,
    "fechaInicioContractual" TIMESTAMP(3),
    "fechaFinContractual" TIMESTAMP(3),
    "plazoEnDias" INTEGER,
    "montoContratoGs" DOUBLE PRECISION,
    "fechaAprobacionPlanos" TIMESTAMP(3),
    "firmanteAprobacionPlanos" TEXT,
    "obsAprobacionPlanos" TEXT,
    "fechaAprobacionPres" TIMESTAMP(3),
    "firmanteAprobacionPres" TEXT,
    "obsAprobacionPres" TEXT,
    "aprobadoPor" TEXT,
    "revisorNombre" TEXT,
    "revisorProfesion" TEXT,
    "fechaRevision" TIMESTAMP(3),
    "obsRevision" TEXT,
    "respPresupuesto" TEXT,
    "respPresupuestoProfesion" TEXT,
    "proyectoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aprobacion_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'USUARIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aprobacion_proyecto_proyectoId_key" ON "aprobacion_proyecto"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "reunion" ADD CONSTRAINT "reunion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacion" ADD CONSTRAINT "anotacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprobacion_proyecto" ADD CONSTRAINT "aprobacion_proyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
