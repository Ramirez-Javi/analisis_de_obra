import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";

export default function PresupuestoStandalonePage() {
  return (
    <PresupuestoClient
      backHref="/"
      backLabel="Centro de Mando"
      stickyTop="top-0"
    />
  );
}