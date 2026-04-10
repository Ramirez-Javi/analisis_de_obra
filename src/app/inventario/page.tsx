import { redirect } from "next/navigation";

export default function InventarioRootPage() {
  redirect("/proyectos?modulo=inventario");
}
