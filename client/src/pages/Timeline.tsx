import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Droplets, Syringe, Utensils, Timer, Pill } from "lucide-react";
import { useMemo } from "react";

const eventConfig: Record<string, { icon: typeof Droplets; color: string; bg: string; label: string }> = {
  glucose: { icon: Droplets, color: "text-cyan-vm", bg: "bg-cyan-vm/15", label: "Glicemia" },
  insulin: { icon: Syringe, color: "text-chart-5", bg: "bg-chart-5/15", label: "Insulina" },
  meal: { icon: Utensils, color: "text-warning", bg: "bg-warning/15", label: "Refeição" },
  fasting: { icon: Timer, color: "text-primary", bg: "bg-primary/15", label: "Jejum" },
  medication: { icon: Pill, color: "text-success", bg: "bg-success/15", label: "Medicamento" },
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function getEventDetail(type: string, data: Record<string, unknown>) {
  switch (type) {
    case "glucose": {
      const ctx = data.context as string;
      const ctxLabel = ctx === "pre_meal" ? "Pré-Prandial" : ctx === "post_meal" ? "Pós-Prandial" : ctx === "fasting" ? "Jejum" : ctx === "bedtime" ? "Antes de Dormir" : "";
      return (
        <div>
          <span className="text-xl font-bold text-foreground">{data.value as number} mg/dL</span>
          {ctxLabel && <span className="ml-2 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{ctxLabel}</span>}
        </div>
      );
    }
    case "insulin":
      return <span className="text-sm text-foreground">{String(data.units)}U - {String(data.insulinType) === "rapid" ? "Rápida" : String(data.insulinType) === "long" ? "Lenta" : String(data.insulinType)}</span>;
    case "meal":
      return (
        <div>
          <span className="text-sm text-foreground">{String(data.description || 'Refeição registrada')}</span>
          {data.carbsEstimate != null && <span className="ml-2 text-xs text-muted-foreground">{String(data.carbsEstimate)}g carbs</span>}
        </div>
      );
    case "fasting":
      return <span className="text-sm text-foreground">{data.endedAt ? "Jejum finalizado" : "Jejum em andamento"}</span>;
    case "medication":
      return <span className="text-sm text-foreground">{String(data.medicationName || '')} {data.dosage ? `- ${String(data.dosage)}` : ''}</span>;
    default:
      return null;
  }
}

export default function Timeline() {
  const { isAuthenticated } = useAuth();
  const now = useMemo(() => Date.now(), []);
  const dayAgo = useMemo(() => now - 24 * 60 * 60 * 1000, [now]);

  const { data: events, isLoading } = trpc.timeline.events.useQuery(
    { from: dayAgo, to: now },
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>Timeline Metabólica</h1>
      <p className="text-sm text-muted-foreground mb-6">Últimas 24 horas</p>

      {!events || events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Nenhum evento registrado nas últimas 24h.</p>
          <p className="text-sm text-muted-foreground mt-1">Use o Quick Log para adicionar registros.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {events.map((event, i) => {
              const config = eventConfig[event.type] || eventConfig.glucose;
              const Icon = config.icon;
              return (
                <div key={`${event.type}-${i}`} className="relative flex items-start gap-4 pl-2">
                  {/* Dot on timeline */}
                  <div className={`relative z-10 w-7 h-7 rounded-full ${config.bg} flex items-center justify-center shrink-0 ring-2 ring-background`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 bg-card rounded-xl border border-border p-3 -mt-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
                    </div>
                    {getEventDetail(event.type, event.data)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
