import type { RubroProyecto, Insumo, RubroMaestro, MaterialMaestro } from "@prisma/client";

export type { RubroProyecto, Insumo, RubroMaestro, MaterialMaestro };

export type RubroConInsumos = RubroProyecto & {
  insumos: Insumo[];
  rubroMaestro: Pick<RubroMaestro, "codigo" | "nombre">;
};

/**
 * REGLAS DE NEGOCIO (calculadas en runtime, no en DB):
 *
 * cantidadConPerdida = insumo.cantidad * rubro.cantidad * (1 + insumo.porcPerdida / 100)
 * costoInsumo        = cantidadConPerdida * insumo.precioUnitario
 * subtotalCostoDirecto = Σ costoInsumo (materiales) + Σ costoInsumo (MO)
 * precioConMargen    = subtotalCostoDirecto * (1 + porcImprevistos/100) * (1 + porcGanancia/100)
 * precioCiego        = precioConMargen / rubro.cantidad
 */
export interface ResumenRubro {
  subtotalMateriales: number;
  subtotalManoObra: number;
  subtotalCostoDirecto: number;
  montoImprevistos: number;
  montoGanancia: number;
  totalConMargenes: number;
  precioCiego: number; // Total / cantidad → presentado al cliente
}
