import { Header } from "@/components/layout/Header";
import { ModuleGrid } from "@/components/hub/ModuleGrid";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50 transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <ModuleGrid />
      </main>

    </div>
  );
}
