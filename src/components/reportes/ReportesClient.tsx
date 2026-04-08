"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  FileDown,
  FileText,
  Settings,
  User,
  Building2,
  Download,
  Printer,
  Upload,
  Eye,
  HardHat,
  Package,
  Calendar,
  Truck,
  BarChart2,
} from "lucide-react";
import {
  type RubroProyecto,
  calcSubtotalRubro,
  calcPrecioUnitarioRubro,
  calcCantidadReal,
  calcTotalInsumo,
  fmtGs,
  fmtNum,
} from "@/components/presupuesto/types";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface EmpresaConfig {
  nombre: string;
  slogan: string;
  direccion: string;
  email: string;
  telefono: string;
  web: string;
  logoUrl: string;
}

interface Propietario {
  id: string;
  nombre: string;
  apellido: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
}

interface MiembroEquipo {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}

export interface ProyectoReporte {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  superficieM2?: number | null;
  fechaInicio?: Date | string | null;
  fechaFinEstimada?: Date | string | null;
  estado?: string;
  empresa?: {
    nombre: string;
    titulo?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    web?: string | null;
    ciudad?: string | null;
    pais?: string | null;
    logoUrl?: string | null;
  } | null;
  propietarios?: Propietario[];
  equipoTecnico?: MiembroEquipo[];
}

export interface ReportesClientProps {
  proyecto?: ProyectoReporte;
  backHref?: string;
  stickyTop?: string;
}

type Tab = "config" | "cliente" | "profesional" | "cronograma" | "personal" | "logistica";

// ─────────────────────────────────────────────────────────────
// Extra types for new modules (stored in localStorage)
// ─────────────────────────────────────────────────────────────

interface RubroCronograma {
  id: string;
  nombre: string;
  total: number;
  fechaInicio: string;
  duracion: number;
  avanceReal: number;
  desembolso?: number;
}

interface PersonalContrato {
  id: string;
  nombre: string;
  rol: string;
  montoPactado: number;
  totalPagado: number;
  porcRetencion: number;
  estado: string;
}

interface CostoLogistica {
  id: string;
  descripcion: string;
  tipo: string;
  monto: number;
  proveedor?: string;
  fecha?: string;
}

// ─────────────────────────────────────────────────────────────
// Common copyright footer for all print layouts
// ─────────────────────────────────────────────────────────────

// (copyright year computed inline in CopyrightFooter component)

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_EMPRESA: EmpresaConfig = {
  nombre: "TEKOINNOVA",
  slogan: "Soluciones de Arquitectura e Ingeniería",
  direccion: "Asunción, Paraguay",
  email: "contacto@empresa.com",
  telefono: "+595 21 000 000",
  web: "www.empresa.com",
  logoUrl: "",
};

const ESTADOS_LABEL: Record<string, string> = {
  PLANIFICACION: "Planificación",
  EN_EJECUCION: "En Ejecución",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtDate(d?: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function exportCSV(
  rubros: RubroProyecto[],
  modo: "cliente" | "profesional",
  filename: string,
) {
  const lines: string[] = [];
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;

  if (modo === "cliente") {
    lines.push(
      [
        q("Código"),
        q("Descripción"),
        q("Unidad"),
        q("Cantidad"),
        q("P. Unitario (Gs)"),
        q("Subtotal (Gs)"),
      ].join(","),
    );
    for (const r of rubros) {
      const pu = calcPrecioUnitarioRubro(r);
      const sub = calcSubtotalRubro(r);
      lines.push(
        [
          q(r.codigo),
          q(r.nombre),
          q(r.unidad),
          r.cantidadObra,
          Math.round(pu),
          Math.round(sub),
        ].join(","),
      );
    }
  } else {
    lines.push(
      [
        q("Código"),
        q("Descripción"),
        q("Tipo"),
        q("Unidad"),
        q("Rendimiento"),
        q("Cantidad Real"),
        q("P. Unitario (Gs)"),
        q("Total (Gs)"),
      ].join(","),
    );
    for (const r of rubros) {
      const pu = calcPrecioUnitarioRubro(r);
      const sub = calcSubtotalRubro(r);
      lines.push(
        [
          q(r.codigo),
          q(r.nombre),
          q("RUBRO"),
          q(r.unidad),
          r.cantidadObra,
          r.cantidadObra,
          Math.round(pu),
          Math.round(sub),
        ].join(","),
      );
      for (const ins of r.insumos) {
        const cant = calcCantidadReal(
          r.cantidadObra,
          ins.rendimiento,
          ins.porcPerdida,
        );
        const total = calcTotalInsumo(r.cantidadObra, ins);
        lines.push(
          [
            q(""),
            q(`  → ${ins.nombre}`),
            q(ins.esManodeObra ? "M.O." : "Material"),
            q(ins.unidad),
            ins.rendimiento,
            fmtNum(cant, 3),
            Math.round(ins.precioUnitario),
            Math.round(total),
          ].join(","),
        );
      }
    }
  }

  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Base print CSS shared by all print windows */
const PRINT_BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; padding: 18mm 15mm; }
  h1 { font-size: 18pt; font-weight: 700; margin-bottom: 4pt; }
  h2 { font-size: 11pt; font-weight: 700; margin: 14pt 0 5pt; border-bottom: 1pt solid #ccc; padding-bottom: 3pt; text-transform: uppercase; letter-spacing: 0.5pt; color: #555; }
  h3 { font-size: 9.5pt; font-weight: 700; margin: 8pt 0 4pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; font-size: 8.5pt; }
  th, td { border: 0.5pt solid #bbb; padding: 3pt 5pt; }
  th { background: #ececec; font-weight: 700; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .logo-box { display: flex; align-items: flex-start; gap: 14pt; margin-bottom: 14pt; border-bottom: 2pt solid #222; padding-bottom: 10pt; }
  .logo-box > div:first-child { width: 52pt; height: 52pt; flex-shrink: 0; overflow: hidden; border-radius: 6pt; }
  .logo-box > div:first-child img { width: 52pt !important; height: 52pt !important; max-width: 52pt !important; max-height: 52pt !important; object-fit: contain !important; position: static !important; display: block !important; }
  .logo-initial { width: 52pt; height: 52pt; background: #1e40af; color: white; font-size: 26pt; font-weight: 700; display: flex; align-items: center; justify-content: center; border-radius: 6pt; flex-shrink: 0; }
  .empresa-nombre { font-size: 20pt; font-weight: 700; line-height: 1.1; }
  .empresa-slogan { font-size: 11pt; color: #555; margin-top: 2pt; }
  .empresa-contact { font-size: 8pt; color: #888; margin-top: 4pt; }
  .report-title { text-align: center; margin: 10pt 0 14pt; }
  .report-title h1 { font-size: 15pt; }
  .report-title p { font-size: 9pt; color: #666; margin-top: 3pt; }
  .ficha-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3pt 28pt; margin-bottom: 10pt; }
  .ficha-item { display: flex; gap: 5pt; font-size: 9pt; }
  .ficha-label { color: #666; min-width: 100pt; }
  .ficha-section-title { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; color: #888; margin: 8pt 0 4pt; }
  .rubro-header { background: #e8eaf6; padding: 4pt 6pt; font-size: 9pt; display: flex; justify-content: space-between; border: 0.5pt solid #bbb; }
  .rubro-codigo { font-weight: 700; color: #1e40af; margin-right: 5pt; }
  .badge-mo { background: #fef3c7; padding: 1pt 3pt; border-radius: 2pt; font-size: 7.5pt; }
  .badge-mat { background: #dbeafe; padding: 1pt 3pt; border-radius: 2pt; font-size: 7.5pt; }
  .total-row { font-weight: 700; background: #e8f0fe; }
  .grand-total { margin-top: 10pt; font-size: 10pt; font-weight: 700; border: 1pt solid #333; }
  .grand-total td { padding: 5pt 6pt; }
  .even-row { background: #f9f9f9; }
  .section-break { border-top: 1.5pt solid #333; margin: 14pt 0 10pt; }
  .copyright-footer { margin-top: 40pt; padding-top: 8pt; border-top: 0.5pt solid #ccc; text-align: center; font-size: 7.5pt; color: #aaa; page-break-inside: avoid; }
  /* Gantt styles */
  .gantt-row { display: flex; align-items: center; gap: 8pt; margin-bottom: 4pt; font-size: 8.5pt; }
  .gantt-name { width: 120pt; flex-shrink: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .gantt-track { flex: 1; height: 10pt; background: #eee; border-radius: 3pt; position: relative; border: 0.3pt solid #ccc; }
  .gantt-bar-plan { position: absolute; height: 100%; background: #3b82f6; border-radius: 3pt; opacity: 0.6; }
  .gantt-bar-real { position: absolute; height: 100%; background: #10b981; border-radius: 3pt; opacity: 0.8; bottom:0; }
  .gantt-pct { width: 30pt; text-align: right; color: #10b981; font-weight: 700; flex-shrink: 0; }
  .gantt-dates { width: 90pt; text-align: right; font-size: 7pt; color: #888; flex-shrink: 0; }
  @media print { * { -webkit-print-color-adjust: exact; color-adjust: exact; } }
`;

function openPrintWindow(title: string, bodyHtml: string) {
  const pw = window.open("", "_blank");
  if (!pw) return;
  const year = new Date().getFullYear();
  pw.document.write(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${title}</title>
<style>${PRINT_BASE_STYLES}</style></head><body>
${bodyHtml}
<div class="copyright-footer">
  &copy; ${year} TekoInnova &mdash; Todos los derechos reservados &mdash; <strong>www.tekoinnova.com</strong>
</div>
</body></html>`,
  );
  pw.document.close();
  setTimeout(() => { pw.print(); }, 400);
}

function printReport(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  openPrintWindow(title, el.innerHTML);
}

/** Print a Gantt/cronograma directly from data (no DOM element needed) */
function printGantt(
  rubros: RubroCronograma[],
  empresa: { nombre: string; slogan: string; logoUrl: string },
  proyectoNombre: string,
  proyectoCodigo: string,
  mode: "cliente" | "profesional",
  montoRecibidoCliente = 0,
) {
  const totalCost = rubros.reduce((s, r) => s + r.total, 0);
  const starts = rubros.map((r) => r.fechaInicio).sort();
  const projectStart = starts[0] ?? "";

  function dayOff(base: string, target: string) {
    return Math.round((new Date(target + "T00:00:00").getTime() - new Date(base + "T00:00:00").getTime()) / 86400000);
  }
  function addDays(dateStr: string, days: number) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  const ends = rubros.map((r) => addDays(r.fechaInicio, r.duracion)).sort();
  const projectEnd = ends[ends.length - 1] ?? projectStart;
  const totalDays = Math.max(dayOff(projectStart, projectEnd), 1);

  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="width:52pt;height:52pt;object-fit:contain;display:block;" />`
    : `<div class="logo-initial">${empresa.nombre.charAt(0)}</div>`;

  let ganttRows = "";
  rubros.forEach((r) => {
    const start = dayOff(projectStart, r.fechaInicio);
    const leftPct = (start / totalDays) * 100;
    const widthPct = (r.duracion / totalDays) * 100;
    const endDate = addDays(r.fechaInicio, r.duracion);

    if (mode === "cliente") {
      // Clean Gantt: planned bar only, date range
      ganttRows += `
<div class="gantt-row">
  <div class="gantt-name" title="${r.nombre}">${r.nombre}</div>
  <div class="gantt-track">
    <div class="gantt-bar-plan" style="left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%;"></div>
  </div>
  <div class="gantt-dates">${r.fechaInicio} → ${endDate}</div>
</div>`;
    } else {
      // Profesional: planned + real bars + avance + desembolso
      const realWidthPct = widthPct * (r.avanceReal / 100);
      const desembolso = r.desembolso ? `<br/><small style="color:#888;">Desemb.: Gs ${new Intl.NumberFormat("es-PY").format(Math.round(r.desembolso))}</small>` : "";
      ganttRows += `
<div class="gantt-row">
  <div class="gantt-name" title="${r.nombre}">${r.nombre}${desembolso}</div>
  <div class="gantt-track">
    <div class="gantt-bar-plan" style="left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%;"></div>
    <div class="gantt-bar-real" style="left:${leftPct.toFixed(1)}%;width:${realWidthPct.toFixed(1)}%;top:40%;height:60%;"></div>
  </div>
  <div class="gantt-pct">${r.avanceReal}%</div>
  <div class="gantt-dates">${r.fechaInicio} → ${endDate}</div>
</div>`;
    }
  });

  const today = new Date().toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" });
  const totalCertificado = rubros.reduce((s, r) => s + r.total * (r.avanceReal / 100), 0);
  const fmtG = (n: number) => "Gs " + new Intl.NumberFormat("es-PY").format(Math.round(n));

  let statsSection = "";
  if (mode === "profesional") {
    const desembolsosTotal = rubros.reduce((s, r) => s + (r.desembolso ?? 0), 0);
    const avanceProm = rubros.length > 0 ? rubros.reduce((s, r) => s + r.avanceReal, 0) / rubros.length : 0;
    const pctFisica = totalCost > 0 ? (totalCertificado / totalCost) * 100 : 0;
    const pctFinanciera = totalCost > 0 ? (montoRecibidoCliente / totalCost) * 100 : 0;
    const saldo = montoRecibidoCliente - totalCertificado;

    statsSection = `
<h2>Resumen de Avance y Desembolsos</h2>
<table>
  <thead><tr><th>Rubro</th><th class="text-right">Presupuesto</th><th class="text-center">Avance %</th><th class="text-right">Ejecutado</th><th class="text-right">Desembolsado</th><th>Inicio</th><th>Fin Planif.</th></tr></thead>
  <tbody>
    ${rubros.map((r, i) => `
    <tr class="${i % 2 ? "even-row" : ""}">
      <td>${r.nombre}</td>
      <td class="text-right">${fmtG(r.total)}</td>
      <td class="text-center">${r.avanceReal}%</td>
      <td class="text-right">${fmtG(r.total * r.avanceReal / 100)}</td>
      <td class="text-right">${r.desembolso ? fmtG(r.desembolso) : "—"}</td>
      <td>${r.fechaInicio}</td>
      <td>${addDays(r.fechaInicio, r.duracion)}</td>
    </tr>`).join("")}
  </tbody>
  <tfoot>
    <tr class="total-row">
      <td><strong>TOTAL</strong></td>
      <td class="text-right"><strong>${fmtG(totalCost)}</strong></td>
      <td class="text-center"><strong>${avanceProm.toFixed(1)}%</strong></td>
      <td class="text-right"><strong>${fmtG(totalCertificado)}</strong></td>
      <td class="text-right"><strong>${fmtG(desembolsosTotal)}</strong></td>
      <td colspan="2">${projectStart} → ${projectEnd}</td>
    </tr>
  </tfoot>
</table>
<h2 style="margin-top:12pt;">Resumen Financiero</h2>
<table>
  <thead><tr><th>Concepto</th><th class="text-right">Monto</th><th class="text-right">% s/Presupuesto</th></tr></thead>
  <tbody>
    <tr><td>Presupuesto Total de Obra</td><td class="text-right">${fmtG(totalCost)}</td><td class="text-right">100%</td></tr>
    <tr class="even-row"><td>Total Certificado (Ejecución Física)</td><td class="text-right">${fmtG(totalCertificado)}</td><td class="text-right">${pctFisica.toFixed(1)}%</td></tr>
    <tr><td>Total Desembolsado a Contratistas</td><td class="text-right">${fmtG(desembolsosTotal)}</td><td class="text-right">${totalCost > 0 ? ((desembolsosTotal / totalCost) * 100).toFixed(1) : "0"}%</td></tr>
    <tr class="even-row"><td><strong>Monto Recibido del Cliente</strong></td><td class="text-right"><strong>${fmtG(montoRecibidoCliente)}</strong></td><td class="text-right"><strong>${pctFinanciera.toFixed(1)}%</strong></td></tr>
    <tr><td>Saldo a Ejecutar / Certificar</td><td class="text-right">${fmtG(Math.max(0, totalCost - totalCertificado))}</td><td class="text-right">${(100 - pctFisica).toFixed(1)}%</td></tr>
    <tr class="even-row" style="color:${saldo >= 0 ? "#059669" : "#dc2626"};"><td><strong>Saldo Disponible (Recibido − Certificado)</strong></td><td class="text-right"><strong>${fmtG(saldo)}</strong></td><td class="text-right">—</td></tr>
  </tbody>
</table>`;
  }

  const ganttStyleExtra = mode === "cliente"
    ? `.gantt-pct{display:none;}.gantt-bar-real{display:none;}`
    : ``;

  const legendHtml = mode === "profesional"
    ? `<div style="margin-bottom:6pt;font-size:7.5pt;display:flex;gap:14pt;align-items:center;">
  <span><span style="display:inline-block;width:16pt;height:8pt;background:#3b82f6;opacity:0.6;border-radius:2pt;vertical-align:middle;margin-right:3pt;"></span>Planificado</span>
  <span><span style="display:inline-block;width:16pt;height:8pt;background:#10b981;border-radius:2pt;vertical-align:middle;margin-right:3pt;"></span>Realizado</span>
</div>`
    : ``;

  const body = `
<style>${ganttStyleExtra}</style>
<div class="logo-box">
  <div>${logoHtml}</div>
  <div>
    <div class="empresa-nombre">${empresa.nombre}</div>
    <div class="empresa-slogan">${empresa.slogan}</div>
  </div>
</div>
<div class="report-title">
  <h1>${mode === "cliente" ? "CRONOGRAMA CONTRACTUAL DE EJECUCIÓN DE OBRA" : "CRONOGRAMA TÉCNICO — AVANCE Y SEGUIMIENTO FINANCIERO"}</h1>
  <p>${proyectoCodigo} — ${proyectoNombre}</p>
  <p>Fecha de emisión: ${today} &nbsp;|&nbsp; Período: ${projectStart} a ${projectEnd} (${totalDays} días)</p>
</div>
<h2>Diagrama de Gantt</h2>
${legendHtml}
${ganttRows}
${mode === "cliente" ? `<p style="font-size:7.5pt;color:#888;margin-top:5pt;">El presente cronograma representa la planificación contractual de la ejecución de obra. Los plazos son referenciales y sujetos a modificaciones acordadas entre las partes.</p>` : `<p style="font-size:7.5pt;color:#888;margin-top:5pt;">Avance certificado: ${fmtG(totalCertificado)} de ${fmtG(totalCost)}</p>`}
${statsSection}`;

  openPrintWindow(
    `Cronograma ${mode === "cliente" ? "Cliente" : "Profesional"} — ${proyectoNombre}`,
    body,
  );
}

/** Print personal/mano-de-obra from data */
function printPersonal(
  contratos: PersonalContrato[],
  empresa: { nombre: string; slogan: string; logoUrl: string },
  proyectoNombre: string,
  proyectoCodigo: string,
) {
  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="width:52pt;height:52pt;object-fit:contain;display:block;" />`
    : `<div class="logo-initial">${empresa.nombre.charAt(0)}</div>`;
  const today = new Date().toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" });
  const fmtG = (n: number) => "Gs " + new Intl.NumberFormat("es-PY").format(Math.round(n));
  const totPactado = contratos.reduce((s, c) => s + c.montoPactado, 0);
  const totPagado = contratos.reduce((s, c) => s + c.totalPagado, 0);
  const totPendiente = contratos.reduce((s, c) => s + Math.max(0, c.montoPactado - c.totalPagado), 0);

  // Simple bar chart as SVG
  const svgH = 120, barPad = 16, barW = 80;
  const maxVal = Math.max(totPactado, totPagado, totPendiente, 1);
  const scale = (svgH - 30) / maxVal;
  const bars = [
    { label: "Pactado", val: totPactado, color: "#3b82f6" },
    { label: "Pagado", val: totPagado, color: "#10b981" },
    { label: "Pendiente", val: totPendiente, color: "#f59e0b" },
  ];
  const svgContent = bars.map((b, i) => {
    const x = barPad + i * (barW + barPad);
    const barH = b.val * scale;
    const y = svgH - 20 - barH;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${b.color}" rx="3"/>
<text x="${x + barW / 2}" y="${svgH - 5}" text-anchor="middle" font-size="8" fill="#555">${b.label}</text>
<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="7" fill="${b.color}">${fmtG(b.val)}</text>`;
  }).join("");
  const svgTotalW = barPad + bars.length * (barW + barPad);
  const svgChart = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgTotalW}" height="${svgH}" style="display:block;margin:8pt 0;">${svgContent}</svg>`;

  const body = `
<div class="logo-box">
  <div>${logoHtml}</div>
  <div>
    <div class="empresa-nombre">${empresa.nombre}</div>
    <div class="empresa-slogan">${empresa.slogan}</div>
  </div>
</div>
<div class="report-title">
  <h1>GESTIÓN DE PERSONAL — MANO DE OBRA</h1>
  <p>${proyectoCodigo} — ${proyectoNombre}</p>
  <p>Fecha de emisión: ${today}</p>
</div>
<h2>Resumen General</h2>
${svgChart}
<table>
  <thead>
    <tr><th>Contrato / Trabajador</th><th>Rol</th><th class="text-right">Monto Pactado</th><th class="text-right">Total Pagado</th><th class="text-right">Retención %</th><th class="text-right">Saldo</th><th class="text-center">Estado</th></tr>
  </thead>
  <tbody>
    ${contratos.map((c, i) => {
      const saldo = Math.max(0, c.montoPactado - c.totalPagado);
      return `<tr class="${i % 2 ? "even-row" : ""}">
        <td>${c.nombre}</td>
        <td>${c.rol}</td>
        <td class="text-right">${fmtG(c.montoPactado)}</td>
        <td class="text-right">${fmtG(c.totalPagado)}</td>
        <td class="text-center">${c.porcRetencion}%</td>
        <td class="text-right">${fmtG(saldo)}</td>
        <td class="text-center" style="color:${c.estado === "ACTIVO" ? "#10b981" : "#888"}">${c.estado}</td>
      </tr>`;
    }).join("")}
  </tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="2"><strong>TOTALES</strong></td>
      <td class="text-right"><strong>${fmtG(totPactado)}</strong></td>
      <td class="text-right"><strong>${fmtG(totPagado)}</strong></td>
      <td></td>
      <td class="text-right"><strong>${fmtG(totPendiente)}</strong></td>
      <td></td>
    </tr>
  </tfoot>
</table>`;

  openPrintWindow(`Gestión de Personal — ${proyectoNombre}`, body);
}

/** Print logística/fletes/maquinarias from data */
function printLogistica(
  costos: CostoLogistica[],
  empresa: { nombre: string; slogan: string; logoUrl: string },
  proyectoNombre: string,
  proyectoCodigo: string,
) {
  const logoHtml = empresa.logoUrl
    ? `<img src="${empresa.logoUrl}" style="width:52pt;height:52pt;object-fit:contain;display:block;" />`
    : `<div class="logo-initial">${empresa.nombre.charAt(0)}</div>`;
  const today = new Date().toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" });
  const fmtG = (n: number) => "Gs " + new Intl.NumberFormat("es-PY").format(Math.round(n));

  const TIPO_LABELS: Record<string, string> = {
    FLETE: "Flete",
    ALQUILER_MAQUINARIA: "Alq. Maquinaria",
    HONORARIOS_PROYECTO: "Honorarios",
    GASTO_ADMINISTRATIVO: "Gasto Adm.",
    SEGURO: "Seguro",
    OTRO: "Otro",
  };

  // Group by tipo for summary
  const byTipo = new Map<string, number>();
  costos.forEach((c) => {
    byTipo.set(c.tipo, (byTipo.get(c.tipo) ?? 0) + c.monto);
  });
  const totalGeneral = costos.reduce((s, c) => s + c.monto, 0);

  // SVG bar chart by type
  const tipoEntries = Array.from(byTipo.entries()).sort((a, b) => b[1] - a[1]);
  const svgH = 120, barPad = 12, barW = 60;
  const maxVal = Math.max(...tipoEntries.map((e) => e[1]), 1);
  const scale = (svgH - 30) / maxVal;
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];
  const svgBars = tipoEntries.map(([tipo, val], i) => {
    const x = barPad + i * (barW + barPad);
    const barH = val * scale;
    const y = svgH - 20 - barH;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${COLORS[i % COLORS.length]}" rx="3"/>
<text x="${x + barW / 2}" y="${svgH - 5}" text-anchor="middle" font-size="8" fill="#555">${TIPO_LABELS[tipo] ?? tipo}</text>
<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="7" fill="${COLORS[i % COLORS.length]}">${fmtG(val)}</text>`;
  }).join("");
  const svgW = barPad + tipoEntries.length * (barW + barPad);
  const svgChart = tipoEntries.length > 0
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="display:block;margin:8pt 0;">${svgBars}</svg>`
    : "";

  const body = `
<div class="logo-box">
  <div>${logoHtml}</div>
  <div>
    <div class="empresa-nombre">${empresa.nombre}</div>
    <div class="empresa-slogan">${empresa.slogan}</div>
  </div>
</div>
<div class="report-title">
  <h1>FLETES, MAQUINARIAS Y COSTOS INDIRECTOS</h1>
  <p>${proyectoCodigo} — ${proyectoNombre}</p>
  <p>Fecha de emisión: ${today}</p>
</div>
<h2>Distribución por Tipo</h2>
${svgChart}
<table style="width:auto;min-width:280pt;margin-bottom:12pt;">
  <thead><tr><th>Tipo</th><th class="text-right">Total</th><th class="text-right">% del total</th></tr></thead>
  <tbody>
    ${tipoEntries.map(([tipo, val], i) => `
    <tr class="${i % 2 ? "even-row" : ""}">
      <td>${TIPO_LABELS[tipo] ?? tipo}</td>
      <td class="text-right">${fmtG(val)}</td>
      <td class="text-right">${totalGeneral > 0 ? ((val / totalGeneral) * 100).toFixed(1) : "0"}%</td>
    </tr>`).join("")}
  </tbody>
  <tfoot>
    <tr class="total-row"><td><strong>TOTAL</strong></td><td class="text-right"><strong>${fmtG(totalGeneral)}</strong></td><td class="text-right">100%</td></tr>
  </tfoot>
</table>
<h2>Detalle de Costos Indirectos</h2>
<table>
  <thead><tr><th>Descripción</th><th>Tipo</th><th>Proveedor</th><th>Fecha</th><th class="text-right">Monto</th></tr></thead>
  <tbody>
    ${costos.map((c, i) => `
    <tr class="${i % 2 ? "even-row" : ""}">
      <td>${c.descripcion}</td>
      <td>${TIPO_LABELS[c.tipo] ?? c.tipo}</td>
      <td>${c.proveedor ?? "—"}</td>
      <td>${c.fecha ?? "—"}</td>
      <td class="text-right">${fmtG(c.monto)}</td>
    </tr>`).join("")}
  </tbody>
  <tfoot>
    <tr class="total-row"><td colspan="4"><strong>TOTAL GENERAL</strong></td><td class="text-right"><strong>${fmtG(totalGeneral)}</strong></td></tr>
  </tfoot>
</table>`;

  openPrintWindow(`Logística y Fletes — ${proyectoNombre}`, body);
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function EmpresaHeaderDisplay({ cfg }: { cfg: EmpresaConfig }) {
  return (
    <div className="logo-box flex items-start gap-5 pb-5 border-b-2 border-slate-300 dark:border-slate-600 mb-6">
      <div
        style={{ width: 64, height: 64, flexShrink: 0, position: "relative", overflow: "hidden" }}
        className="rounded-xl border dark:border-slate-700 border-slate-200 bg-slate-50 dark:bg-slate-800 flex items-center justify-center"
      >
        {cfg.logoUrl ? (
          <Image
            src={cfg.logoUrl}
            alt="Logo"
            width={64}
            height={64}
            unoptimized
            style={{ width: 64, height: 64, objectFit: "contain", display: "block" }}
          />
        ) : (
          <div className="logo-initial h-full w-full flex items-center justify-center bg-blue-700 text-white font-bold text-3xl">
            {cfg.nombre.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="empresa-nombre text-2xl font-bold dark:text-white text-slate-900 leading-tight">
          {cfg.nombre}
        </div>
        <div className="empresa-slogan text-base text-slate-500 dark:text-slate-400 mt-0.5">
          {cfg.slogan}
        </div>
        <div className="empresa-contact flex flex-wrap gap-x-4 text-xs text-slate-400 mt-1.5">
          {cfg.direccion && <span>{cfg.direccion}</span>}
          {cfg.email && <span>{cfg.email}</span>}
          {cfg.telefono && <span>{cfg.telefono}</span>}
          {cfg.web && <span>{cfg.web}</span>}
        </div>
      </div>
    </div>
  );
}

function FichaSection({ proyecto }: { proyecto?: ProyectoReporte }) {
  if (!proyecto)
    return (
      <div className="text-sm text-slate-400 italic mb-6">
        Sin datos de proyecto.
      </div>
    );

  const rows = [
    { label: "Código", value: proyecto.codigo },
    { label: "Nombre", value: proyecto.nombre },
    { label: "Ubicación", value: proyecto.ubicacion ?? "—" },
    {
      label: "Estado",
      value:
        ESTADOS_LABEL[proyecto.estado ?? ""] ?? proyecto.estado ?? "—",
    },
    {
      label: "Sup. total (m²)",
      value: proyecto.superficieM2 ? fmtNum(proyecto.superficieM2) : "—",
    },
    { label: "Fecha inicio", value: fmtDate(proyecto.fechaInicio) },
    { label: "Fecha fin est.", value: fmtDate(proyecto.fechaFinEstimada) },
  ];
  if (proyecto.descripcion)
    rows.push({ label: "Descripción", value: proyecto.descripcion });

  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        Ficha del Proyecto
      </h2>
      <div className="ficha-grid grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm mb-4">
        {rows.map((r) => (
          <div key={r.label} className="ficha-item flex gap-2">
            <span className="ficha-label text-slate-500 dark:text-slate-400 min-w-[130px] shrink-0">
              {r.label}:
            </span>
            <span className="dark:text-slate-200 text-slate-800">
              {r.value}
            </span>
          </div>
        ))}
      </div>

      {(proyecto.propietarios?.length ?? 0) > 0 && (
        <div className="mb-4">
          <div className="ficha-section-title text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Propietarios
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {proyecto.propietarios!.map((p) => (
              <div key={p.id} className="flex gap-2">
                <span className="dark:text-slate-200 text-slate-800">
                  {p.nombre} {p.apellido}
                </span>
                {p.telefono && (
                  <span className="text-xs text-slate-400">{p.telefono}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(proyecto.equipoTecnico?.length ?? 0) > 0 && (
        <div className="mb-4">
          <div className="ficha-section-title text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Equipo Técnico
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {proyecto.equipoTecnico!.map((m) => (
              <div key={m.id} className="flex gap-2">
                <span className="dark:text-slate-200 text-slate-800">
                  {m.nombre} {m.apellido}
                </span>
                <span className="text-xs text-slate-400">{m.rol}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-break border-t-2 border-slate-200 dark:border-slate-700 mt-5" />
    </div>
  );
}

function PresupuestoClienteTable({
  rubros,
  montoContrato,
}: {
  rubros: RubroProyecto[];
  montoContrato: number;
}) {
  const totalGeneral = rubros.reduce(
    (acc, r) => acc + calcSubtotalRubro(r),
    0,
  );
  const diferencia = montoContrato - totalGeneral;

  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        Cómputo y Presupuesto
      </h2>
      {rubros.length === 0 ? (
        <p className="text-sm text-slate-400 italic">
          No hay rubros cargados en el presupuesto.
        </p>
      ) : (
        <>
          <table className="w-full text-xs border-collapse mb-2">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-left">
                  Ítem
                </th>
                <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-left">
                  Descripción
                </th>
                <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-center">
                  Unidad
                </th>
                <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right">
                  Cantidad
                </th>
                <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right">
                  P. Unitario
                </th>
                <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right">
                  Subtotal (Gs)
                </th>
              </tr>
            </thead>
            <tbody>
              {rubros.map((r, i) => {
                const pu = calcPrecioUnitarioRubro(r);
                const sub = calcSubtotalRubro(r);
                return (
                  <tr
                    key={r.instanceId}
                    className={
                      i % 2 !== 0
                        ? "dark:bg-slate-900/20 bg-slate-50 even-row"
                        : ""
                    }
                  >
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 font-mono">
                      {r.codigo}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1">
                      {r.nombre}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-center">
                      {r.unidad}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right">
                      {fmtNum(r.cantidadObra)}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right">
                      Gs {fmtGs(pu)}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right font-semibold">
                      Gs {fmtGs(sub)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row bg-blue-50 dark:bg-blue-950/30">
                <td
                  colSpan={5}
                  className="border border-slate-200 dark:border-slate-700 px-2 py-2 font-bold text-right"
                >
                  TOTAL PRESUPUESTO
                </td>
                <td className="border border-slate-200 dark:border-slate-700 px-2 py-2 font-bold text-right text-blue-700 dark:text-blue-400">
                  Gs {fmtGs(totalGeneral)}
                </td>
              </tr>
              {montoContrato > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right text-slate-500"
                    >
                      Monto del Contrato
                    </td>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right text-slate-500">
                      Gs {fmtGs(montoContrato)}
                    </td>
                  </tr>
                  <tr
                    className={
                      diferencia >= 0
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    <td
                      colSpan={5}
                      className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold"
                    >
                      {diferencia >= 0 ? "Margen" : "Déficit"}
                    </td>
                    <td className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right font-semibold">
                      {diferencia >= 0 ? "+" : ""}Gs {fmtGs(diferencia)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}

function PresupuestoProfesionalTable({
  rubros,
}: {
  rubros: RubroProyecto[];
}) {
  const totalMat = rubros.reduce(
    (acc, r) =>
      acc +
      r.insumos
        .filter((i) => !i.esManodeObra)
        .reduce((s, ins) => s + calcTotalInsumo(r.cantidadObra, ins), 0),
    0,
  );
  const totalMO = rubros.reduce(
    (acc, r) =>
      acc +
      r.insumos
        .filter((i) => i.esManodeObra)
        .reduce((s, ins) => s + calcTotalInsumo(r.cantidadObra, ins), 0),
    0,
  );
  const totalGeneral = totalMat + totalMO;

  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        Análisis de Precios Unitarios — Detalle por Rubro
      </h2>
      {rubros.length === 0 ? (
        <p className="text-sm text-slate-400 italic">
          No hay rubros cargados en el presupuesto.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {rubros.map((r) => {
              const sub = calcSubtotalRubro(r);
              const pu = calcPrecioUnitarioRubro(r);
              return (
                <div
                  key={r.instanceId}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <div className="rubro-header flex items-baseline justify-between bg-slate-100 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="rubro-codigo text-xs font-bold text-blue-600 dark:text-blue-400 mr-2">
                        {r.codigo}
                      </span>
                      <span className="text-sm font-semibold dark:text-slate-200 text-slate-800">
                        {r.nombre}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        — {r.unidad}
                      </span>
                    </div>
                    <div className="text-right text-xs shrink-0 ml-4">
                      <span className="text-slate-400">
                        Cant: {fmtNum(r.cantidadObra)} | P.U.: Gs {fmtGs(pu)} |{" "}
                      </span>
                      <span className="font-bold dark:text-slate-100 text-slate-900">
                        Gs {fmtGs(sub)}
                      </span>
                    </div>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/30">
                        <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-1 text-left">
                          Insumo
                        </th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-center w-12">
                          Tipo
                        </th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-center w-14">
                          Unidad
                        </th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-right w-16">
                          Rend.
                        </th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-right w-20">
                          Cant. Real
                        </th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-right w-24">
                          P. Unit. (Gs)
                        </th>
                        <th className="border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-right w-24">
                          Total (Gs)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.insumos.map((ins, idx) => {
                        const cant = calcCantidadReal(
                          r.cantidadObra,
                          ins.rendimiento,
                          ins.porcPerdida,
                        );
                        const total = calcTotalInsumo(r.cantidadObra, ins);
                        return (
                          <tr
                            key={ins.id}
                            className={
                              idx % 2 !== 0
                                ? "dark:bg-slate-900/20 bg-slate-50 even-row"
                                : ""
                            }
                          >
                            <td className="border-b border-slate-100 dark:border-slate-800 px-3 py-1">
                              {ins.nombre}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-800 px-2 py-1 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  ins.esManodeObra
                                    ? "badge-mo bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "badge-mat bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                }`}
                              >
                                {ins.esManodeObra ? "M.O." : "Mat."}
                              </span>
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-800 px-2 py-1 text-center">
                              {ins.unidad}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-800 px-2 py-1 text-right">
                              {fmtNum(ins.rendimiento, 3)}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-800 px-2 py-1 text-right">
                              {fmtNum(cant, 3)}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-800 px-2 py-1 text-right">
                              Gs {fmtGs(ins.precioUnitario)}
                            </td>
                            <td className="border-b border-slate-100 dark:border-slate-800 px-2 py-1 text-right font-medium">
                              Gs {fmtGs(total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Grand totals */}
          <div className="grand-total mt-5 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden text-xs">
            <div className="flex justify-between px-4 py-2 bg-blue-50 dark:bg-blue-950/30">
              <span className="text-slate-600 dark:text-slate-400">
                Subtotal Materiales
              </span>
              <span className="font-semibold dark:text-slate-200">
                Gs {fmtGs(totalMat)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2 bg-amber-50 dark:bg-amber-950/20">
              <span className="text-slate-600 dark:text-slate-400">
                Subtotal Mano de Obra
              </span>
              <span className="font-semibold dark:text-slate-200">
                Gs {fmtGs(totalMO)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm">
              <span>TOTAL GENERAL</span>
              <span>Gs {fmtGs(totalGeneral)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ConsolidadoItem {
  nombre: string;
  unidad: string;
  cantidadTotal: number;
  total: number;
  esManodeObra: boolean;
  rubrosCount: number;
}

function ConsolidadoTable({ rubros }: { rubros: RubroProyecto[] }) {
  const mapa = new Map<string, ConsolidadoItem>();
  rubros.forEach((r) => {
    r.insumos.forEach((ins) => {
      const key = `${ins.nombre.toLowerCase().trim()}||${ins.unidad}`;
      const cant = calcCantidadReal(
        r.cantidadObra,
        ins.rendimiento,
        ins.porcPerdida,
      );
      const total = calcTotalInsumo(r.cantidadObra, ins);
      if (mapa.has(key)) {
        const prev = mapa.get(key)!;
        prev.cantidadTotal += cant;
        prev.total += total;
        prev.rubrosCount += 1;
      } else {
        mapa.set(key, {
          nombre: ins.nombre,
          unidad: ins.unidad,
          cantidadTotal: cant,
          total,
          esManodeObra: ins.esManodeObra,
          rubrosCount: 1,
        });
      }
    });
  });
  const items = Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  const materiales = items.filter((i) => !i.esManodeObra);
  const mo = items.filter((i) => i.esManodeObra);
  const totalMat = materiales.reduce((acc, i) => acc + i.total, 0);
  const totalMO = mo.reduce((acc, i) => acc + i.total, 0);

  const renderTable = (
    rows: ConsolidadoItem[],
    color: "blue" | "amber",
    subtotal: number,
    label: string,
  ) => (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr
          className={
            color === "blue"
              ? "bg-blue-50 dark:bg-blue-950/30"
              : "bg-amber-50 dark:bg-amber-950/20"
          }
        >
          <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-left">
            Insumo
          </th>
          <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-center w-16">
            Unidad
          </th>
          <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right w-24">
            Cantidad Total
          </th>
          <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-center w-16">
            Rubros
          </th>
          <th className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right w-28">
            Total (Gs)
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, i) => (
          <tr
            key={i}
            className={
              i % 2 !== 0 ? "dark:bg-slate-900/20 bg-slate-50 even-row" : ""
            }
          >
            <td className="border border-slate-200 dark:border-slate-700 px-2 py-1">
              {item.nombre}
            </td>
            <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-center">
              {item.unidad}
            </td>
            <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right">
              {fmtNum(item.cantidadTotal, 3)}
            </td>
            <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-center">
              {item.rubrosCount}
            </td>
            <td className="border border-slate-200 dark:border-slate-700 px-2 py-1 text-right font-semibold">
              Gs {fmtGs(item.total)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr
          className={
            color === "blue"
              ? "bg-blue-100 dark:bg-blue-900/30"
              : "bg-amber-100 dark:bg-amber-900/30"
          }
        >
          <td
            colSpan={4}
            className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 font-bold text-right"
          >
            Subtotal {label}
          </td>
          <td className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 font-bold text-right">
            Gs {fmtGs(subtotal)}
          </td>
        </tr>
      </tfoot>
    </table>
  );

  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
        Consolidado de Insumos
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 italic">
          Sin insumos para consolidar.
        </p>
      ) : (
        <div className="space-y-5">
          {materiales.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package size={12} className="text-blue-500" />
                <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Materiales
                </h3>
              </div>
              {renderTable(materiales, "blue", totalMat, "Materiales")}
            </div>
          )}
          {mo.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HardHat size={12} className="text-amber-500" />
                <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Mano de Obra
                </h3>
              </div>
              {renderTable(mo, "amber", totalMO, "Mano de Obra")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Config field helper
// ─────────────────────────────────────────────────────────────

const EMPRESA_FIELDS: {
  key: keyof Omit<EmpresaConfig, "logoUrl">;
  label: string;
  placeholder: string;
}[] = [
  { key: "nombre", label: "Nombre de la empresa", placeholder: "TEKOINNOVA" },
  {
    key: "slogan",
    label: "Eslogan",
    placeholder: "Soluciones de Arquitectura...",
  },
  {
    key: "direccion",
    label: "Dirección",
    placeholder: "Asunción, Paraguay",
  },
  {
    key: "email",
    label: "Correo electrónico",
    placeholder: "contacto@empresa.com",
  },
  {
    key: "telefono",
    label: "Teléfono",
    placeholder: "+595 21 000 000",
  },
  { key: "web", label: "Sitio web", placeholder: "www.empresa.com" },
];

// ─────────────────────────────────────────────────────────────
// Copyright footer (screen + print)
// ─────────────────────────────────────────────────────────────

function CopyrightFooter() {
  const year = new Date().getFullYear();
  return (
    <div className="copyright-footer mt-12 pt-4 border-t border-slate-200 dark:border-slate-700 text-center text-[10px] text-slate-400">
      &copy; {year} TekoInnova &mdash; Todos los derechos reservados &mdash;{" "}
      <span className="font-semibold">www.tekoinnova.com</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cronograma report tab (screen view + print buttons)
// ─────────────────────────────────────────────────────────────

function CronogramaReporteTab({
  rubros,
  empresa,
  proyecto,
  today,
  montoRecibidoCliente = 0,
  onMontoChange,
}: {
  rubros: RubroCronograma[];
  empresa: EmpresaConfig;
  proyecto?: ProyectoReporte;
  today: string;
  montoRecibidoCliente?: number;
  onMontoChange?: (v: number) => void;
}) {
  function addDays(dateStr: string, days: number) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function dayOff(base: string, target: string) {
    return Math.round(
      (new Date(target + "T00:00:00").getTime() - new Date(base + "T00:00:00").getTime()) / 86400000,
    );
  }

  const starts = rubros.map((r) => r.fechaInicio).sort();
  const projectStart = starts[0] ?? today;
  const ends = rubros.map((r) => addDays(r.fechaInicio, r.duracion)).sort();
  const projectEnd = ends[ends.length - 1] ?? projectStart;
  const totalDays = Math.max(dayOff(projectStart, projectEnd), 1);
  const totalCost = rubros.reduce((s, r) => s + r.total, 0);
  const totalCertificado = rubros.reduce((s, r) => s + r.total * (r.avanceReal / 100), 0);
  const fmtG = (n: number) => "Gs " + new Intl.NumberFormat("es-PY").format(Math.round(n));

  const BAR_COLORS = [
    "bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500",
  ];

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.02] bg-white p-8 shadow-sm">
      {/* Header */}
      <EmpresaHeaderDisplay cfg={empresa} />
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold dark:text-slate-100 text-slate-900 uppercase tracking-wide">
          Cronograma de Avance de Obra
        </h1>
        {proyecto && (
          <p className="text-sm text-slate-500 mt-1">
            {proyecto.codigo} — {proyecto.nombre}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">Fecha de emisión: {today}</p>
      </div>

      {rubros.length === 0 ? (
        <div className="py-16 text-center">
          <Calendar size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
          <p className="text-sm dark:text-slate-400 text-slate-500 italic">
            No hay tareas en el cronograma todavía. Agregá actividades desde el módulo Cronograma.
          </p>
        </div>
      ) : (
        <>
          {/* Gantt visual */}
          <div className="mb-2 text-xs font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
            Diagrama de Gantt
          </div>
          <div className="mb-1 flex items-center gap-4 text-[10px] dark:text-slate-500 text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-3 rounded bg-blue-400 opacity-60" /> Planificado
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-3 rounded bg-emerald-400" /> Avance real
            </span>
          </div>
          <div className="space-y-2 mb-6">
            {rubros.map((r, i) => {
              const start = dayOff(projectStart, r.fechaInicio);
              const leftPct = (start / totalDays) * 100;
              const widthPct = (r.duracion / totalDays) * 100;
              const realWidthPct = widthPct * (r.avanceReal / 100);
              const colorClass = BAR_COLORS[i % BAR_COLORS.length];
              return (
                <div key={r.id} className="flex items-center gap-3 text-xs">
                  <div className="w-36 shrink-0 truncate dark:text-slate-300 text-slate-700 text-right pr-2">
                    {r.nombre}
                  </div>
                  <div className="flex-1 h-5 dark:bg-slate-800 bg-slate-100 rounded-md relative border dark:border-white/[0.05] border-slate-200 overflow-hidden">
                    <div
                      className={`absolute top-0 h-full ${colorClass} opacity-30 rounded-md`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                    <div
                      className={`absolute top-1/4 h-1/2 ${colorClass} rounded-sm`}
                      style={{ left: `${leftPct}%`, width: `${realWidthPct}%` }}
                    />
                  </div>
                  <div className="w-10 text-right dark:text-emerald-400 text-emerald-600 font-semibold shrink-0">
                    {r.avanceReal}%
                  </div>
                  <div className="w-40 text-[10px] dark:text-slate-500 text-slate-400 shrink-0">
                    {r.fechaInicio} → {addDays(r.fechaInicio, r.duracion)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary table */}
          <div className="mb-2 text-xs font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
            Resumen de Avance y Desembolsos
          </div>
          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="dark:bg-slate-800 bg-slate-100">
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-left">Rubro</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-right">Presupuesto</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-center">Avance</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-right">Avance Gs</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-right">Desembolsado</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-center">Inicio</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-center">Fin planif.</th>
              </tr>
            </thead>
            <tbody>
              {rubros.map((r, i) => (
                <tr key={r.id} className={i % 2 ? "dark:bg-slate-900/20 bg-slate-50" : ""}>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1">{r.nombre}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-right">{fmtG(r.total)}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-center dark:text-emerald-400 text-emerald-600 font-semibold">{r.avanceReal}%</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-right">{fmtG(r.total * r.avanceReal / 100)}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-right">{r.desembolso ? fmtG(r.desembolso) : "—"}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-center">{r.fechaInicio}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-center">{addDays(r.fechaInicio, r.duracion)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="dark:bg-blue-950/30 bg-blue-50 font-bold">
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2">TOTAL</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">{fmtG(totalCost)}</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-center">
                  {totalCost > 0 ? ((totalCertificado / totalCost) * 100).toFixed(1) : "0"}%
                </td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">{fmtG(totalCertificado)}</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">
                  {fmtG(rubros.reduce((s, r) => s + (r.desembolso ?? 0), 0))}
                </td>
                <td colSpan={2} className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-center text-xs dark:text-slate-400 text-slate-500">
                  {projectStart} → {projectEnd}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Financial progress summary */}
          <div className="mt-6 mb-2 text-xs font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
            Seguimiento Financiero
          </div>
          {onMontoChange !== undefined && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg dark:bg-slate-800/40 bg-slate-50 border dark:border-white/[0.06] border-slate-200">
              <span className="text-xs dark:text-slate-400 text-slate-600 whitespace-nowrap">Monto recibido del cliente (Gs):</span>
              <input
                type="number"
                min={0}
                value={montoRecibidoCliente}
                onChange={(e) => onMontoChange(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800 bg-white dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                placeholder="Ingresá el monto recibido..."
              />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: "Presupuesto Total", value: fmtG(totalCost), accent: false },
              { label: "Total Certificado", value: `${fmtG(totalCertificado)} (${totalCost > 0 ? ((totalCertificado / totalCost) * 100).toFixed(1) : "0"}%)`, accent: false },
              { label: "Total Desembolsado", value: fmtG(rubros.reduce((s, r) => s + (r.desembolso ?? 0), 0)), accent: false },
              { label: "Monto Recibido del Cliente", value: fmtG(montoRecibidoCliente), accent: true },
              { label: "% Ejecución Financiera", value: `${totalCost > 0 ? ((montoRecibidoCliente / totalCost) * 100).toFixed(1) : "0"}%`, accent: true },
              { label: "Saldo Disponible (Rec.−Cert.)", value: fmtG(montoRecibidoCliente - totalCertificado), accent: false },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border dark:border-white/[0.06] border-slate-200 dark:bg-slate-800/40 bg-slate-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide dark:text-slate-500 text-slate-400 mb-0.5">{item.label}</div>
                <div className={`text-sm font-semibold font-mono ${item.accent ? "dark:text-teal-400 text-teal-600" : "dark:text-slate-200 text-slate-800"}`}>{item.value}</div>
              </div>
            ))}
          </div>

          <CopyrightFooter />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Personal report tab
// ─────────────────────────────────────────────────────────────

function PersonalReporteTab({
  contratos,
  empresa,
  proyecto,
  today,
}: {
  contratos: PersonalContrato[];
  empresa: EmpresaConfig;
  proyecto?: ProyectoReporte;
  today: string;
}) {
  const totPactado = contratos.reduce((s, c) => s + c.montoPactado, 0);
  const totPagado = contratos.reduce((s, c) => s + c.totalPagado, 0);
  const totPendiente = contratos.reduce((s, c) => s + Math.max(0, c.montoPactado - c.totalPagado), 0);
  const fmtG = (n: number) => "Gs " + new Intl.NumberFormat("es-PY").format(Math.round(n));

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.02] bg-white p-8 shadow-sm" id="report-personal">
      <EmpresaHeaderDisplay cfg={empresa} />
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold dark:text-slate-100 text-slate-900 uppercase tracking-wide">
          Gestión de Personal — Mano de Obra
        </h1>
        {proyecto && (
          <p className="text-sm text-slate-500 mt-1">
            {proyecto.codigo} — {proyecto.nombre}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">Fecha de emisión: {today}</p>
      </div>

      {contratos.length === 0 ? (
        <div className="py-16 text-center">
          <HardHat size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
          <p className="text-sm dark:text-slate-400 text-slate-500 italic">
            No hay contratos de personal registrados. Agregá contratos desde el módulo Mano de Obra.
          </p>
        </div>
      ) : (
        <>
          {/* Totals summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Pactado", value: fmtG(totPactado), color: "blue" },
              { label: "Total Pagado", value: fmtG(totPagado), color: "emerald" },
              { label: "Saldo Pendiente", value: fmtG(totPendiente), color: "amber" },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl p-4 border text-center
                  ${item.color === "blue" ? "dark:bg-blue-950/30 bg-blue-50 dark:border-blue-800/30 border-blue-200" :
                    item.color === "emerald" ? "dark:bg-emerald-950/30 bg-emerald-50 dark:border-emerald-800/30 border-emerald-200" :
                    "dark:bg-amber-950/30 bg-amber-50 dark:border-amber-800/30 border-amber-200"}`}
              >
                <div className="text-xs dark:text-slate-400 text-slate-500 mb-1">{item.label}</div>
                <div className={`text-sm font-bold
                  ${item.color === "blue" ? "dark:text-blue-300 text-blue-700" :
                    item.color === "emerald" ? "dark:text-emerald-300 text-emerald-700" :
                    "dark:text-amber-300 text-amber-700"}`}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Contracts table */}
          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="dark:bg-slate-800 bg-slate-100">
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-left">Contrato / Trabajador</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-left">Rol</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-right">Pactado</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-right">Pagado</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-center">Retención</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-right">Saldo</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c, i) => {
                const saldo = Math.max(0, c.montoPactado - c.totalPagado);
                return (
                  <tr key={c.id} className={i % 2 ? "dark:bg-slate-900/20 bg-slate-50" : ""}>
                    <td className="border dark:border-slate-700 border-slate-200 px-2 py-1">{c.nombre}</td>
                    <td className="border dark:border-slate-700 border-slate-200 px-2 py-1">{c.rol}</td>
                    <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-right">{fmtG(c.montoPactado)}</td>
                    <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-right">{fmtG(c.totalPagado)}</td>
                    <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-center">{c.porcRetencion}%</td>
                    <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-right">{fmtG(saldo)}</td>
                    <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        c.estado === "ACTIVO"
                          ? "dark:bg-emerald-900/40 bg-emerald-100 dark:text-emerald-300 text-emerald-700"
                          : "dark:bg-slate-700 bg-slate-100 dark:text-slate-400 text-slate-500"
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="dark:bg-blue-950/30 bg-blue-50 font-bold">
                <td colSpan={2} className="border dark:border-slate-700 border-slate-200 px-2 py-2">TOTALES</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">{fmtG(totPactado)}</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">{fmtG(totPagado)}</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2"></td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">{fmtG(totPendiente)}</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2"></td>
              </tr>
            </tfoot>
          </table>
          <CopyrightFooter />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Logística report tab
// ─────────────────────────────────────────────────────────────

const TIPO_LOGISTICA_LABELS: Record<string, string> = {
  FLETE: "Flete",
  ALQUILER_MAQUINARIA: "Alq. Maquinaria",
  HONORARIOS_PROYECTO: "Honorarios",
  GASTO_ADMINISTRATIVO: "Gasto Adm.",
  SEGURO: "Seguro",
  OTRO: "Otro",
};

const TIPO_COLORS: Record<string, string> = {
  FLETE: "dark:bg-blue-950/30 bg-blue-50 dark:border-blue-800/30 border-blue-200 dark:text-blue-300 text-blue-700",
  ALQUILER_MAQUINARIA: "dark:bg-amber-950/30 bg-amber-50 dark:border-amber-800/30 border-amber-200 dark:text-amber-300 text-amber-700",
  HONORARIOS_PROYECTO: "dark:bg-violet-950/30 bg-violet-50 dark:border-violet-800/30 border-violet-200 dark:text-violet-300 text-violet-700",
  GASTO_ADMINISTRATIVO: "dark:bg-slate-800/50 bg-slate-100 dark:border-slate-700 border-slate-200 dark:text-slate-300 text-slate-600",
  SEGURO: "dark:bg-emerald-950/30 bg-emerald-50 dark:border-emerald-800/30 border-emerald-200 dark:text-emerald-300 text-emerald-700",
  OTRO: "dark:bg-rose-950/30 bg-rose-50 dark:border-rose-800/30 border-rose-200 dark:text-rose-300 text-rose-700",
};

function LogisticaReporteTab({
  costos,
  empresa,
  proyecto,
  today,
}: {
  costos: CostoLogistica[];
  empresa: EmpresaConfig;
  proyecto?: ProyectoReporte;
  today: string;
}) {
  const totalGeneral = costos.reduce((s, c) => s + c.monto, 0);
  const fmtG = (n: number) => "Gs " + new Intl.NumberFormat("es-PY").format(Math.round(n));

  // Group by tipo
  const byTipo = new Map<string, number>();
  costos.forEach((c) => byTipo.set(c.tipo, (byTipo.get(c.tipo) ?? 0) + c.monto));
  const tipoEntries = Array.from(byTipo.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.02] bg-white p-8 shadow-sm" id="report-logistica">
      <EmpresaHeaderDisplay cfg={empresa} />
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold dark:text-slate-100 text-slate-900 uppercase tracking-wide">
          Fletes, Maquinarias y Costos Indirectos
        </h1>
        {proyecto && (
          <p className="text-sm text-slate-500 mt-1">
            {proyecto.codigo} — {proyecto.nombre}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">Fecha de emisión: {today}</p>
      </div>

      {costos.length === 0 ? (
        <div className="py-16 text-center">
          <Truck size={32} className="mx-auto mb-3 dark:text-slate-600 text-slate-300" />
          <p className="text-sm dark:text-slate-400 text-slate-500 italic">
            No hay costos de logística registrados. Agregá costos desde el módulo Logística.
          </p>
        </div>
      ) : (
        <>
          {/* Summary by tipo */}
          <div className="mb-2 text-xs font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
            Distribución por Tipo
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {tipoEntries.map(([tipo, monto]) => (
              <div key={tipo} className={`rounded-xl p-3 border text-center ${TIPO_COLORS[tipo] ?? TIPO_COLORS.OTRO}`}>
                <div className="text-[10px] font-semibold mb-1">{TIPO_LOGISTICA_LABELS[tipo] ?? tipo}</div>
                <div className="text-sm font-bold">{fmtG(monto)}</div>
                <div className="text-[10px] opacity-70">
                  {totalGeneral > 0 ? ((monto / totalGeneral) * 100).toFixed(1) : "0"}%
                </div>
              </div>
            ))}
          </div>

          {/* Detail table */}
          <div className="mb-2 text-xs font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
            Detalle de Costos
          </div>
          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="dark:bg-slate-800 bg-slate-100">
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-left">Descripción</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-left w-28">Tipo</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-left">Proveedor</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-center w-24">Fecha</th>
                <th className="border dark:border-slate-700 border-slate-200 px-2 py-1.5 text-right w-32">Monto</th>
              </tr>
            </thead>
            <tbody>
              {costos.map((c, i) => (
                <tr key={c.id} className={i % 2 ? "dark:bg-slate-900/20 bg-slate-50" : ""}>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1">{c.descripcion}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-xs">{TIPO_LOGISTICA_LABELS[c.tipo] ?? c.tipo}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1">{c.proveedor ?? "—"}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-center">{c.fecha ?? "—"}</td>
                  <td className="border dark:border-slate-700 border-slate-200 px-2 py-1 text-right font-semibold">{fmtG(c.monto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="dark:bg-blue-950/30 bg-blue-50 font-bold">
                <td colSpan={4} className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">TOTAL GENERAL</td>
                <td className="border dark:border-slate-700 border-slate-200 px-2 py-2 text-right">{fmtG(totalGeneral)}</td>
              </tr>
            </tfoot>
          </table>
          <CopyrightFooter />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export default function ReportesClient({
  proyecto,
  backHref = "/",
  stickyTop = "top-0",
}: ReportesClientProps) {
  const proyectoId = proyecto?.id ?? "standalone";

  const [tab, setTab] = useState<Tab>("config");
  // Combine mutable fields into one state object so the load effect
  // calls setState only once, satisfying the React compiler.
  const [config, setConfig] = useState<{
    empresa: EmpresaConfig;
    montoContrato: number;
    rubros: RubroProyecto[];
    cronogramaRubros: RubroCronograma[];
    personalContratos: PersonalContrato[];
    logisticaCostos: CostoLogistica[];
    loaded: boolean;
  }>({
    empresa: DEFAULT_EMPRESA,
    montoContrato: 0,
    rubros: [],
    cronogramaRubros: [],
    personalContratos: [],
    logisticaCostos: [],
    loaded: false,
  });

  const { empresa, montoContrato, rubros, cronogramaRubros, personalContratos, logisticaCostos, loaded } = config;

  // Helper setters that merge into the combined state
  const setEmpresa = useCallback(
    (updater: EmpresaConfig | ((prev: EmpresaConfig) => EmpresaConfig)) =>
      setConfig((prev) => ({
        ...prev,
        empresa:
          typeof updater === "function" ? updater(prev.empresa) : updater,
      })),
    [],
  );

  const setMontoContrato = useCallback(
    (value: number) => setConfig((prev) => ({ ...prev, montoContrato: value })),
    [],
  );

  // Load all persisted data in a single setState call
  // Destructure empresa once so useEffect dependency is stable
  const proyectoEmpresa = proyecto?.empresa;
  useEffect(() => {
    // Build empresa default: prefer Prisma data over DEFAULT_EMPRESA
    const empresaBase: EmpresaConfig = proyectoEmpresa
      ? {
          nombre:    proyectoEmpresa.nombre    ?? DEFAULT_EMPRESA.nombre,
          slogan:    proyectoEmpresa.titulo     ?? DEFAULT_EMPRESA.slogan,
          direccion: proyectoEmpresa.direccion  ?? DEFAULT_EMPRESA.direccion,
          email:     proyectoEmpresa.email      ?? DEFAULT_EMPRESA.email,
          telefono:  proyectoEmpresa.telefono   ?? DEFAULT_EMPRESA.telefono,
          web:       proyectoEmpresa.web        ?? DEFAULT_EMPRESA.web,
          logoUrl:   proyectoEmpresa.logoUrl    ?? DEFAULT_EMPRESA.logoUrl,
        }
      : { ...DEFAULT_EMPRESA };

    let newEmpresa: EmpresaConfig = empresaBase;
    let newMonto = 0;
    let newRubros: RubroProyecto[] = [];
    let newCronograma: RubroCronograma[] = [];
    let newPersonal: PersonalContrato[] = [];
    let newLogistica: CostoLogistica[] = [];

    const rawEmpresa = localStorage.getItem(`reportes_empresa_${proyectoId}`);
    if (rawEmpresa) try { newEmpresa = JSON.parse(rawEmpresa); } catch { /* noop */ }

    const rawMonto = localStorage.getItem(`reportes_monto_${proyectoId}`);
    if (rawMonto) newMonto = Number(rawMonto);

    const rawRubros = localStorage.getItem(`presupuesto_${proyectoId}`);
    if (rawRubros) try { newRubros = JSON.parse(rawRubros); } catch { /* noop */ }

    const rawCronograma = localStorage.getItem(`cronograma_${proyectoId}`);
    if (rawCronograma) try { newCronograma = JSON.parse(rawCronograma); } catch { /* noop */ }

    const rawPersonal = localStorage.getItem(`personal_${proyectoId}`);
    if (rawPersonal) try { newPersonal = JSON.parse(rawPersonal); } catch { /* noop */ }

    const rawLogistica = localStorage.getItem(`logistica_${proyectoId}`);
    if (rawLogistica) try { newLogistica = JSON.parse(rawLogistica); } catch { /* noop */ }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig({
      empresa: newEmpresa,
      montoContrato: newMonto,
      rubros: newRubros,
      cronogramaRubros: newCronograma,
      personalContratos: newPersonal,
      logisticaCostos: newLogistica,
      loaded: true,
    });
  }, [proyectoId, proyectoEmpresa]);

  // Persist empresa config when it changes
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      `reportes_empresa_${proyectoId}`,
      JSON.stringify(empresa),
    );
  }, [empresa, loaded, proyectoId]);

  // Persist monto contrato when it changes
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(`reportes_monto_${proyectoId}`, String(montoContrato));
  }, [montoContrato, loaded, proyectoId]);

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        setEmpresa((prev) => ({
          ...prev,
          logoUrl: (evt.target?.result as string) ?? "",
        }));
      };
      reader.readAsDataURL(file);
    },
    [setEmpresa],
  );

  const handleExportCSV = useCallback(() => {
    const modo = tab === "profesional" ? "profesional" : "cliente";
    const filename = `presupuesto_${modo}_${proyecto?.codigo ?? "reporte"}.csv`;
    exportCSV(rubros, modo, filename);
  }, [tab, rubros, proyecto?.codigo]);

  const handlePrint = useCallback(() => {
    const pNombre = proyecto?.nombre ?? "Proyecto";
    const pCodigo = proyecto?.codigo ?? "";
    const empresaBase = { nombre: empresa.nombre, slogan: empresa.slogan, logoUrl: empresa.logoUrl };

    if (tab === "cliente") {
      printReport("report-cliente", `Presupuesto de Obra — ${pNombre}`);
    } else if (tab === "profesional") {
      printReport("report-profesional", `Análisis de Precios Unitarios — ${pNombre}`);
    } else if (tab === "cronograma") {
      // shows sub-buttons, handled separately — this is the fallback for "profesional" cronograma
      printGantt(cronogramaRubros, empresaBase, pNombre, pCodigo, "profesional", montoContrato);
    } else if (tab === "personal") {
      printPersonal(personalContratos, empresaBase, pNombre, pCodigo);
    } else if (tab === "logistica") {
      printLogistica(logisticaCostos, empresaBase, pNombre, pCodigo);
    }
  }, [tab, empresa, proyecto, cronogramaRubros, personalContratos, logisticaCostos]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "config", label: "Configuración", icon: Settings },
    { key: "cliente", label: "Vista Cliente", icon: User },
    { key: "profesional", label: "Vista Profesional", icon: HardHat },
    { key: "cronograma", label: "Cronograma", icon: Calendar },
    { key: "personal", label: "Personal", icon: BarChart2 },
    { key: "logistica", label: "Logística", icon: Truck },
  ];

  const today = new Date().toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50">
      {/* ── Sticky header ───────────────────────────────────── */}
      <div
        className={`sticky ${stickyTop} z-30 dark:bg-slate-950/95 bg-white/95 backdrop-blur border-b dark:border-white/[0.06] border-slate-200`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top row */}
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link
                href={backHref}
                className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft
                  size={16}
                  className="dark:text-slate-400 text-slate-500"
                />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <FileDown size={15} className="text-blue-500" />
                  <span className="text-sm font-semibold dark:text-slate-100 text-slate-800">
                    Exportación y Reportes
                  </span>
                </div>
                {proyecto && (
                  <div className="text-xs text-slate-400">
                    {proyecto.codigo} — {proyecto.nombre}
                  </div>
                )}
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2">
              {(tab === "cliente" || tab === "profesional") && (
                <button
                  onClick={handleExportCSV}
                  disabled={rubros.length === 0}
                  title={rubros.length === 0 ? "Agrega rubros en el módulo de Presupuesto" : "Descargar CSV"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Download size={13} />
                  CSV
                </button>
              )}
              {tab === "cronograma" && (
                <>
                  <button
                    onClick={() => printGantt(cronogramaRubros, { nombre: empresa.nombre, slogan: empresa.slogan, logoUrl: empresa.logoUrl }, proyecto?.nombre ?? "", proyecto?.codigo ?? "", "cliente")}
                    disabled={cronogramaRubros.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    <Printer size={13} />
                    Impr. Cliente
                  </button>
                  <button
                    onClick={() => printGantt(cronogramaRubros, { nombre: empresa.nombre, slogan: empresa.slogan, logoUrl: empresa.logoUrl }, proyecto?.nombre ?? "", proyecto?.codigo ?? "", "profesional", montoContrato)}
                    disabled={cronogramaRubros.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    <Printer size={13} />
                    Impr. Profesional
                  </button>
                </>
              )}
              {(tab === "personal" || tab === "logistica") && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <Printer size={13} />
                  Imprimir / PDF
                </button>
              )}
              {(tab === "cliente" || tab === "profesional") && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Printer size={13} />
                  PDF / Imprimir
                </button>
              )}
            </div>
          </div>

          {/* Tabs row */}
          <div className="flex gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-blue-500 text-blue-500"
                      : "border-transparent dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-700"
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Tab: Configuración ────────────────────────────── */}
        {tab === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Empresa branding card */}
            <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Building2 size={15} className="text-blue-500" />
                <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                  Encabezado de Empresa
                </h2>
              </div>

              {/* Logo upload */}
              <div className="mb-5">
                <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-2">
                  Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-xl border-2 border-dashed dark:border-slate-700 border-slate-300 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0">
                    {empresa.logoUrl ? (
                      <Image
                        src={empresa.logoUrl}
                        alt="Logo"
                        fill
                        unoptimized
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <div className="text-slate-300 dark:text-slate-600 text-[10px] text-center px-1 leading-tight">
                        sin logo
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-300 text-slate-600 transition-colors">
                      <Upload size={12} />
                      Subir imagen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {empresa.logoUrl && (
                      <button
                        onClick={() =>
                          setEmpresa((prev) => ({ ...prev, logoUrl: "" }))
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors text-left"
                      >
                        Quitar logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Branding fields */}
              {EMPRESA_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="mb-3">
                  <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={empresa[key]}
                    onChange={(e) =>
                      setEmpresa((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white dark:text-slate-100 text-slate-800 dark:placeholder:text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              ))}
            </div>

            {/* Right column: params + preview */}
            <div className="space-y-5">
              {/* Report parameters */}
              <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={15} className="text-emerald-500" />
                  <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                    Parámetros del Reporte
                  </h2>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">
                    Monto del Contrato (Gs)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={montoContrato || ""}
                    onChange={(e) =>
                      setMontoContrato(Math.max(0, Number(e.target.value)))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-sm border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white dark:text-slate-100 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Se mostrará el margen o déficit frente al presupuesto
                    calculado.
                  </p>
                </div>
                <div
                  className={`text-xs px-3 py-2 rounded-lg ${
                    rubros.length === 0
                      ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {rubros.length === 0
                    ? "⚠ No hay rubros cargados. Ve al módulo de Presupuesto para agregarlos."
                    : `✓ ${rubros.length} rubro${rubros.length !== 1 ? "s" : ""} cargados desde el Presupuesto.`}
                </div>
              </div>

              {/* Live header preview */}
              <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={15} className="text-purple-500" />
                  <h2 className="text-sm font-semibold dark:text-slate-200 text-slate-700">
                    Vista Previa del Encabezado
                  </h2>
                </div>
                <div className="rounded-xl border dark:border-slate-700 border-slate-200 p-4 dark:bg-slate-900 bg-slate-50">
                  <EmpresaHeaderDisplay cfg={empresa} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Vista Cliente ─────────────────────────────── */}
        {tab === "cliente" && (
          <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.02] bg-white p-8 shadow-sm">
            <div id="report-cliente">
              <EmpresaHeaderDisplay cfg={empresa} />
              <div className="report-title text-center mb-8">
                <h1 className="text-xl font-bold dark:text-slate-100 text-slate-900 uppercase tracking-wide">
                  Presupuesto de Obra
                </h1>
                {proyecto && (
                  <p className="text-sm text-slate-500 mt-1">
                    {proyecto.codigo} — {proyecto.nombre}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Fecha de emisión: {today}
                </p>
              </div>
              <FichaSection proyecto={proyecto} />
              <PresupuestoClienteTable
                rubros={rubros}
                montoContrato={montoContrato}
              />
              <CopyrightFooter />
            </div>
          </div>
        )}

        {/* ── Tab: Vista Profesional ────────────────────────── */}
        {tab === "profesional" && (
          <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.02] bg-white p-8 shadow-sm">
            <div id="report-profesional">
              <EmpresaHeaderDisplay cfg={empresa} />
              <div className="report-title text-center mb-8">
                <h1 className="text-xl font-bold dark:text-slate-100 text-slate-900 uppercase tracking-wide">
                  Análisis de Precios Unitarios
                </h1>
                {proyecto && (
                  <p className="text-sm text-slate-500 mt-1">
                    {proyecto.codigo} — {proyecto.nombre}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Fecha de emisión: {today}
                </p>
              </div>
              <FichaSection proyecto={proyecto} />
              <PresupuestoProfesionalTable rubros={rubros} />
              <div className="section-break border-t-2 border-slate-200 dark:border-slate-700 mt-8 pt-8">
                <ConsolidadoTable rubros={rubros} />
              </div>
              <CopyrightFooter />
            </div>
          </div>
        )}

        {/* ── Tab: Cronograma ───────────────────────────────── */}
        {tab === "cronograma" && (
          <CronogramaReporteTab
            rubros={cronogramaRubros}
            empresa={empresa}
            proyecto={proyecto}
            today={today}
            montoRecibidoCliente={montoContrato}
            onMontoChange={setMontoContrato}
          />
        )}

        {/* ── Tab: Personal ─────────────────────────────────── */}
        {tab === "personal" && (
          <PersonalReporteTab
            contratos={personalContratos}
            empresa={empresa}
            proyecto={proyecto}
            today={today}
          />
        )}

        {/* ── Tab: Logística ────────────────────────────────── */}
        {tab === "logistica" && (
          <LogisticaReporteTab
            costos={logisticaCostos}
            empresa={empresa}
            proyecto={proyecto}
            today={today}
          />
        )}
      </div>
    </div>
  );
}
