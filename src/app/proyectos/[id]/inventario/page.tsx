import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  getAmbientes,
  getRecepcionesBodega,
  getAsBuiltPorAmbiente,
  getMaterialesParaSelector,
  getProveedoresParaSelector,
} from "./actions";
import { InventarioClient } from "@/components/inventario/InventarioClient";

export const metadata = { title: "Inventario / As-Built — TEKOINNOVA" };

export default async function InventarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, nombre: true, empresaId: true },
  });
  if (!proyecto) notFound();

  const empresaId = proyecto.empresaId ?? "";

  const [ambientes, recepciones, asBuiltPorAmbiente, materiales, proveedores] =
    await Promise.all([
      getAmbientes(id),
      getRecepcionesBodega(id),
      getAsBuiltPorAmbiente(id),
      getMaterialesParaSelector(),
      empresaId ? getProveedoresParaSelector(empresaId) : Promise.resolve([]),
    ]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Centro de Mando
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        <Link href="/proyectos" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Proyectos
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        <Link href={`/proyectos/${id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[140px]">
          {proyecto.nombre}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        <span className="text-gray-700 dark:text-gray-200 font-medium">Inventario / As-Built</span>
      </nav>

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-lime-500 to-green-500 p-2.5 shadow-lg shadow-lime-500/20">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Inventario / Manual As-Built
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trazabilidad de materiales · Bodega · Matriz de instalación — {proyecto.nombre}
          </p>
        </div>
      </div>

      {/* Client Component */}
      <InventarioClient
        proyectoId={id}
        proyectoNombre={proyecto.nombre}
        ambientes={ambientes}
        recepciones={recepciones}
        asBuiltPorAmbiente={asBuiltPorAmbiente}
        materiales={materiales}
        proveedores={proveedores}
      />
    </main>
  );
}
