import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { getSession } from "@/lib/session";
import { getProveedoresGlobales } from "./actions";
import { ProveedoresGlobalClient } from "@/components/compras/ProveedoresGlobalClient";

export const metadata = { title: "Proveedores — TEKOINNOVA" };

export default async function ComprasRootPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const proveedores = await getProveedoresGlobales();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-600 p-2.5">
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Directorio de Proveedores
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Base de datos global de proveedores de la empresa
          </p>
        </div>
      </div>

      <ProveedoresGlobalClient proveedores={proveedores} />
    </div>
  );
}
