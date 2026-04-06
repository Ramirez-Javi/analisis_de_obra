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
  nombre: string;
  ubicacion: string;
  descripcion: string;
  propietarios: PropietarioInput[];
  equipoElaboracion: string;
  equipoPlanos: string;
  equipoRenders: string;
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
  nombre: "",
  ubicacion: "",
  descripcion: "",
  propietarios: [{ nombre: "", direccion: "", telefono: "", email: "" }],
  equipoElaboracion: "",
  equipoPlanos: "",
  equipoRenders: "",
  laminas: [{ codigo: "", nombre: "" }],
};
