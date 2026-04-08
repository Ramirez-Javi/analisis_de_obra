// Tipos específicos del formulario de Proyecto
// Separados de los tipos Prisma (src/modules/proyecto/types.ts)

export interface EmpresaInput {
  nombre: string;
  titulo: string;
  direccion: string;
  telefono: string;
  email: string;
  web: string;
  ciudad: string;
  pais: string;
  logoUrl: string;
}

export interface PropietarioInput {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
}

export interface LaminaInput {
  codigo: string;
  nombre: string;
}

export interface NuevoProyectoFormValues {
  empresa: EmpresaInput;
  codigo: string;         // REQUIRED — debe ser ingresado manualmente
  nombre: string;
  ubicacion: string;
  descripcion: string;
  estado: string;         // EstadoProyecto enum value
  fechaInicio: string;    // YYYY-MM-DD
  duracionSemanas: string; // Cantidad de semanas (convertido a Int al guardar)
  propietarios: PropietarioInput[];
  equipoElaboracion: string;
  equipoElaboracionCargo: string;
  equipoPlanos: string;
  equipoPlanosCargo: string;
  equipoRenders: string;
  equipoRendersCargo: string;
  laminas: LaminaInput[];
}

export const defaultFormValues: NuevoProyectoFormValues = {
  empresa: {
    nombre: "",
    titulo: "",
    direccion: "",
    telefono: "",
    email: "",
    web: "",
    ciudad: "",
    pais: "",
    logoUrl: "",
  },
  codigo: "",
  nombre: "",
  ubicacion: "",
  descripcion: "",
  estado: "ANTEPROYECTO",
  fechaInicio: "",
  duracionSemanas: "",
  propietarios: [{ nombre: "", direccion: "", telefono: "", email: "" }],
  equipoElaboracion: "",
  equipoElaboracionCargo: "",
  equipoPlanos: "",
  equipoPlanosCargo: "",
  equipoRenders: "",
  equipoRendersCargo: "",
  laminas: [{ codigo: "", nombre: "" }],
};
