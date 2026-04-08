-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoProyecto" ADD VALUE 'ANTEPROYECTO';
ALTER TYPE "EstadoProyecto" ADD VALUE 'PROYECTO_EJECUTIVO';
ALTER TYPE "EstadoProyecto" ADD VALUE 'CONTRATO_CONFIRMADO';
ALTER TYPE "EstadoProyecto" ADD VALUE 'OTRO';

-- AlterTable
ALTER TABLE "proyecto" ADD COLUMN     "duracionSemanas" INTEGER,
ALTER COLUMN "estado" SET DEFAULT 'ANTEPROYECTO';
