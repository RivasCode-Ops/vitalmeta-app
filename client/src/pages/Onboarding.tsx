import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ArrowRight, Check, Loader2 } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/92993302/KbooDNEHZac63fVcFBRUy9/vitalmeta_logo_main_822ee86f.png";

const diabetesOptions = [
  { value: "type1" as const, label: "Tipo 1", desc: "Produção insuficiente de insulina" },
  { value: "type2" as const, label: "Tipo 2", desc: "Resistência à insulina" },
  { value: "gestational" as const, label: "Gestacional", desc: "Durante a gravidez" },
  { value: "prediabetes" as const, label: "Pré-Diabetes", desc: "Glicemia elevada, sem diagnóstico" },
  { value: "other" as const, label: "Outro", desc: "Outra condição metabólica" },
];

const deviceOptions = [
  { value: "cgm" as const, label: "Sensor CGM", desc: "Libre, Dexcom, etc." },
  { value: "glucometer" as const, label: "Glicosímetro", desc: "Medição por fita" },
  { value: "both" as const, label: "Ambos", desc: "Sensor + Glicosímetro" },
  { value: "none" as const, label: "Nenhum", desc: "Não uso dispositivo" },
];

export default function Onboarding() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [diabetesType, setDiabetesType] = useState<typeof diabetesOptions[number]["value"] | null>(null);
  const [deviceType, setDeviceType] = useState<typeof deviceOptions[number]["value"] | null>(null);

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Perfil configurado com sucesso!");
      setLocation("/dashboard");
    },
    onError: () => toast.error("Erro ao salvar perfil."),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleFinish = () => {
    if (!diabetesType || !deviceType) return;
    updateProfile.mutate({
      diabetesType,
      deviceType,
      onboardingCompleted: true,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="max-w-lg mx-auto px-6 py-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="VitalMeta" className="w-14 h-14 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Bem-vindo ao <span className="text-primary">VitalMeta</span>
          </h1>
          <p className="text-muted-foreground mt-1">Vamos configurar seu perfil metabólico.</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {/* Step 0: Diabetes Type */}
        {step === 0 && (
          <div className="flex-1">
            <div className="bg-card rounded-2xl p-4 mb-4 border border-border max-w-[85%]">
              <p className="text-foreground">Qual é o seu tipo de diabetes? Isso me ajuda a personalizar seus alertas e metas.</p>
            </div>
            <div className="space-y-2 mt-6">
              {diabetesOptions.map(opt => (
                <button key={opt.value} onClick={() => { setDiabetesType(opt.value); setStep(1); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${diabetesType === opt.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}>
                  <p className="font-semibold text-foreground">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Device Type */}
        {step === 1 && (
          <div className="flex-1">
            <div className="bg-card rounded-2xl p-4 mb-4 border border-border max-w-[85%]">
              <p className="text-foreground">Ótimo! Agora, como você mede sua glicemia? Isso ativa as setas de tendência no seu Dashboard.</p>
            </div>
            <div className="space-y-2 mt-6">
              {deviceOptions.map(opt => (
                <button key={opt.value} onClick={() => { setDeviceType(opt.value); setStep(2); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${deviceType === opt.value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}>
                  <p className="font-semibold text-foreground">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Confirmation */}
        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <div className="bg-card rounded-2xl p-4 mb-6 border border-border max-w-[85%]">
              <p className="text-foreground">Tudo pronto! Aqui está o resumo do seu perfil:</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 space-y-3 mb-8">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de Diabetes</span>
                <span className="font-semibold text-foreground">{diabetesOptions.find(o => o.value === diabetesType)?.label}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dispositivo</span>
                <span className="font-semibold text-foreground">{deviceOptions.find(o => o.value === deviceType)?.label}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alvo Glicêmico</span>
                <span className="font-semibold text-foreground">70 - 180 mg/dL</span>
              </div>
            </div>
            <div className="mt-auto space-y-3">
              <Button size="lg" className="w-full gap-2" onClick={handleFinish} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirmar e Começar
              </Button>
              <Button variant="outline" size="lg" className="w-full bg-secondary" onClick={() => setStep(0)}>
                Refazer Configuração
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
