import { useState, useMemo } from "react";

export interface UsePaginationResult<T> {
  /** Items del slice actual */
  items: T[];
  /** Página actual (1-based) */
  page: number;
  /** Total de páginas */
  totalPages: number;
  /** Total de items en la lista filtrada */
  total: number;
  /** Tamaño de página activo */
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
  /** Resetea a página 1 (llamar cuando cambie el filtro) */
  reset: () => void;
}

/**
 * Paginación pura en memoria.
 * Resetea a página 1 automáticamente cuando cambia `data`.
 *
 * @param data  Array ya filtrado/ordenado
 * @param defaultPageSize  Número de filas por página (default 50)
 */
export function usePagination<T>(
  data: T[],
  defaultPageSize = 50,
): UsePaginationResult<T> {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Clamp page when data length shrinks
  const safePage = Math.min(page, totalPages);

  const items = useMemo(
    () => data.slice((safePage - 1) * pageSize, safePage * pageSize),
    [data, safePage, pageSize],
  );

  function setPage(p: number) {
    setPageRaw(Math.max(1, Math.min(p, totalPages)));
  }

  function setPageSize(n: number) {
    setPageSizeRaw(n);
    setPageRaw(1);
  }

  function reset() {
    setPageRaw(1);
  }

  return { items, page: safePage, totalPages, total: data.length, pageSize, setPage, setPageSize, reset };
}
