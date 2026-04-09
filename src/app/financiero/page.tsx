import { redirect } from "next/navigation";

// El módulo Estado Financiero siempre requiere un proyecto.
// Desde el Centro de Mando global, redirigimos a la lista de proyectos
// para que el usuario seleccione uno primero.
export default function FinancieroRootPage() {
  redirect("/proyectos?modulo=financiero");
}
