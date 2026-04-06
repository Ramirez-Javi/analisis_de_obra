import type { CuotaPago, EstadoCuota } from "@prisma/client";

export type { CuotaPago, EstadoCuota };

export interface PlanPagosResumen {
  cuotas: CuotaPago[];
  totalPresupuesto: number; // Calculado desde rubros del proyecto
  totalPagado: number;
  saldoPendiente: number;
}

/** Configuración para generar el PDF ejecutivo (vista cliente) */
export interface ConfigExportEjecutivo {
  mostrarPrecioCiego: boolean;
  mostrarTotales: boolean;
  incluirPlanPagos: boolean;
}

/** Configuración para el PDF técnico (vista interna) */
export interface ConfigExportTecnico {
  incluirInsumos: boolean;
  incluirMargenes: boolean;
  incluirRentabilidad: boolean;
  incluirCostosIndirectos: boolean;
}
