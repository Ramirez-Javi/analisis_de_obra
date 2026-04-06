-- AlterTable
ALTER TABLE "proyecto" ADD COLUMN     "empresaId" TEXT;

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "titulo" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "web" TEXT,
    "ciudad" TEXT,
    "pais" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "proyecto" ADD CONSTRAINT "proyecto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
