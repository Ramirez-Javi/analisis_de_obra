/**
 * Utilidades CSV minimalistas — sin dependencias externas.
 * Escapa campos con comas, comillas o saltos de línea según RFC 4180.
 */

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(",")),
  ];
  return lines.join("\r\n");
}
