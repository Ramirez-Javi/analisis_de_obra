import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";
import { getProyectosSimple } from "@/app/actions/proyectos";

export default async function PresupuestoStandalonePage() {
  const proyectos = await getProyectosSimple();
  return (
    <PresupuestoClient
      backHref="/"
      backLabel="Centro de Mando"
      stickyTop="top-0"
      proyectosDisponibles={proyectos}
    />
  );
}