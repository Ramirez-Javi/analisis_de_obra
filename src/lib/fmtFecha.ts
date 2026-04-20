/**
 * Date formatting utilities for PDF/print exports.
 *
 * Why timeZone:"UTC"?
 * Dates stored in the DB are UTC midnight (Prisma DateTime).
 * Date-only ISO strings like "2026-04-20" are also parsed as UTC midnight
 * by `new Date()`. Rendering them in the user's local timezone (Paraguay, UTC-4)
 * would shift the displayed day back by one. Using timeZone:"UTC" for formatting
 * ensures the calendar date shown always matches the intended stored date.
 *
 * Exception: "Fecha de emisión" (the current moment) uses local time because
 * it represents right now, not a stored date value.
 */

const LOCALE = "es-PY";

/**
 * "20 de abril de 2026"
 * Use for stored date fields in PDF bodies and headers.
 */
export function fmtFechaLarga(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));
}

/**
 * "lunes, 20 de abril de 2026"
 * Use for bitácora entry headers in PDF.
 */
export function fmtFechaLargaConDia(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));
}

/**
 * "20/04/2026"
 * Use for table cells and compact references in PDFs.
 */
export function fmtFechaCorta(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));
}

/**
 * "20 de abril de 2026" — uses LOCAL time (not UTC).
 * Use only for "Fecha de emisión" (the current moment when the PDF is generated).
 */
export function fmtFechaEmision(): string {
  return new Date().toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
