import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Droplets, Syringe, Utensils, Timer, Pill, ArrowLeft, Check, Loader2 } from "lucide-react";

type LogType = "glucose" | "insulin" | "meal" | "medication" | "fasting" | null;

const logOptions = [
  { type: "glucose" as const, icon: Droplets, label: "Glicemia", color: "text-cyan-vm", bg: "bg-cyan-vm/15", border: "border-cyan-vm/30" },
  { type: "insulin" as const, icon: Syringe, label: "Insulina", color: "text-chart-5", bg: "bg-chart-5/15", border: "border-chart-5/30" },
  { type: "meal" as const, icon: Utensils, label: "Refeição", color: "text-warning", bg: "bg-warning/15", border: "border-warning/30" },
  { type: "fasting" as const, icon: Timer, label: "Jejum", color: "text-primary", bg: "bg-primary/15", border: "border-primary/30" },
  { type: "medication" as const, icon: Pill, label: "Medicamento", color: "text-success", bg: "bg-success/15", border: "border-success/30" },
];

export default function QuickLog() {
  const { isAuthenticated } = useAuth();
  const [activeLog, setActiveLog] = useState<LogType>(null);
  const utils = trpc.useUtils();

  // Glucose form
  const [glucoseValue, setGlucoseValue] = useState("");
  const [glucoseContext, setGlucoseContext] = useState("random");
  const [trendArrow, setTrendArrow] = useState("stable");

  // Insulin form
  const [insulinUnits, setInsulinUnits] = useState("");
  const [insulinType, setInsulinType] = useState("rapid");

  // Meal form
  const [mealType, setMealType] = useState("snack");
  const [mealDesc, setMealDesc] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");

  // Medication form
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");

  const addGlucose = trpc.glucose.add.useMutation({
    onSuccess: () => { toast.success("Glicemia registrada com sucesso!"); resetAndClose(); utils.dashboard.get.invalidate(); utils.timeline.events.invalidate(); },
    onError: (err) => toast.error(err.message || "Erro ao registrar glicemia."),
  });

  const addInsulin = trpc.insulin.add.useMutation({
    onSuccess: () => { toast.success("Insulina registrada com sucesso!"); resetAndClose(); utils.timeline.events.invalidate(); },
    onError: (err) => toast.error(err.message || "Erro ao registrar insulina."),
  });

  const addMeal = trpc.meal.add.useMutation({
    onSuccess: () => { toast.success("Refeição registrada com sucesso!"); resetAndClose(); utils.timeline.events.invalidate(); },
    onError: (err) => toast.error(err.message || "Erro ao registrar refeição."),
  });

  const addMed = trpc.medication.add.useMutation({
    onSuccess: () => { toast.success("Medicamento registrado com sucesso!"); resetAndClose(); utils.timeline.events.invalidate(); },
    onError: (err) => toast.error(err.message || "Erro ao registrar medicamento."),
  });

  const startFast = trpc.fasting.start.useMutation({
    onSuccess: () => { toast.success("Jejum iniciado!"); resetAndClose(); utils.dashboard.get.invalidate(); },
    onError: (err) => toast.error(err.message || "Erro ao iniciar jejum."),
  });

  function resetAndClose() {
    setActiveLog(null);
    setGlucoseValue(""); setGlucoseContext("random"); setTrendArrow("stable");
    setInsulinUnits(""); setInsulinType("rapid");
    setMealType("snack"); setMealDesc(""); setMealCarbs("");
    setMedName(""); setMedDosage("");
  }

  // Helper: only allow numeric input (for mobile compatibility)
  function handleNumericInput(value: string, setter: (v: string) => void, allowDecimal = false) {
    if (allowDecimal) {
      const cleaned = value.replace(/[^0-9.,]/g, "").replace(",", ".");
      setter(cleaned);
    } else {
      const cleaned = value.replace(/[^0-9]/g, "");
      setter(cleaned);
    }
  }

  if (!activeLog) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>Quick Log</h1>
        <p className="text-sm text-muted-foreground mb-6">O que você deseja registrar?</p>
        <div className="grid grid-cols-2 gap-3">
          {logOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button key={opt.type} onClick={() => setActiveLog(opt.type)}
                className={`p-5 rounded-xl ${opt.bg} border ${opt.border} flex flex-col items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-transform`}>
                <Icon className={`w-8 h-8 ${opt.color}`} />
                <span className={`text-sm font-semibold ${opt.color}`}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button onClick={resetAndClose} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {activeLog === "glucose" && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Registrar Glicemia</h2>
            <div>
              <Label htmlFor="glucose-input" className="text-muted-foreground text-sm mb-2 block">Valor (mg/dL)</Label>
              <input
                id="glucose-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoFocus
                placeholder="Ex: 120"
                value={glucoseValue}
                onChange={e => handleNumericInput(e.target.value, setGlucoseValue)}
                className="w-full h-16 text-3xl font-bold text-center rounded-xl border-2 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
                style={{ fontSize: "1.875rem", WebkitAppearance: "none", MozAppearance: "textfield" }}
              />
              {glucoseValue && (parseInt(glucoseValue) < 20 || parseInt(glucoseValue) > 600) && (
                <p className="text-xs text-destructive mt-1">Valor deve estar entre 20 e 600 mg/dL</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">Contexto</Label>
              <Select value={glucoseContext} onValueChange={setGlucoseContext}>
                <SelectTrigger className="bg-secondary/50 border-border h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Aleatório</SelectItem>
                  <SelectItem value="fasting">Jejum</SelectItem>
                  <SelectItem value="pre_meal">Pré-Prandial</SelectItem>
                  <SelectItem value="post_meal">Pós-Prandial</SelectItem>
                  <SelectItem value="bedtime">Antes de Dormir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">Seta de Tendência (CGM)</Label>
              <Select value={trendArrow} onValueChange={setTrendArrow}>
                <SelectTrigger className="bg-secondary/50 border-border h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rising_fast">⬆⬆ Subindo Rápido</SelectItem>
                  <SelectItem value="rising">⬆ Subindo</SelectItem>
                  <SelectItem value="stable">➡ Estável</SelectItem>
                  <SelectItem value="falling">⬇ Descendo</SelectItem>
                  <SelectItem value="falling_fast">⬇⬇ Descendo Rápido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2 h-12 text-base font-semibold"
              disabled={!glucoseValue || parseInt(glucoseValue) < 20 || parseInt(glucoseValue) > 600 || addGlucose.isPending}
              onClick={() => addGlucose.mutate({ value: parseInt(glucoseValue), context: glucoseContext as any, trendArrow: trendArrow as any, recordedAt: Date.now() })}>
              {addGlucose.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar Glicemia
            </Button>
          </CardContent>
        </Card>
      )}

      {activeLog === "insulin" && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Registrar Insulina</h2>
            <div>
              <Label htmlFor="insulin-input" className="text-muted-foreground text-sm mb-2 block">Unidades</Label>
              <input
                id="insulin-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                placeholder="Ex: 10"
                value={insulinUnits}
                onChange={e => handleNumericInput(e.target.value, setInsulinUnits, true)}
                className="w-full h-16 text-3xl font-bold text-center rounded-xl border-2 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
                style={{ fontSize: "1.875rem", WebkitAppearance: "none", MozAppearance: "textfield" }}
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">Tipo</Label>
              <Select value={insulinType} onValueChange={setInsulinType}>
                <SelectTrigger className="bg-secondary/50 border-border h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rapid">Rápida</SelectItem>
                  <SelectItem value="long">Lenta</SelectItem>
                  <SelectItem value="mixed">Mista</SelectItem>
                  <SelectItem value="other">Outra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2 h-12 text-base font-semibold"
              disabled={!insulinUnits || parseFloat(insulinUnits) < 0.1 || addInsulin.isPending}
              onClick={() => addInsulin.mutate({ units: parseFloat(insulinUnits), insulinType: insulinType as any, recordedAt: Date.now() })}>
              {addInsulin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar Insulina
            </Button>
          </CardContent>
        </Card>
      )}

      {activeLog === "meal" && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Registrar Refeição</h2>
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">Tipo</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="bg-secondary/50 border-border h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Café da Manhã</SelectItem>
                  <SelectItem value="lunch">Almoço</SelectItem>
                  <SelectItem value="dinner">Jantar</SelectItem>
                  <SelectItem value="snack">Lanche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="meal-desc" className="text-muted-foreground text-sm mb-2 block">Descrição</Label>
              <input
                id="meal-desc"
                type="text"
                autoComplete="off"
                placeholder="Ex: Arroz, feijão e frango"
                value={mealDesc}
                onChange={e => setMealDesc(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground px-4 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
              />
            </div>
            <div>
              <Label htmlFor="meal-carbs" className="text-muted-foreground text-sm mb-2 block">Carboidratos Estimados (g)</Label>
              <input
                id="meal-carbs"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="Ex: 45"
                value={mealCarbs}
                onChange={e => handleNumericInput(e.target.value, setMealCarbs)}
                className="w-full h-12 rounded-xl border-2 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground px-4 text-center focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
              />
            </div>
            <Button className="w-full gap-2 h-12 text-base font-semibold" disabled={addMeal.isPending}
              onClick={() => addMeal.mutate({ mealType: mealType as any, description: mealDesc || undefined, carbsEstimate: mealCarbs ? parseInt(mealCarbs) : undefined, recordedAt: Date.now() })}>
              {addMeal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar Refeição
            </Button>
          </CardContent>
        </Card>
      )}

      {activeLog === "medication" && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Registrar Medicamento</h2>
            <div>
              <Label htmlFor="med-name" className="text-muted-foreground text-sm mb-2 block">Nome do Medicamento</Label>
              <input
                id="med-name"
                type="text"
                autoComplete="off"
                autoFocus
                placeholder="Ex: Metformina"
                value={medName}
                onChange={e => setMedName(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground px-4 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
              />
            </div>
            <div>
              <Label htmlFor="med-dosage" className="text-muted-foreground text-sm mb-2 block">Dosagem</Label>
              <input
                id="med-dosage"
                type="text"
                autoComplete="off"
                placeholder="Ex: 500mg"
                value={medDosage}
                onChange={e => setMedDosage(e.target.value)}
                className="w-full h-12 rounded-xl border-2 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground px-4 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
              />
            </div>
            <Button className="w-full gap-2 h-12 text-base font-semibold" disabled={!medName || addMed.isPending}
              onClick={() => addMed.mutate({ medicationName: medName, dosage: medDosage || undefined, recordedAt: Date.now() })}>
              {addMed.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar Medicamento
            </Button>
          </CardContent>
        </Card>
      )}

      {activeLog === "fasting" && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-5 text-center">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Iniciar Jejum</h2>
            <p className="text-muted-foreground">O cronômetro será iniciado agora e aparecerá no seu Dashboard.</p>
            <Button className="w-full gap-2 h-12 text-base font-semibold" size="lg" disabled={startFast.isPending}
              onClick={() => startFast.mutate({})}>
              {startFast.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Timer className="w-5 h-5" />}
              Iniciar Jejum Agora
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
