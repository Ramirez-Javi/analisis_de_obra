import { ModuleCard } from "./ModuleCard";
import { MODULES } from "./moduleData";
import { getSession } from "@/lib/session";

export async function ModuleGrid() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const permisos = (session?.user as { permisos?: string[] } | undefined)?.permisos ?? [];

  // ADMIN ve todo. USUARIO solo ve los módulos permitidos.
  const visibleModules =
    !session?.user || role === "ADMIN"
      ? MODULES
      : MODULES.filter((m) => permisos.includes(m.moduloEnum));

  return (
    <section className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight dark:text-slate-100 text-slate-800">
          Centro de Mando
        </h1>
        <p className="mt-2 text-sm dark:text-slate-400 text-slate-500">
          Seleccioná un módulo para comenzar a trabajar.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {visibleModules.map((mod) => (
          <ModuleCard key={mod.id} module={mod} />
        ))}
      </div>
    </section>
  );
}

