import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronsUp, ChevronsDown, Timer, Activity, ArrowRight, Lightbulb } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useMemo } from "react";

const trendIcons: Record<string, { icon: typeof TrendingUp; label: string; color: string }> = {
  rising_fast: { icon: ChevronsUp, label: "Subindo Rápido", color: "text-danger" },
  rising: { icon: TrendingUp, label: "Subindo", color: "text-warning" },
  stable: { icon: Minus, label: "Estável", color: "text-success" },
  falling: { icon: TrendingDown, label: "Descendo", color: "text-warning" },
  falling_fast: { icon: ChevronsDown, label: "Descendo Rápido", color: "text-danger" },
};

function getGlucoseStatus(value: number, min: number, max: number) {
  if (value < min) return { label: "Baixa", color: "text-glucose-low", bg: "bg-glucose-low/15" };
  if (value > max) return { label: "Alta", color: "text-glucose-high", bg: "bg-glucose-high/15" };
  return { label: "No Alvo", color: "text-glucose-normal", bg: "bg-glucose-normal/15" };
}

function getScoreLabel(score: number) {
  if (score >= 80) return { label: "Excelente", color: "text-success" };
  if (score >= 60) return { label: "Bom", color: "text-cyan-vm" };
  if (score >= 40) return { label: "Regular", color: "text-warning" };
  return { label: "Atenção", color: "text-danger" };
}

function formatElapsed(startedAt: number) {
  const diff = Date.now() - startedAt;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading } = trpc.dashboard.get.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30000 });
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: nsStatus } = trpc.connectors.nightscout.status.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (profile !== undefined && profile !== null && !profile.onboardingCompleted) setLocation("/onboarding");
  }, [profile, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dashboard) return null;

  const scoreInfo = getScoreLabel(dashboard.score);
  const glucoseStatus = dashboard.latestGlucose
    ? getGlucoseStatus(dashboard.latestGlucose.value, dashboard.targetMin, dashboard.targetMax)
    : null;
  const trend = dashboard.latestGlucose?.trendArrow
    ? trendIcons[dashboard.latestGlucose.trendArrow]
    : trendIcons.stable;
  const TrendIcon = trend.icon;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Olá, {user?.name?.split(" ")[0] || "Usuário"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Aqui está seu resumo metabólico de hoje.</p>
      </div>

      {/* Metabolic Score */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="pt-6 pb-6 text-center">
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-primary" strokeWidth="8"
                strokeDasharray={`${(dashboard.score / 100) * 327} 327`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {dashboard.score}
              </span>
              <span className={`text-sm font-semibold ${scoreInfo.color}`}>{scoreInfo.label}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Metabolic Score</p>
        </CardContent>
      </Card>

      {/* Time in Range */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Time in Range (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-foreground">{dashboard.timeInRange}%</span>
            <span className="text-sm text-muted-foreground">de {dashboard.readingsCount} leituras</span>
          </div>
          <Progress value={dashboard.timeInRange} className="h-3 bg-secondary" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{dashboard.targetMin} mg/dL</span>
            <span>Alvo: {dashboard.targetMin}-{dashboard.targetMax}</span>
            <span>{dashboard.targetMax} mg/dL</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Glucose */}
      {dashboard.latestGlucose && glucoseStatus && (
        <Card className={`bg-card border-border`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Glicemia Atual</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-foreground">{dashboard.latestGlucose.value}</span>
                  <span className="text-lg text-muted-foreground">mg/dL</span>
                </div>
                <span className={`text-sm font-medium ${glucoseStatus.color}`}>{glucoseStatus.label}</span>
              </div>
              <div className={`w-16 h-16 rounded-2xl ${glucoseStatus.bg} flex flex-col items-center justify-center`}>
                <TrendIcon className={`w-8 h-8 ${trend.color}`} />
                <span className={`text-[9px] font-medium ${trend.color}`}>{trend.label}</span>
              </div>
            </div>
            {dashboard.latestGlucose.context && dashboard.latestGlucose.context !== "random" && (
              <div className="mt-3 px-3 py-1.5 bg-secondary rounded-lg inline-block">
                <span className="text-xs text-muted-foreground">
                  {dashboard.latestGlucose.context === "pre_meal" ? "Pré-Prandial" :
                   dashboard.latestGlucose.context === "post_meal" ? "Pós-Prandial" :
                   dashboard.latestGlucose.context === "fasting" ? "Jejum" : "Antes de Dormir"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CGM / Nightscout Link */}
      {nsStatus?.connected && (
        <Card className="bg-card border-primary/20 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setLocation("/glycemia")}>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">CGM • Nightscout</p>
                <p className="text-xs text-muted-foreground">Ver gráfico completo de glicemia</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* AI Insights Link */}
      <Card className="bg-card border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-colors" onClick={() => setLocation("/insights")}>
        <CardContent className="pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Insights do Dia</p>
              <p className="text-xs text-muted-foreground">Análise inteligente dos seus dados</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {/* Active Fasting */}
      {dashboard.activeFasting && (
        <Card className="bg-card border-primary/30 glow-cyan">
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Timer className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Jejum em Andamento</p>
              <p className="text-2xl font-bold text-primary">{formatElapsed(dashboard.activeFasting.startedAt)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!dashboard.latestGlucose && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground mb-2">Nenhuma leitura registrada hoje.</p>
            <p className="text-sm text-muted-foreground">Use o botão <span className="text-primary font-semibold">+</span> para registrar sua primeira medição.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
