import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronsUp, ChevronsDown, Activity, Link } from "lucide-react";
import { useLocation } from "wouter";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea, ReferenceLine } from "recharts";

const trendConfig: Record<string, { icon: typeof TrendingUp; label: string }> = {
  rising_fast: { icon: ChevronsUp, label: "Subindo Rápido" },
  rising: { icon: TrendingUp, label: "Subindo" },
  stable: { icon: Minus, label: "Estável" },
  falling: { icon: TrendingDown, label: "Descendo" },
  falling_fast: { icon: ChevronsDown, label: "Descendo Rápido" },
};

function glucoseColor(value: number, min: number, max: number) {
  if (value < 54) return { text: "text-red-400", bg: "bg-red-400/20", border: "border-red-400/40", label: "Perigosamente Baixa" };
  if (value < min) return { text: "text-orange-400", bg: "bg-orange-400/15", border: "border-orange-400/30", label: "Baixa" };
  if (value > 250) return { text: "text-red-400", bg: "bg-red-400/20", border: "border-red-400/40", label: "Perigosamente Alta" };
  if (value > max) return { text: "text-amber-400", bg: "bg-amber-400/15", border: "border-amber-400/30", label: "Alta" };
  return { text: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/30", label: "No Alvo" };
}

function formatChartTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}min atrás`;
}

export default function Glycemia() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: latest, isLoading: latestLoading } = trpc.glycemia.latest.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30000 });
  const { data: history, isLoading: historyLoading } = trpc.glycemia.history.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 60000 });
  const { data: stats, isLoading: statsLoading } = trpc.glycemia.stats.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 60000 });
  const { data: nsStatus } = trpc.connectors.nightscout.status.useQuery(undefined, { enabled: isAuthenticated });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!latest && !latestLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Glicemia</h1>
        <Card className="bg-card border-border border-dashed">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhum dado de glicemia disponível.</p>
            <p className="text-sm text-muted-foreground">
              Conecte seu Nightscout ou registre manualmente no <button onClick={() => setLocation("/log")} className="text-primary underline">Quick Log</button>.
            </p>
            {!(nsStatus?.connected) && (
              <button
                onClick={() => setLocation("/nightscout")}
                className="inline-flex items-center gap-2 text-sm text-primary underline"
              >
                <Link className="w-4 h-4" /> Conectar Nightscout
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = latestLoading || historyLoading || statsLoading;

  if (isLoading || !latest || !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const color = glucoseColor(latest.value, latest.targetMin, latest.targetMax);
  const trend = trendConfig[latest.direction] ?? trendConfig.stable;
  const TrendIcon = trend.icon;

  const chartData = useMemo(() => {
    if (!history) return [];
    return history.map(h => ({ time: h.recordedAt, label: formatChartTime(h.recordedAt), value: h.value }));
  }, [history]);

  const yMin = latest.targetMin;
  const yMax = latest.targetMax;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Glicemia</h1>
        <span className="text-xs text-muted-foreground">
          {latest.source === "nightscout" ? "CGM • Nightscout" : "Manual"}
        </span>
      </div>

      {/* Current Glucose Hero */}
      <Card className={`bg-card border-2 ${color.border}`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                {latest.source === "nightscout" ? "Glicemia Atual (CGM)" : "Última Leitura"}
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-6xl font-extrabold ${color.text}`} style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {latest.value}
                </span>
                <span className="text-lg text-muted-foreground">mg/dL</span>
              </div>
              <div className={`mt-1 text-sm font-semibold ${color.text}`}>{color.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatRelative(latest.recordedAt)}</div>
            </div>
            <div className={`w-20 h-20 rounded-2xl ${color.bg} flex flex-col items-center justify-center`}>
              <TrendIcon className={`w-10 h-10 ${color.text}`} />
              <span className={`text-[10px] font-semibold ${color.text}`}>{trend.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 24h Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Últimas 24 horas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <ReferenceArea y1={yMin} y2={yMax} fill="hsl(var(--primary))" fillOpacity={0.06} />
                <ReferenceLine y={yMin} stroke="hsl(var(--primary))" strokeOpacity={0.3} strokeDasharray="4 4" />
                <ReferenceLine y={yMax} stroke="hsl(var(--primary))" strokeOpacity={0.3} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[Math.max(yMin - 60, 40), yMax + 80]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} mg/dL`, "Glicemia"]}
                  labelFormatter={(label: string) => `⏱ ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#glucoseGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-primary/30" /> Alvo {yMin}-{yMax}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">TIR</p>
            <p className={`text-2xl font-extrabold ${stats.timeInRange >= 70 ? "text-green-400" : stats.timeInRange >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {stats.timeInRange}%
            </p>
            <p className="text-[10px] text-muted-foreground">Tempo no Alvo</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Média</p>
            <p className="text-2xl font-extrabold text-foreground">{stats.meanGlucose}</p>
            <p className="text-[10px] text-muted-foreground">mg/dL</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">CV</p>
            <p className={`text-2xl font-extrabold ${stats.coefficientOfVariation <= 36 ? "text-green-400" : "text-amber-400"}`}>
              {stats.coefficientOfVariation}%
            </p>
            <p className="text-[10px] text-muted-foreground">Variação</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">GMI</p>
            <p className={`text-2xl font-extrabold ${stats.glucoseManagementIndicator <= 7 ? "text-green-400" : stats.glucoseManagementIndicator <= 8 ? "text-amber-400" : "text-red-400"}`}>
              {stats.glucoseManagementIndicator}%
            </p>
            <p className="text-[10px] text-muted-foreground">Indicador</p>
          </CardContent>
        </Card>
      </div>

      {/* Readings count */}
      <p className="text-center text-xs text-muted-foreground">
        {stats.readings} leituras nas últimas 24h
        {nsStatus?.connected && " • Sincronizado via Nightscout"}
      </p>
    </div>
  );
}
