import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// ─── Helpers de formato ──────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDecimal(v: unknown): string {
  if (v === null || v === undefined) return "0";
  return Number(v).toFixed(2);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET() {
  // 1. Auth — solo ADMIN
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; empresaId?: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const empresaId = user.empresaId;
  if (!empresaId) {
    return NextResponse.json({ error: "Sin empresa asociada" }, { status: 403 });
  }

  // 2. Cargar todos los proyectos activos con sus relaciones
  const proyectos = await prisma.proyecto.findMany({
    where: { empresaId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      propietarios: true,
      equipoTecnico: true,
      rubrosProyecto: {
        include: {
          rubroMaestro: {
            include: { unidadMedida: true },
          },
          insumos: {
            include: { unidadMedida: true },
          },
        },
      },
      cronograma: true,
      movimientosFinancieros: {
        orderBy: { fecha: "asc" },
      },
    },
  });

  // 3. Construir ZIP
  const zip = new JSZip();

  // ── Resumen general de proyectos ──────────────────────────────────────────
  const resumenRows = proyectos.map((p) => {
    const totalPresupuesto = p.rubrosProyecto.reduce((acc, r) => {
      const costoRubro = r.insumos.reduce((s, ins) => {
        const cantConPerdida = ins.cantidad * r.cantidad * (1 + ins.porcPerdida / 100);
        return s + cantConPerdida * Number(ins.precioUnitario);
      }, 0);
      const factor = 1 + r.porcImprevistos / 100 + r.porcGanancia / 100;
      return acc + costoRubro * factor;
    }, 0);

    const totalIngresos = p.movimientosFinancieros
      .filter((m) => m.tipo.startsWith("INGRESO"))
      .reduce((s, m) => s + Number(m.monto), 0);

    const totalEgresos = p.movimientosFinancieros
      .filter((m) => m.tipo.startsWith("EGRESO"))
      .reduce((s, m) => s + Number(m.monto), 0);

    return {
      Código: p.codigo,
      Nombre: p.nombre,
      Estado: p.estado,
      Ubicación: p.ubicacion ?? "",
      "Fecha Inicio": fmtDate(p.fechaInicio),
      "Fecha Fin Estimada": fmtDate(p.fechaFinEstimada),
      "Propietario Principal": p.propietarios[0]?.nombre ?? "",
      "Presupuesto Total (Gs)": fmtDecimal(totalPresupuesto),
      "Total Ingresos (Gs)": fmtDecimal(totalIngresos),
      "Total Egresos (Gs)": fmtDecimal(totalEgresos),
      "Saldo (Gs)": fmtDecimal(totalIngresos - totalEgresos),
      "Creado el": fmtDate(p.createdAt),
    };
  });

  zip.file("resumen-proyectos.csv", buildCsv(resumenRows));

  // ── Archivos por proyecto ─────────────────────────────────────────────────
  for (const p of proyectos) {
    const folderName = `${sanitizeFilename(p.codigo)} — ${sanitizeFilename(p.nombre)}`;
    const folder = zip.folder(folderName)!;

    // 3a. presupuesto-rubros.csv
    const rubrosRows: Record<string, unknown>[] = [];
    for (const r of p.rubrosProyecto) {
      const unidad = r.rubroMaestro.unidadMedida?.nombre ?? "";
      const costoRubro = r.insumos.reduce((s, ins) => {
        const cantConPerdida = ins.cantidad * r.cantidad * (1 + ins.porcPerdida / 100);
        return s + cantConPerdida * Number(ins.precioUnitario);
      }, 0);
      const factor = 1 + r.porcImprevistos / 100 + r.porcGanancia / 100;
      const totalFinal = costoRubro * factor;

      rubrosRows.push({
        Orden: r.orden,
        Nombre: r.rubroMaestro.nombre,
        Unidad: unidad,
        Cantidad: r.cantidad,
        "Costo Directo (Gs)": fmtDecimal(costoRubro),
        "% Imprevistos": r.porcImprevistos,
        "% Ganancia": r.porcGanancia,
        "Total (Gs)": fmtDecimal(totalFinal),
      });

      // Detalle de insumos del rubro
      for (const ins of r.insumos) {
        const cantConPerdida = ins.cantidad * r.cantidad * (1 + ins.porcPerdida / 100);
        rubrosRows.push({
          Orden: `  └ ${ins.esManodeObra ? "[MO]" : "[MAT]"} ${ins.nombre}`,
          Unidad: ins.unidadMedida?.nombre ?? "",
          Cantidad: fmtDecimal(cantConPerdida),
          "Costo Directo (Gs)": fmtDecimal(cantConPerdida * Number(ins.precioUnitario)),
          "% Imprevistos": "",
          "% Ganancia": "",
          "Total (Gs)": "",
        });
      }
    }
    folder.file("presupuesto-rubros.csv", buildCsv(rubrosRows));

    // 3b. financiero-movimientos.csv
    const finRows = p.movimientosFinancieros.map((m) => ({
      Fecha: fmtDate(m.fecha),
      Tipo: m.tipo,
      Concepto: m.concepto,
      Beneficiario: m.beneficiario,
      "Monto (Gs)": fmtDecimal(m.monto),
      "Método de Pago": m.metodoPago,
      "N° Comprobante": m.nroComprobante ?? "",
      Observación: m.observacion ?? "",
    }));
    folder.file("financiero-movimientos.csv", buildCsv(finRows));

    // 3c. cronograma-tareas.csv
    const cronRows = p.cronograma.map((t) => {
      const rubroNombre =
        p.rubrosProyecto.find((r) => r.id === t.rubroProyectoId)?.rubroMaestro?.nombre ?? "";
      return {
        Tarea: t.nombre,
        Rubro: rubroNombre,
        "Día Inicio": t.diaInicio,
        "Duración (días)": t.duracionDias,
        "Día Fin": t.diaInicio + t.duracionDias - 1,
      };
    });
    folder.file("cronograma-tareas.csv", buildCsv(cronRows));

    // 3d. equipo-tecnico.csv
    const equipoRows = p.equipoTecnico.map((e) => ({
      Nombre: `${e.nombre} ${e.apellido}`,
      Rol: e.rol,
      Título: e.titulo ?? "",
      Email: e.email ?? "",
      Teléfono: e.telefono ?? "",
      Matrícula: e.matricula ?? "",
    }));
    folder.file("equipo-tecnico.csv", buildCsv(equipoRows));
  }

  // 4. Generar buffer y responder
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `tekoga-export-${fecha}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipBuffer.byteLength),
    },
  });
}
