import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
  MOVIMIENTO_CREADO:         "Movimiento financiero creado",
  MOVIMIENTO_ELIMINADO:      "Movimiento financiero eliminado",
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
    <main className="p-6 space-y-6 min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro de Auditoría</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Historial inmutable de acciones críticas del sistema
          </p>
        </div>
        <span className="text-xs text-zinc-500">{total} registros totales</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/admin/audit"
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            !accionFilter
              ? "bg-white text-black border-white"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
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
                ? "bg-white text-black border-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {ACCION_LABELS[a]}
          </a>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Fecha/Hora</th>
              <th className="px-4 py-3 text-left">Acción</th>
              <th className="px-4 py-3 text-left">Entidad</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">IP</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No hay registros de auditoría.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-4 py-3 text-zinc-400 whitespace-nowrap font-mono text-xs">
                  {log.timestamp.toLocaleString("es-PY", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </td>
                <td className={`px-4 py-3 font-medium whitespace-nowrap ${ACCION_COLOR[log.accion] ?? "text-zinc-300"}`}>
                  {ACCION_LABELS[log.accion]}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  <span className="font-medium">{log.entidad}</span>
                  {log.entidadId && (
                    <span className="block text-xs text-zinc-600 font-mono">
                      {log.entidadId.slice(0, 12)}…
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {log.userEmail ?? (
                    <span className="text-zinc-600 italic">anónimo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs whitespace-nowrap">
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
              className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:border-zinc-500 transition-colors"
            >
              ← Anterior
            </a>
          )}
          <span className="text-sm text-zinc-500">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/audit?page=${page + 1}${accionFilter ? `&accion=${accionFilter}` : ""}`}
              className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:border-zinc-500 transition-colors"
            >
              Siguiente →
            </a>
          )}
        </div>
      )}
    </main>
  );
}
