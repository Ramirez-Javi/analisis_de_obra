import { LogisticaClient } from "@/components/logistica/LogisticaClient";
import { getProyectosSimple } from "@/app/actions/proyectos";

export default async function LogisticaStandalonePage() {
  const proyectos = await getProyectosSimple();
  return (
    <LogisticaClient
      backHref="/"
      stickyTop="top-0"
      proyectosDisponibles={proyectos}
    />
  );
}
