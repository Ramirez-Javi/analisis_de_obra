/**
 * Shared report-header utilities.
 * Reads the empresa config saved by the Reportes module (localStorage key
 * `reportes_empresa_${proyectoId}`) and returns ready-to-use HTML strings
 * and CSS so every PDF export shares the same branded header.
 */

export interface EmpresaConfig {
  nombre: string;
  slogan: string;
  direccion: string;
  email: string;
  telefono: string;
  web: string;
  logoUrl: string;
}

const DEFAULT_EMPRESA: EmpresaConfig = {
  nombre: "TEKÓGA",
  slogan: "Soluciones de Arquitectura e Ingeniería",
  direccion: "Asunción, Paraguay",
  email: "contacto@empresa.com",
  telefono: "+595 21 000 000",
  web: "www.empresa.com",
  logoUrl: "",
};

/** Read the empresa config saved by the Reportes module for a given project. */
export function getEmpresaConfig(proyectoId: string): EmpresaConfig {
  if (typeof window === "undefined") return { ...DEFAULT_EMPRESA };
  try {
    const raw = localStorage.getItem(`reportes_empresa_${proyectoId}`);
    if (raw) return { ...DEFAULT_EMPRESA, ...JSON.parse(raw) };
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_EMPRESA };
}

/** CSS required by the branded header (subset of ReportesClient PRINT_BASE_STYLES). */
export const REPORT_HEADER_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; padding: 18mm 15mm; }
  .logo-box { display: flex; align-items: flex-start; gap: 14pt; margin-bottom: 14pt; border-bottom: 2pt solid #222; padding-bottom: 10pt; }
  .logo-initial { width: 52pt; height: 52pt; background: #1e40af; color: white; font-size: 26pt; font-weight: 700; display: flex; align-items: center; justify-content: center; border-radius: 6pt; flex-shrink: 0; }
  .logo-img { width: 52pt; height: 52pt; object-fit: contain; display: block; border-radius: 6pt; }
  .empresa-nombre { font-size: 20pt; font-weight: 700; line-height: 1.1; }
  .empresa-slogan { font-size: 11pt; color: #555; margin-top: 2pt; }
  .empresa-contact { font-size: 8pt; color: #888; margin-top: 4pt; }
  .report-title { text-align: center; margin: 10pt 0 14pt; }
  .report-title h1 { font-size: 15pt; font-weight: 700; }
  .report-title p { font-size: 9pt; color: #666; margin-top: 3pt; }
  h2 { font-size: 11pt; font-weight: 700; margin: 14pt 0 5pt; border-bottom: 1pt solid #ccc; padding-bottom: 3pt; text-transform: uppercase; letter-spacing: 0.5pt; color: #555; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; font-size: 8.5pt; }
  th, td { border: 0.5pt solid #bbb; padding: 3pt 5pt; }
  th { background: #ececec; font-weight: 700; }
  .text-right { text-align: right; }
  .kpis { display: flex; gap: 10pt; flex-wrap: wrap; margin-bottom: 12pt; }
  .kpi { border: 0.5pt solid #d1d5db; border-radius: 5pt; padding: 6pt 10pt; min-width: 100pt; }
  .kpi .label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
  .kpi .value { font-size: 11pt; font-weight: 700; margin-top: 1pt; }
  .even-row { background: #f8fafc; }
  .copyright-footer { margin-top: 30pt; padding-top: 8pt; border-top: 0.5pt solid #ccc; text-align: center; font-size: 7.5pt; color: #aaa; }
  @media print { * { -webkit-print-color-adjust: exact; color-adjust: exact; } }
`;

/** Build the branded logo-box header HTML. */
export function buildReportHeader(empresa: EmpresaConfig): string {
  const logoHtml = empresa.logoUrl
    ? `<img class="logo-img" src="${empresa.logoUrl}" />`
    : `<div class="logo-initial">${empresa.nombre.charAt(0).toUpperCase()}</div>`;

  const contactParts: string[] = [];
  if (empresa.telefono) contactParts.push(empresa.telefono);
  if (empresa.email) contactParts.push(empresa.email);
  if (empresa.web) contactParts.push(empresa.web);
  if (empresa.direccion) contactParts.push(empresa.direccion);

  return (
    "<div class='logo-box'>" +
      "<div>" + logoHtml + "</div>" +
      "<div>" +
        "<div class='empresa-nombre'>" + empresa.nombre + "</div>" +
        (empresa.slogan ? "<div class='empresa-slogan'>" + empresa.slogan + "</div>" : "") +
        (contactParts.length ? "<div class='empresa-contact'>" + contactParts.join(" &nbsp;·&nbsp; ") + "</div>" : "") +
      "</div>" +
    "</div>"
  );
}

/** Open a new window with branded header, body content, and print. */
export function openBrandedPrintWindow(
  title: string,
  reportTitle: string,
  subtitle: string,
  bodyContent: string,
  empresa: EmpresaConfig,
): void {
  const win = window.open("", "_blank", "width=1100,height=750");
  if (!win) { alert("Permitir ventanas emergentes para exportar PDF"); return; }

  const fecha = new Date().toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" });
  const year = new Date().getFullYear();
  const header = buildReportHeader(empresa);

  win.document.write(
    "<!DOCTYPE html><html lang='es'><head><meta charset='utf-8'>" +
    "<title>" + title + "</title>" +
    "<style>" + REPORT_HEADER_CSS + "</style></head><body>" +
    header +
    "<div class='report-title'>" +
      "<h1>" + reportTitle + "</h1>" +
      "<p>" + subtitle + "</p>" +
      "<p>Fecha de emisión: " + fecha + "</p>" +
    "</div>" +
    bodyContent +
    "<div class='copyright-footer'>" +
      "&copy; " + year + " " + empresa.nombre +
      " &mdash; Todos los derechos reservados" +
      (empresa.web ? " &mdash; <strong>" + empresa.web + "</strong>" : "") +
    "</div>" +
    "</body></html>"
  );
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
