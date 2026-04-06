import type { Proyecto, Propietario, MiembroEquipo, LaminaPlano, EstadoProyecto, RolEquipo } from "@prisma/client";

export type { Proyecto, Propietario, MiembroEquipo, LaminaPlano, EstadoProyecto, RolEquipo };

export type ProyectoConRelaciones = Proyecto & {
  propietarios: Propietario[];
  equipoTecnico: MiembroEquipo[];
  laminas: LaminaPlano[];
};

export type CreateProyectoInput = Pick<
  Proyecto,
  "nombre" | "descripcion" | "ubicacion" | "superficieM2" | "fechaInicio" | "fechaFinEstimada"
>;
