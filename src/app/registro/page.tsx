import { RegistroForm } from "@/components/auth/RegistroForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registro — TEKÓGA",
  description: "Creación de cuenta de administrador inicial",
};

export default function RegistroPage() {
  return <RegistroForm />;
}
