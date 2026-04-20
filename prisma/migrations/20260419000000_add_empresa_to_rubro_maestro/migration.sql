-- AddField: empresaId opcional en rubro_maestro
ALTER TABLE "rubro_maestro" ADD COLUMN "empresaId" TEXT;
CREATE INDEX "rubro_maestro_empresaId_idx" ON "rubro_maestro"("empresaId");
ALTER TABLE "rubro_maestro" ADD CONSTRAINT "rubro_maestro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
