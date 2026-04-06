import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ModuleDefinition } from "./moduleData";

interface ModuleCardProps {
  module: ModuleDefinition;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const Icon = module.icon;

  return (
    <Link
      href={module.href}
      className="group relative flex flex-col h-full p-6 rounded-2xl overflow-hidden cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 dark:bg-slate-900 bg-white dark:border dark:border-white/[0.06] border border-slate-200 dark:hover:border-teal-500/30 hover:border-teal-400/40 shadow-md dark:shadow-none hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 ease-out hover:-translate-y-1"
    >
      {/* Glow de fondo en hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-[0.05] bg-gradient-to-br ${module.gradient} transition-opacity duration-300`}
      />

      {/* Línea superior iluminada en hover */}
      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${module.gradient} opacity-0 group-hover:opacity-70 transition-opacity duration-300`}
      />

      {/* Ícono */}
      <div
        className={`relative w-12 h-12 rounded-xl mb-5 flex items-center justify-center bg-gradient-to-br ${module.gradient} shadow-lg ${module.shadowColor} group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon size={22} className="text-white" strokeWidth={1.75} />
      </div>

      {/* Título + badge */}
      <div className="flex items-start justify-between gap-2 mb-1 relative">
        <h2 className="text-base font-semibold leading-snug dark:text-slate-100 text-slate-800">
          {module.title}
        </h2>
        {module.badge && (
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${module.gradient} text-white`}>
            {module.badge}
          </span>
        )}
      </div>

      {/* Subtítulo */}
      <p className={`text-xs font-medium mb-3 relative ${module.accentColor}`}>
        {module.subtitle}
      </p>

      {/* Descripción */}
      <p className="text-sm leading-relaxed relative flex-1 dark:text-slate-400 text-slate-500">
        {module.description}
      </p>

      {/* CTA hover */}
      <div className={`relative flex items-center gap-1.5 mt-5 text-xs font-medium ${module.accentColor} opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300`}>
        <span>Abrir módulo</span>
        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-200" />
      </div>
    </Link>
  );
}
