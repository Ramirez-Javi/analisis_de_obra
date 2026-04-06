"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="group w-9 h-9 flex items-center justify-center rounded-lg
                 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10
                 border border-white/10 hover:border-white/20
                 transition-all duration-200 cursor-pointer"
    >
      {isDark ? (
        <Sun size={16} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
      ) : (
        <Moon size={16} className="text-slate-600 group-hover:text-slate-800 transition-colors" />
      )}
    </button>
  );
}
