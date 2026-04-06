import { ThemeToggle } from "./ThemeToggle";
import { LayoutDashboard } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b dark:bg-slate-950/80 bg-white/80 dark:border-white/[0.06] border-slate-200 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase dark:text-teal-400 text-teal-600">
              TEKOINNOVA
            </span>
            <span className="text-sm font-bold dark:text-slate-100 text-slate-800">
              Architectural Precision Engine
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs dark:text-slate-500 text-slate-400">
            v1.0.0
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
