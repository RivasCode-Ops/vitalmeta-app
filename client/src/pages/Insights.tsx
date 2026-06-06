import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, Sparkles, AlertTriangle, CheckCircle2, Target, RefreshCw, Brain } from "lucide-react";

const tirColors = [
  { max: 50, color: "text-red-400", label: "Atenção" },
  { max: 70, color: "text-amber-400", label: "Regular" },
  { max: 100, color: "text-green-400", label: "Bom" },
];

function getTirInfo(tir: number) {
  return tirColors.find(c => tir <= c.max) ?? tirColors[tirColors.length - 1];
}

export default function Insights() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data, isLoading, isError, refetch, isFetching } = trpc.insights.dailyBrief.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Insights do Dia</h1>
          <p className="text-sm text-muted-foreground">Análise inteligente das últimas 24h</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Brain className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Analisando seus dados...</p>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nao foi possível gerar insights agora.</p>
            <p className="text-sm text-muted-foreground">Verifique se há dados de glicemia registrados nas últimas 24h.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Summary */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{data.brief.summary}</p>
              <div className="mt-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  TIR: <span className={`font-semibold ${getTirInfo(data.brief.timeInRange).color}`}>{data.brief.timeInRange}%</span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Highlights */}
          {data.brief.highlights.length > 0 && (
            <Card className="bg-card border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Destaques Positivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.brief.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {data.brief.recommendations.length > 0 && (
            <Card className="bg-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.brief.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* LLM Patterns */}
          {data.brief.patterns.length > 0 && (
            <Card className="bg-card border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  Padrões Detectados (IA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.brief.patterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Brain className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Rule-based Patterns */}
          {data.patterns.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  Padrões Estatísticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.patterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {data.brief.highlights.length === 0 &&
            data.brief.recommendations.length === 0 &&
            data.brief.patterns.length === 0 &&
            data.patterns.length === 0 && (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="pt-8 pb-8 text-center space-y-3">
                <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Poucos dados para gerar padrões significativos.</p>
                <p className="text-sm text-muted-foreground">Continue registrando para receber insights mais detalhados.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
