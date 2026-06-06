import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Phone, AlertTriangle, Timer, Heart } from "lucide-react";
import { useLocation } from "wouter";

const PROTOCOL_STEPS = [
  { step: 1, title: "Consuma 15g de Carboidratos Rápidos", examples: "3 balas de glicose, 1/2 copo de suco de laranja, 1 colher de sopa de mel" },
  { step: 2, title: "Aguarde 15 Minutos", examples: "Use o timer abaixo para controlar o tempo. Não coma mais durante a espera." },
  { step: 3, title: "Meça Novamente", examples: "Se ainda estiver abaixo de 70 mg/dL, repita o passo 1." },
];

export default function SOS() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: contacts } = trpc.emergency.list.useQuery(undefined, { enabled: isAuthenticated });

  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 min in seconds

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const startTimer = useCallback(() => {
    setTimerActive(true);
    setTimeLeft(15 * 60);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerActive(false);
    setTimeLeft(15 * 60);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const primaryContact = contacts?.find(c => c.isPrimary) || contacts?.[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Red Header */}
      <div className="bg-destructive/20 border-b border-destructive/30 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-1 text-foreground hover:text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="font-bold text-destructive" style={{ fontFamily: "'Poppins', sans-serif" }}>SOS EMERGÊNCIA</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Emergency Call */}
        {primaryContact && (
          <Card className="bg-destructive/10 border-destructive/30 glow-danger">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Phone className="w-7 h-7 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Contato de Emergência</p>
                  <p className="font-bold text-foreground text-lg">{primaryContact.name}</p>
                  <p className="text-sm text-muted-foreground">{primaryContact.relationship}</p>
                </div>
                <a href={`tel:${primaryContact.phone}`}>
                  <Button variant="destructive" size="lg" className="gap-2">
                    <Phone className="w-4 h-4" /> Ligar
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SAMU */}
        <a href="tel:192" className="block">
          <Card className="bg-destructive/10 border-destructive/30 hover:bg-destructive/15 transition-colors">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">SAMU - 192</p>
                <p className="text-xs text-muted-foreground">Serviço de Atendimento Móvel de Urgência</p>
              </div>
              <Phone className="w-5 h-5 text-destructive" />
            </CardContent>
          </Card>
        </a>

        {/* Protocol Steps */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Protocolo de Hipoglicemia (Regra 15-15)
          </h2>
          <div className="space-y-3">
            {PROTOCOL_STEPS.map((s) => (
              <Card key={s.step} className="bg-card border-border">
                <CardContent className="pt-4 pb-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-destructive">{s.step}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.examples}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 15-minute Timer */}
        <Card className={`border-border ${timerActive ? "glow-danger border-destructive/30" : "bg-card"}`}>
          <CardContent className="pt-6 pb-6 text-center">
            <Timer className={`w-8 h-8 mx-auto mb-3 ${timerActive ? "text-destructive animate-pulse" : "text-primary"}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Timer 15 Minutos</p>
            <p className="text-5xl font-extrabold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </p>
            <div className="flex gap-3 justify-center">
              {!timerActive ? (
                <Button onClick={startTimer} size="lg" className="gap-2">
                  <Timer className="w-4 h-4" /> Iniciar Timer
                </Button>
              ) : (
                <Button onClick={resetTimer} variant="outline" size="lg" className="gap-2 bg-secondary">
                  Reiniciar
                </Button>
              )}
            </div>
            {timeLeft === 0 && (
              <div className="mt-4 p-3 bg-success/15 rounded-lg">
                <p className="text-success font-semibold">Tempo concluído! Meça sua glicemia novamente.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
