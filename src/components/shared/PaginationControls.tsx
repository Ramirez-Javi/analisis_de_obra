"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  /** Mostrar solo si total supera este umbral (default 0 = siempre) */
  threshold?: number;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
  threshold = 0,
}: Props) {
  if (total <= threshold) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build compact page window: always show first, last, current ± 1
  function buildPages(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  const btnBase = "h-8 min-w-[2rem] px-1.5 rounded-lg text-xs font-medium transition-colors";
  const btnActive = "bg-teal-600 text-white";
  const btnIdle = "dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800 hover:bg-slate-100";
  const btnDisabled = "opacity-30 cursor-not-allowed";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t dark:border-white/[0.06] border-slate-200 text-xs">
      {/* Contador */}
      <p className="dark:text-slate-400 text-slate-500 tabular-nums shrink-0">
        {from}–{to} de <span className="font-medium dark:text-slate-300 text-slate-700">{total}</span>
      </p>

      {/* Páginas */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled : btnIdle}`}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5 mx-auto" />
        </button>

        {buildPages().map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 dark:text-slate-600 text-slate-400 select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`${btnBase} ${p === page ? btnActive : btnIdle}`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnIdle}`}
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-3.5 h-3.5 mx-auto" />
        </button>
      </div>

      {/* Filas por página */}
      <select
        value={pageSize}
        onChange={(e) => onPageSize(Number(e.target.value))}
        className="h-8 rounded-lg px-2 text-xs dark:bg-slate-800 bg-white border dark:border-white/[0.08] border-slate-200 dark:text-slate-300 text-slate-600"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>{n} / pág.</option>
        ))}
      </select>
    </div>
  );
}
