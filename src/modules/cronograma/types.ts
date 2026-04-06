import type { MicrocicloTarea, AvanceTarea } from "@prisma/client";

export type { MicrocicloTarea, AvanceTarea };

export type TareaConAvances = MicrocicloTarea & {
  avances: AvanceTarea[];
};

/** Agrupación calculada en runtime para Mesociclos */
export interface MesocicloResumen {
  mes: number;        // Número de mes (1-based relativo al inicio del proyecto)
  semanas: number[];  // Números de semana que caen en este mes
  tareas: MicrocicloTarea[];
  flujoCaja: number;  // Monto exigible en este mes
}

/** Punto de la Curva S */
export interface PuntoCurvaS {
  periodo: string;          // Ej: "Mes 1", "Semana 3"
  porcentajePrevisto: number;
  porcentajeReal: number;
}
