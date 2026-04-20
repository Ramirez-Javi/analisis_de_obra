import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AccionAudit } from "@prisma/client";

const PAGE_SIZE = 50;

const ACCION_LABELS: Record<AccionAudit, string> = {
  USUARIO_REGISTRO:          "Registro de usuario",
  USUARIO_CREADO:            "Usuario creado",
  USUARIO_ACTIVADO:          "Usuario activado",
  USUARIO_DESACTIVADO:       "Usuario desactivado",
  USUARIO_ELIMINADO:         "Usuario eliminado",
  USUARIO_PASSWORD_CAMBIADO: "Contraseña cambiada",
  USUARIO_2FA_HABILITADO:    "2FA habilitado",
  USUARIO_2FA_DESHABILITADO: "2FA deshabilitado",
  PROYECTO_CREADO:           "Proyecto creado",
  PROYECTO_EDITADO:          "Proyecto editado",
  PROYECTO_ELIMINADO:        "Proyecto eliminado",
  PROYECTO_ARCHIVADO:        "Proyecto archivado",
  PROYECTO_RESTAURADO:       "Proyecto restaurado",
  PROYECTO_ELIMINADO_PERMANENTE: "Proyecto eliminado permanentemente",
  MOVIMIENTO_CREADO:         "Movimiento financiero creado",
  MOVIMIENTO_ELIMINADO:      "Movimiento financiero eliminado",
  BACKUP_DESCARGADO:         "Backup descargado",
};

const ACCION_COLOR: Partial<Record<AccionAudit, string>> = {
  USUARIO_ELIMINADO:        "text-red-500",
  PROYECTO_ELIMINADO:       "text-red-500",
  MOVIMIENTO_ELIMINADO:     "text-red-500",
  USUARIO_DESACTIVADO:      "text-amber-500",
  USUARIO_2FA_DESHABILITADO:"text-amber-500",
  USUARIO_CREADO:           "text-emerald-400",
  PROYECTO_CREADO:          "text-emerald-400",
  MOVIMIENTO_CREADO:        "text-emerald-400",
  USUARIO_REGISTRO:         "text-sky-400",
  USUARIO_2FA_HABILITADO:   "text-sky-400",
};

interface PageProps {
  searchParams: Promise<{ page?: string; accion?: string }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") redirect("/sin-acceso");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const accionFilter = params.accion as AccionAudit | undefined;

  const where = accionFilter ? { accion: accionFilter } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium dark:text-slate-400 text-slate-500 dark:hover:text-teal-400 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Centro de Mando
          </Link>
          <div className="w-px h-4 dark:bg-white/10 bg-slate-200" />
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="dark:text-amber-400 text-amber-600" />
            <div className="leading-none">
              <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">Registro de Auditoría</p>
              <p className="text-[11px] dark:text-slate-500 text-slate-400">Historial inmutable de acciones críticas</p>
            </div>
          </div>
          <span className="ml-auto text-xs dark:text-slate-500 text-slate-400">{total} registros</span>
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
        <a
          href="/admin/audit"
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            !accionFilter
              ? "dark:bg-teal-500/20 bg-teal-600 dark:text-teal-300 text-white dark:border-teal-500/40 border-teal-600"
              : "dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-500 dark:hover:border-slate-500 hover:border-slate-400"
          }`}
        >
          Todas
        </a>
        {(Object.keys(ACCION_LABELS) as AccionAudit[]).map((a) => (
          <a
            key={a}
            href={`/admin/audit?accion=${a}`}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              accionFilter === a
                ? "dark:bg-teal-500/20 bg-teal-600 dark:text-teal-300 text-white dark:border-teal-500/40 border-teal-600"
                : "dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-500 dark:hover:border-slate-500 hover:border-slate-400"
            }`}
          >
            {ACCION_LABELS[a]}
          </a>
        ))}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border dark:border-slate-800 border-slate-200">
          <table className="w-full text-sm">
            <thead className="dark:bg-slate-900 bg-slate-50 dark:text-slate-400 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Fecha/Hora</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Entidad</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="dark:divide-y dark:divide-slate-800 divide-y divide-slate-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center dark:text-slate-500 text-slate-400">
                    No hay registros de auditoría.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="dark:hover:bg-slate-900/50 hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 dark:text-slate-400 text-slate-500 whitespace-nowrap font-mono text-xs">
                    {log.timestamp.toLocaleString("es-PY", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </td>
                  <td className={`px-4 py-3 font-medium whitespace-nowrap ${ACCION_COLOR[log.accion] ?? "dark:text-slate-300 text-slate-700"}`}>
                    {ACCION_LABELS[log.accion]}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-300 text-slate-700">
                    <span className="font-medium">{log.entidad}</span>
                    {log.entidadId && (
                      <span className="block text-xs dark:text-slate-600 text-slate-400 font-mono">
                        {log.entidadId.slice(0, 12)}…
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-300 text-slate-700">
                    {log.userEmail ?? (
                      <span className="dark:text-slate-600 text-slate-400 italic">anónimo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-500 text-slate-400 font-mono text-xs whitespace-nowrap">
                    {log.ip ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {log.exito ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                        OK
                      </span>
                    ) : (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-900/50 text-red-400 border border-red-800"
                        title={log.error ?? ""}
                      >
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <a
                href={`/admin/audit?page=${page - 1}${accionFilter ? `&accion=${accionFilter}` : ""}`}
                className="px-4 py-2 rounded-lg border dark:border-slate-700 border-slate-300 text-sm dark:text-slate-400 text-slate-500 dark:hover:border-slate-500 hover:border-slate-400 transition-colors"
              >
                ← Anterior
              </a>
            )}
            <span className="text-sm dark:text-slate-500 text-slate-400">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/admin/audit?page=${page + 1}${accionFilter ? `&accion=${accionFilter}` : ""}`}
                className="px-4 py-2 rounded-lg border dark:border-slate-700 border-slate-300 text-sm dark:text-slate-400 text-slate-500 dark:hover:border-slate-500 hover:border-slate-400 transition-colors"
              >
                Siguiente →
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
