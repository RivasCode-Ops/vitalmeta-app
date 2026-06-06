import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Activity, Shield, Clock, Utensils, ArrowRight, Zap } from "lucide-react";
import { useEffect } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/92993302/KbooDNEHZac63fVcFBRUy9/vitalmeta_logo_main_822ee86f.png";

const features = [
  { icon: Activity, title: "Score Metabólico", desc: "Acompanhe sua saúde com um score de 0-100 baseado em dados reais." },
  { icon: Shield, title: "SOS Emergência", desc: "Protocolo de hipoglicemia com timer de 15min e contatos rápidos." },
  { icon: Clock, title: "Timeline Inteligente", desc: "Visualize todos os eventos do dia em ordem cronológica." },
  { icon: Utensils, title: "Refeições Seguras", desc: "Salve alimentos que funcionam bem para o seu metabolismo." },
  { icon: Zap, title: "Quick Log", desc: "Registre glicemia, insulina e refeições em segundos." },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-dark via-background to-navy opacity-80" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-vm/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-lg mx-auto px-6 pt-16 pb-20 text-center">
          <div className="flex justify-center mb-6">
            <img src={LOGO_URL} alt="VitalMeta" className="w-20 h-20 rounded-2xl shadow-lg glow-cyan" />
          </div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <span className="text-foreground">Vital</span>
            <span className="text-primary">Meta</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Inteligência Metabólica ao seu alcance. Controle, previsibilidade e segurança no tratamento do diabetes.
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button size="lg" className="w-full text-base font-semibold gap-2" onClick={() => window.location.href = getLoginUrl()}>
              Começar Agora <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" className="w-full text-base bg-secondary/50" onClick={() => window.location.href = getLoginUrl()}>
              Já tenho conta
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Tudo que você precisa
        </h2>
        <div className="space-y-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-muted-foreground text-sm border-t border-border">
        <p>VitalMeta &mdash; Metabolic Intelligence Platform</p>
      </footer>
    </div>
  );
}
