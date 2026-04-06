import type { ContratoManoObra, PersonalCuadrilla, PagoContrato, EstadoContrato } from "@prisma/client";

export type { ContratoManoObra, PersonalCuadrilla, PagoContrato, EstadoContrato };

export type ContratoConDetalle = ContratoManoObra & {
  personal: PersonalCuadrilla[];
  pagos: PagoContrato[];
};

/** Calculado en runtime */
export interface ResumenContrato {
  totalPagado: number;
  montoRetencion: number;      // montoPactado * porcRetencion / 100
  saldoPendiente: number;      // montoPactado - totalPagado - montoRetencion
}
