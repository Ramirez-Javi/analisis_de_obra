import Link from "next/link";
import { ArrowLeft, Truck, Clock } from "lucide-react";

export default async function LogisticaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] dark:bg-slate-950 bg-slate-50">
      {/* Header */}
      <div className="sticky top-[52px] z-30 dark:bg-slate-950/95 bg-white/95 backdrop-blur-md border-b dark:border-white/[0.06] border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href={`/proyectos/${id}`}
            className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 dark:text-slate-400 text-slate-500" />
          </Link>
          <Truck className="w-4 h-4 dark:text-yellow-400 text-yellow-600" />
          <div>
            <h1 className="text-sm font-bold dark:text-slate-100 text-slate-900 leading-tight">
              Maquinarias y Logística
            </h1>
            <p className="text-xs dark:text-slate-500 text-slate-400">Módulo 5 · En desarrollo</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 py-24 px-6">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
          <Clock className="w-7 h-7 dark:text-yellow-400 text-yellow-600" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold dark:text-slate-100 text-slate-800">En desarrollo</h2>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-2 leading-relaxed">
            El módulo de Maquinarias y Logística estará disponible próximamente. Aquí podrás
            registrar fletes, alquiler de maquinaria, honorarios de proyecto y gastos
            administrativos separados de los materiales.
          </p>
        </div>
        <Link
          href={`/proyectos/${id}`}
          className="mt-1 px-4 py-2 rounded-lg text-sm font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 dark:hover:bg-slate-700 hover:bg-slate-200 transition-colors"
        >
          Volver al Centro de Mando
        </Link>
      </div>
    </div>
  );
}
