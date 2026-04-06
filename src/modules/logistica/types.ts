import type { CostoIndirecto, TipoCostoIndirecto } from "@prisma/client";

export type { CostoIndirecto, TipoCostoIndirecto };

export interface ResumenCostosIndirectos {
  totalPorTipo: Record<TipoCostoIndirecto, number>;
  totalGeneral: number;
}
