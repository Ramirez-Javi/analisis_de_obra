import Link from "next/link";
import { ArrowLeft, Truck, Construction } from "lucide-react";

export default function LogisticaPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      <div className="sticky top-0 z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors duration-150">
            <ArrowLeft size={15} />
            Centro de Mando
          </Link>
          <div className="w-px h-4 dark:bg-white/10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Truck size={15} className="dark:text-yellow-400 text-yellow-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">Maquinarias y Logística</p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">Módulo 5</p>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <Construction size={28} className="dark:text-yellow-400 text-yellow-600" />
          </div>
          <div>
            <p className="text-lg font-bold dark:text-slate-100 text-slate-800">En desarrollo</p>
            <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">
              Maquinarias y Logística estará disponible próximamente.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
