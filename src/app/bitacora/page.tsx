import { redirect } from "next/navigation";

export default function BitacoraRootPage() {
  redirect("/proyectos?modulo=bitacora");
}
