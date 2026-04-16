import type { KpiResumen } from "@/app/estadisticas/actions";
import { TrendingUp, DollarSign, CalendarCheck, BarChart3 } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formatGs(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `Gs ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `Gs ${(value / 1_000).toFixed(0)}K`;
  }
  return `Gs ${value.toFixed(0)}`;
}

function semaforo(pct: number): string {
  if (pct >= 100) return "text-red-500 dark:text-red-400";
  if (pct >= 80) return "text-amber-500 dark:text-amber-400";
  return "text-emerald-500 dark:text-emerald-400";
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

interface KpiCardsProps {
  data: KpiResumen;
}

export function KpiCards({ data }: KpiCardsProps) {
  const pctGasto =
    data.presupuestoTotal > 0
      ? Math.min(999, (data.gastoReal / data.presupuestoTotal) * 100)
      : 0;

  const pctDias =
    data.diasPlanificados && data.diasTranscurridos !== null
      ? Math.min(999, (data.diasTranscurridos / data.diasPlanificados) * 100)
      : null;

  const cards = [
    {
      label: "Avance real",
      value: `${data.avancePct.toFixed(1)}%`,
      sub: "de obra ejecutada",
      icon: TrendingUp,
      gradient: "from-indigo-500 to-violet-600",
      pct: data.avancePct,
    },
    {
      label: "Presupuesto ejecutado",
      value: formatGs(data.gastoReal),
      sub: `de ${formatGs(data.presupuestoTotal)} presupuestado (${pctGasto.toFixed(1)}%)`,
      icon: BarChart3,
      gradient: "from-sky-500 to-blue-600",
      pct: pctGasto,
    },
    {
      label: "Saldo disponible",
      value: formatGs(data.saldoDisponible),
      sub: data.saldoDisponible >= 0 ? "positivo" : "déficit — revisar ingresos",
      icon: DollarSign,
      gradient:
        data.saldoDisponible >= 0
          ? "from-emerald-500 to-teal-600"
          : "from-red-500 to-rose-600",
      pct: null,
    },
    {
      label: "Días transcurridos",
      value:
        data.diasTranscurridos !== null ? `${data.diasTranscurridos} días` : "—",
      sub:
        pctDias !== null
          ? `de ${data.diasPlanificados} planificados (${pctDias.toFixed(0)}%)`
          : "sin fecha de inicio registrada",
      icon: CalendarCheck,
      gradient: "from-orange-500 to-amber-500",
      pct: pctDias,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const color = card.pct !== null ? semaforo(card.pct) : "";
        return (
          <div
            key={card.label}
            className="relative rounded-2xl p-5 overflow-hidden dark:bg-slate-900 bg-white border dark:border-white/[0.06] border-slate-200 shadow-sm"
          >
            {/* Fondo de gradiente suave */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.04]`}
            />
            {/* Línea superior */}
            <div
              className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.gradient}`}
            />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-1">
                  {card.label}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    card.label === "Saldo disponible"
                      ? color || "dark:text-slate-100 text-slate-800"
                      : "dark:text-slate-100 text-slate-800"
                  }`}
                >
                  {card.value}
                </p>
                <p className={`text-[11px] mt-0.5 ${color || "dark:text-slate-500 text-slate-400"}`}>
                  {card.sub}
                </p>
              </div>
              <div
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${card.gradient} shadow-md`}
              >
                <Icon size={18} className="text-white" strokeWidth={1.75} />
              </div>
            </div>

            {/* Barra de progreso si hay pct */}
            {card.pct !== null && (
              <div className="relative mt-4">
                <div className="h-1.5 rounded-full dark:bg-slate-800 bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${card.gradient} transition-all duration-700`}
                    style={{ width: `${Math.min(100, card.pct)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
