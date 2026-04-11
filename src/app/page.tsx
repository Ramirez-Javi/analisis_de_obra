import { Header } from "@/components/layout/Header";
import { ModuleGrid } from "@/components/hub/ModuleGrid";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <ModuleGrid />
      </main>
      <footer className="border-t dark:border-white/[0.04] border-slate-200 py-4 px-6 text-center">
        <p className="text-xs dark:text-slate-600 text-slate-400">
          TEKÓGA &mdash; Innovación en Construcción
        </p>
      </footer>
    </div>
  );
}
