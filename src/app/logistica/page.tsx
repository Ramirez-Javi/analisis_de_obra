import { LogisticaClient } from "@/components/logistica/LogisticaClient";

export default function LogisticaStandalonePage() {
  return (
    <LogisticaClient
      backHref="/"
      stickyTop="top-0"
    />
  );
}
