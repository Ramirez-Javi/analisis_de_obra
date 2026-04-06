import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface FormCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconGradient: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

export function FormCard({
  title,
  subtitle,
  icon: Icon,
  iconGradient,
  children,
  headerAction,
}: FormCardProps) {
  return (
    <div className="rounded-2xl dark:bg-slate-900 bg-white dark:border dark:border-white/[0.06] border border-slate-200 shadow-md dark:shadow-none overflow-hidden transition-colors duration-200">
      <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/[0.06] border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center shrink-0 shadow-md`}>
            <Icon size={16} className="text-white" strokeWidth={1.75} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">{title}</p>
            {subtitle && (
              <p className="text-xs dark:text-slate-400 text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}
