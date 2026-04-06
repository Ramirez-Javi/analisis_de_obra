import { ModuleCard } from "./ModuleCard";
import { MODULES } from "./moduleData";

export function ModuleGrid() {
  return (
    <section className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight dark:text-slate-100 text-slate-800">
          Centro de Mando
        </h1>
        <p className="mt-2 text-sm dark:text-slate-400 text-slate-500">
          Selecciona un módulo para comenzar a trabajar.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {MODULES.map((mod) => (
          <ModuleCard key={mod.id} module={mod} />
        ))}
      </div>
    </section>
  );
}
