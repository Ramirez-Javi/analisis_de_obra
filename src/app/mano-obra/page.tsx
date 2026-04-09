import { ManoObraClient } from "@/components/mano-obra/ManoObraClient";
import { getProyectosSimple } from "@/app/actions/proyectos";

export default async function ManoObraStandalonePage() {
  const proyectos = await getProyectosSimple();
  return (
    <ManoObraClient
      backHref="/"
      stickyTop="top-0"
      proyectosDisponibles={proyectos}
    />
  );
}
