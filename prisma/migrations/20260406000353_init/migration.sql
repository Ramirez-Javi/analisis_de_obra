-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('BORRADOR', 'PRESUPUESTADO', 'EN_EJECUCION', 'PAUSADO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "RolEquipo" AS ENUM ('DIRECTOR_OBRA', 'ARQUITECTO', 'INGENIERO_ESTRUCTURAL', 'INGENIERO_INSTALACIONES', 'MAESTRO_MAYOR', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('ACTIVO', 'PAUSADO', 'FINALIZADO', 'RESCINDIDO');

-- CreateEnum
CREATE TYPE "TipoCostoIndirecto" AS ENUM ('FLETE', 'ALQUILER_MAQUINARIA', 'HONORARIOS_PROYECTO', 'GASTO_ADMINISTRATIVO', 'SEGURO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA');

-- CreateTable
CREATE TABLE "unidad_medida" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "simbolo" TEXT NOT NULL,

    CONSTRAINT "unidad_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_material" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "categoria_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_maestro" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioBase" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "unidadMedidaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_maestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_rubro" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categoria_rubro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubro_maestro" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "unidadMedidaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubro_maestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_maestra_detalle" (
    "id" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "porcPerdida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esManodeObra" BOOLEAN NOT NULL DEFAULT false,
    "descripcionMO" TEXT,
    "rubroMaestroId" TEXT NOT NULL,
    "materialMaestroId" TEXT,
    "unidadMedidaId" TEXT,

    CONSTRAINT "receta_maestra_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ubicacion" TEXT,
    "superficieM2" DOUBLE PRECISION,
    "fechaInicio" TIMESTAMP(3),
    "fechaFinEstimada" TIMESTAMP(3),
    "estado" "EstadoProyecto" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propietario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "porcentaje" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "propietario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembro_equipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "RolEquipo" NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "matricula" TEXT,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "miembro_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lamina_plano" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT '0',
    "urlArchivo" TEXT,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "lamina_plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubro_proyecto" (
    "id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "porcImprevistos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcGanancia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "rubroMaestroId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubro_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "porcPerdida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "esPrecioCustom" BOOLEAN NOT NULL DEFAULT false,
    "esManodeObra" BOOLEAN NOT NULL DEFAULT false,
    "descripcionMO" TEXT,
    "unidadMedidaId" TEXT,
    "rubroProyectoId" TEXT NOT NULL,

    CONSTRAINT "insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "microciclo_tarea" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "diaInicio" INTEGER NOT NULL,
    "duracionDias" INTEGER NOT NULL,
    "rubroProyectoId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "microciclo_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avance_tarea" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "porcentajeReal" DOUBLE PRECISION NOT NULL,
    "observacion" TEXT,
    "microcicloTareaId" TEXT NOT NULL,

    CONSTRAINT "avance_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_mano_obra" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "jefeCuadrilla" TEXT NOT NULL,
    "montoPactado" DOUBLE PRECISION NOT NULL,
    "porcRetencion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" "EstadoContrato" NOT NULL DEFAULT 'ACTIVO',
    "fechaInicio" TIMESTAMP(3),
    "fechaFinEstimada" TIMESTAMP(3),
    "proyectoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_mano_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_rubro_proyecto" (
    "contratoId" TEXT NOT NULL,
    "rubroProyectoId" TEXT NOT NULL,

    CONSTRAINT "contrato_rubro_proyecto_pkey" PRIMARY KEY ("contratoId","rubroProyectoId")
);

-- CreateTable
CREATE TABLE "personal_cuadrilla" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT,
    "rol" TEXT NOT NULL,
    "telefono" TEXT,
    "contratoId" TEXT NOT NULL,

    CONSTRAINT "personal_cuadrilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_contrato" (
    "id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "comprobante" TEXT,
    "contratoId" TEXT NOT NULL,

    CONSTRAINT "pago_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costo_indirecto" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" "TipoCostoIndirecto" NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "proveedor" TEXT,
    "fecha" TIMESTAMP(3),
    "comprobante" TEXT,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "costo_indirecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuota_pago" (
    "id" TEXT NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "fechaEstimada" TIMESTAMP(3),
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "cuota_pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidad_medida_nombre_key" ON "unidad_medida"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_material_nombre_key" ON "categoria_material"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "material_maestro_codigo_key" ON "material_maestro"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_rubro_nombre_key" ON "categoria_rubro"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "rubro_maestro_codigo_key" ON "rubro_maestro"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_codigo_key" ON "proyecto"("codigo");

-- AddForeignKey
ALTER TABLE "material_maestro" ADD CONSTRAINT "material_maestro_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_maestro" ADD CONSTRAINT "material_maestro_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria_material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubro_maestro" ADD CONSTRAINT "rubro_maestro_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubro_maestro" ADD CONSTRAINT "rubro_maestro_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria_rubro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_maestra_detalle" ADD CONSTRAINT "receta_maestra_detalle_rubroMaestroId_fkey" FOREIGN KEY ("rubroMaestroId") REFERENCES "rubro_maestro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_maestra_detalle" ADD CONSTRAINT "receta_maestra_detalle_materialMaestroId_fkey" FOREIGN KEY ("materialMaestroId") REFERENCES "material_maestro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_maestra_detalle" ADD CONSTRAINT "receta_maestra_detalle_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidad_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propietario" ADD CONSTRAINT "propietario_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_equipo" ADD CONSTRAINT "miembro_equipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lamina_plano" ADD CONSTRAINT "lamina_plano_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubro_proyecto" ADD CONSTRAINT "rubro_proyecto_rubroMaestroId_fkey" FOREIGN KEY ("rubroMaestroId") REFERENCES "rubro_maestro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubro_proyecto" ADD CONSTRAINT "rubro_proyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo" ADD CONSTRAINT "insumo_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidad_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo" ADD CONSTRAINT "insumo_rubroProyectoId_fkey" FOREIGN KEY ("rubroProyectoId") REFERENCES "rubro_proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "microciclo_tarea" ADD CONSTRAINT "microciclo_tarea_rubroProyectoId_fkey" FOREIGN KEY ("rubroProyectoId") REFERENCES "rubro_proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "microciclo_tarea" ADD CONSTRAINT "microciclo_tarea_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avance_tarea" ADD CONSTRAINT "avance_tarea_microcicloTareaId_fkey" FOREIGN KEY ("microcicloTareaId") REFERENCES "microciclo_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_mano_obra" ADD CONSTRAINT "contrato_mano_obra_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_rubro_proyecto" ADD CONSTRAINT "contrato_rubro_proyecto_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_mano_obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_rubro_proyecto" ADD CONSTRAINT "contrato_rubro_proyecto_rubroProyectoId_fkey" FOREIGN KEY ("rubroProyectoId") REFERENCES "rubro_proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_cuadrilla" ADD CONSTRAINT "personal_cuadrilla_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_mano_obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_contrato" ADD CONSTRAINT "pago_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_mano_obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costo_indirecto" ADD CONSTRAINT "costo_indirecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuota_pago" ADD CONSTRAINT "cuota_pago_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
