import {
  FolderOpen,
  Calculator,
  CalendarDays,
  HardHat,
  Truck,
  FileDown,
  Landmark,
  ShoppingCart,
  ClipboardList,
  BookOpen,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface ModuleDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  shadowColor: string;
  accentColor: string;
  badge?: string;
  /** Valor del enum ModuloSistema en Prisma — se usa para filtrar por permisos */
  moduloEnum: string;
}

export const MODULES: ModuleDefinition[] = [
  // 1 — Proyecto
  {
    id: "proyecto",
    title: "Proyecto",
    subtitle: "Ficha técnica, propietarios e índice de planos",
    description:
      "Datos generales, propietarios, equipo técnico responsable e índice dinámico de láminas de planos.",
    href: "/proyectos",
    icon: FolderOpen,
    gradient: "from-blue-500 to-cyan-500",
    shadowColor: "shadow-blue-500/20",
    accentColor: "dark:text-blue-400 text-blue-600",
    moduloEnum: "PROYECTO",
  },
  // 2 — Cómputo y Presupuesto
  {
    id: "presupuesto",
    title: "Cómputo y Presupuesto",
    subtitle: "Extracción de cantidades, recetas y costos",
    description:
      "Rubros con recetas de materiales y mano de obra. Genera el precio unitario ciego para el cliente.",
    href: "/presupuesto",
    icon: Calculator,
    gradient: "from-emerald-500 to-teal-500",
    shadowColor: "shadow-emerald-500/20",
    accentColor: "dark:text-emerald-400 text-emerald-600",
    badge: "Core",
    moduloEnum: "PRESUPUESTO",
  },
  // 3 — Cronograma
  {
    id: "cronograma",
    title: "Cronograma y Avances",
    subtitle: "Diagrama de ciclos, Curva S y certificaciones",
    description:
      "Asigna días y duraciones por rubro. Visualiza el flujo de caja mensual y la Curva S de avance previsto vs. real.",
    href: "/cronograma",
    icon: CalendarDays,
    gradient: "from-violet-500 to-purple-500",
    shadowColor: "shadow-violet-500/20",
    accentColor: "dark:text-violet-400 text-violet-600",
    moduloEnum: "CRONOGRAMA",
  },
  // 4 — Estado Financiero
  {
    id: "financiero",
    title: "Estado Financiero",
    subtitle: "Libro Mayor, Debe/Haber y Saldo de la obra",
    description:
      "Registra todos los movimientos de ingreso y egreso. Controla el saldo disponible, métodos de pago y autoriza pagos con comprobante.",
    href: "/financiero",
    icon: Landmark,
    gradient: "from-sky-500 to-blue-600",
    shadowColor: "shadow-sky-500/20",
    accentColor: "dark:text-sky-400 text-sky-600",
    moduloEnum: "FINANCIERO",
  },
  // 5 — Gestión de Mano de Obra
  {
    id: "mano-obra",
    title: "Gestión de Mano de Obra",
    subtitle: "Contratos de cuadrillas, retenciones y pagos",
    description:
      "Controla contratos por cuadrilla, personal asignado, retención de garantía, pagos realizados y saldo pendiente.",
    href: "/mano-obra",
    icon: HardHat,
    gradient: "from-orange-500 to-amber-500",
    shadowColor: "shadow-orange-500/20",
    accentColor: "dark:text-orange-400 text-orange-600",
    moduloEnum: "MANO_OBRA",
  },
  // 6 — Maquinarias y Logística
  {
    id: "logistica",
    title: "Maquinarias y Logística",
    subtitle: "Costos indirectos, fletes y equipos",
    description:
      "Registra fletes, alquiler de maquinaria, honorarios de proyecto y gastos administrativos separados de los materiales.",
    href: "/logistica",
    icon: Truck,
    gradient: "from-yellow-500 to-orange-400",
    shadowColor: "shadow-yellow-500/20",
    accentColor: "dark:text-yellow-400 text-yellow-600",
    moduloEnum: "LOGISTICA",
  },
  // 7 — Proveedores y Compras
  {
    id: "compras",
    title: "Proveedores y Compras",
    subtitle: "Facturas, cuentas por pagar y directorio de proveedores",
    description:
      "Gestiona facturas de proveedores, controla montos pendientes y pagados, y administra el directorio global de proveedores de la empresa.",
    href: "/compras",
    icon: ShoppingCart,
    gradient: "from-orange-500 to-red-500",
    shadowColor: "shadow-orange-500/20",
    accentColor: "dark:text-orange-400 text-orange-600",
    moduloEnum: "COMPRAS",
  },
  // 8 — Inventario / Manual de Obra
  {
    id: "inventario",
    title: "Inventario / Manual de Obra",
    subtitle: "Stock de materiales, entradas y salidas en obra",
    description:
      "Registra los materiales disponibles en obra, movimientos de ingreso y egreso, y controla el stock en tiempo real durante la ejecución.",
    href: "/inventario",
    icon: ClipboardList,
    gradient: "from-lime-500 to-green-500",
    shadowColor: "shadow-lime-500/20",
    accentColor: "dark:text-lime-400 text-lime-600",
    badge: "Nuevo",
    moduloEnum: "INVENTARIO",
  },
  // 9 — Bitácora de Obra
  {
    id: "bitacora",
    title: "Bitácora de Obra",
    subtitle: "Libro diario, FODA, personal y avances por jornada",
    description:
      "Actas diarias profesionales con condiciones climáticas, personal presente, rubros ejecutados, análisis FODA y alertas de stock de materiales.",
    href: "/bitacora",
    icon: BookOpen,
    gradient: "from-cyan-500 to-teal-500",
    shadowColor: "shadow-cyan-500/20",
    accentColor: "dark:text-cyan-400 text-cyan-600",
    badge: "Nuevo",
    moduloEnum: "BITACORA",
  },
  // 10 — Exportación y Reportes
  {
    id: "reportes",
    title: "Exportación y Reportes",
    subtitle: "PDF Ejecutivo y Plan de Pagos",
    description:
      "Genera el PDF ciego para el cliente, el desglose técnico interno y el plan de pagos en N cuotas porcentuales.",
    href: "/reportes",
    icon: FileDown,
    gradient: "from-rose-500 to-pink-500",
    shadowColor: "shadow-rose-500/20",
    accentColor: "dark:text-rose-400 text-rose-600",
    moduloEnum: "REPORTES",
  },
  // 11 — Estadísticas y Dashboard
  {
    id: "estadisticas",
    title: "Estadísticas y Dashboard",
    subtitle: "Gráficos, curvas, insumos y avances reales",
    description:
      "Visualiza el avance real vs. proyectado, consumo de insumos por rubro, consolidado de materiales, timeline de utilización y KPIs financieros.",
    href: "/estadisticas",
    icon: BarChart3,
    gradient: "from-indigo-500 to-violet-600",
    shadowColor: "shadow-indigo-500/20",
    accentColor: "dark:text-indigo-400 text-indigo-600",
    badge: "Nuevo",
    moduloEnum: "ESTADISTICAS",
  },
];
