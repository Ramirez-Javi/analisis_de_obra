// ============================================================
// Tipos del Módulo 2 — Cómputo y Presupuesto
// (estado local del cliente antes de persistir a Prisma)
// ============================================================

/** Un insumo dentro de la receta de un rubro (editable en UI) */
export interface InsumoRubro {
  id: string;
  nombre: string;
  unidad: string;
  rendimiento: number; // Cantidad base por unidad del rubro
  porcPerdida: number; // % desperdicio aplicado a la CANTIDAD
  precioUnitario: number;
  esManodeObra: boolean;
}

/** Un rubro maestro de la base de datos (plantilla) */
export interface RubroMaestroMock {
  id: string;
  codigo: string;
  categoria: string; // Grupo para agrupar en el selector
  nombre: string;
  unidad: string;
  insumos: InsumoRubro[];
}

/** Un rubro agregado al proyecto (instancia editable) */
export interface RubroProyecto {
  instanceId: string; // UUID local para React keys
  rubroMaestroId: string;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidadObra: number; // Cómputo métrico del proyecto
  expanded: boolean;
  insumos: InsumoRubro[];
}

// ============================================================
// DATOS DEL CATÁLOGO — importados desde catalogData.ts
// ============================================================
export { RUBROS_MAESTROS_MOCK } from "./catalogData";

// ============================================================
// UTILIDADES DE CÁLCULO
// REGLA CRÍTICA: porcPerdida se aplica a la CANTIDAD, nunca al precio
// ============================================================

/** Cantidad real a comprar = cantidadObra × rendimiento × (1 + porcPerdida/100) */
export function calcCantidadReal(
  cantidadObra: number,
  rendimiento: number,
  porcPerdida: number
): number {
  return cantidadObra * rendimiento * (1 + porcPerdida / 100);
}

/** Total del insumo = cantidadReal × precioUnitario */
export function calcTotalInsumo(
  cantidadObra: number,
  insumo: InsumoRubro
): number {
  return (
    calcCantidadReal(cantidadObra, insumo.rendimiento, insumo.porcPerdida) *
    insumo.precioUnitario
  );
}

/** Precio unitario del rubro = Σ totales de todos los insumos / cantidadObra */
export function calcPrecioUnitarioRubro(rubro: RubroProyecto): number {
  if (rubro.cantidadObra === 0) return 0;
  const total = rubro.insumos.reduce(
    (acc, ins) => acc + calcTotalInsumo(rubro.cantidadObra, ins),
    0
  );
  return total / rubro.cantidadObra;
}

/** Subtotal del rubro = precio unitario × cantidadObra */
export function calcSubtotalRubro(rubro: RubroProyecto): number {
  return rubro.insumos.reduce(
    (acc, ins) => acc + calcTotalInsumo(rubro.cantidadObra, ins),
    0
  );
}

/** Formatea número a moneda guaraní (sin decimales) */
export function fmtGs(n: number): string {
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/** Formatea número con 2 decimales */
export function fmtNum(n: number, dec = 2): string {
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);
}
