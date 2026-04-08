import { ManoObraClient } from "@/components/mano-obra/ManoObraClient";

export default function ManoObraStandalonePage() {
  return (
    <ManoObraClient
      backHref="/"
      stickyTop="top-0"
    />
  );
}
