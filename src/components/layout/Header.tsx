import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { LayoutDashboard } from "lucide-react";
import { getSession } from "@/lib/session";

export async function Header() {
  const session = await getSession();
  const user = session?.user;
  const name = user?.name ?? "Usuario";
  const email = user?.email ?? "";
  const role = (user as { role?: string } | undefined)?.role ?? "USUARIO";

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b dark:bg-slate-950/80 bg-white/80 dark:border-white/[0.06] border-slate-200 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase dark:text-teal-400 text-teal-600">
              TEKOINNOVA
            </span>
            <span className="text-sm font-bold dark:text-slate-100 text-slate-800 hidden sm:block">
              Architectural Precision Engine
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user && <UserMenu name={name} email={email} role={role} />}
        </div>
      </div>
    </header>
  );
}

