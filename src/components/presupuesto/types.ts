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
// DATOS SIMULADOS (Mock) — Reemplazar por fetch Prisma luego
// ============================================================

export const RUBROS_MAESTROS_MOCK: RubroMaestroMock[] = [
  {
    id: "rm-001",
    codigo: "MAM-001",
    nombre: "Mampostería de Elevación 0.15m",
    unidad: "m²",
    insumos: [
      {
        id: "ins-001",
        nombre: "Ladrillo común",
        unidad: "un",
        rendimiento: 65,
        porcPerdida: 5,
        precioUnitario: 800,
        esManodeObra: false,
      },
      {
        id: "ins-002",
        nombre: "Cemento",
        unidad: "kg",
        rendimiento: 5.74,
        porcPerdida: 3,
        precioUnitario: 1230,
        esManodeObra: false,
      },
      {
        id: "ins-003",
        nombre: "Arena fina",
        unidad: "m³",
        rendimiento: 0.028,
        porcPerdida: 5,
        precioUnitario: 180000,
        esManodeObra: false,
      },
      {
        id: "ins-004",
        nombre: "Mano de Obra — Albañil",
        unidad: "h",
        rendimiento: 1.2,
        porcPerdida: 0,
        precioUnitario: 25000,
        esManodeObra: true,
      },
    ],
  },
  {
    id: "rm-002",
    codigo: "EST-001",
    nombre: "Losa de H°A° e=0.20m",
    unidad: "m²",
    insumos: [
      {
        id: "ins-010",
        nombre: "Hormigón H-21",
        unidad: "m³",
        rendimiento: 0.22,
        porcPerdida: 5,
        precioUnitario: 1200000,
        esManodeObra: false,
      },
      {
        id: "ins-011",
        nombre: "Acero Ø12mm",
        unidad: "kg",
        rendimiento: 8.5,
        porcPerdida: 8,
        precioUnitario: 8500,
        esManodeObra: false,
      },
      {
        id: "ins-012",
        nombre: "Encofrado fenólico",
        unidad: "m²",
        rendimiento: 1.05,
        porcPerdida: 10,
        precioUnitario: 45000,
        esManodeObra: false,
      },
      {
        id: "ins-013",
        nombre: "Mano de Obra — Encofrador",
        unidad: "h",
        rendimiento: 2.5,
        porcPerdida: 0,
        precioUnitario: 28000,
        esManodeObra: true,
      },
    ],
  },
  {
    id: "rm-003",
    codigo: "REV-001",
    nombre: "Revoque grueso interior",
    unidad: "m²",
    insumos: [
      {
        id: "ins-020",
        nombre: "Cemento",
        unidad: "kg",
        rendimiento: 4.5,
        porcPerdida: 4,
        precioUnitario: 1230,
        esManodeObra: false,
      },
      {
        id: "ins-021",
        nombre: "Cal hidráulica",
        unidad: "kg",
        rendimiento: 2.0,
        porcPerdida: 4,
        precioUnitario: 650,
        esManodeObra: false,
      },
      {
        id: "ins-022",
        nombre: "Arena gruesa",
        unidad: "m³",
        rendimiento: 0.022,
        porcPerdida: 5,
        precioUnitario: 160000,
        esManodeObra: false,
      },
    ],
  },
];

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
