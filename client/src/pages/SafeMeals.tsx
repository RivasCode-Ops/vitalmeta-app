import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Utensils, Leaf, AlertCircle, Flame } from "lucide-react";

const impactConfig = {
  low: { icon: Leaf, label: "Baixo Impacto", color: "text-success", bg: "bg-success/15" },
  medium: { icon: AlertCircle, label: "Impacto Moderado", color: "text-warning", bg: "bg-warning/15" },
  high: { icon: Flame, label: "Alto Impacto", color: "text-danger", bg: "bg-danger/15" },
};

export default function SafeMeals() {
  const { isAuthenticated } = useAuth();
  const { data: meals, isLoading } = trpc.safeMeals.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [carbs, setCarbs] = useState("");
  const [impact, setImpact] = useState("low");

  const addMeal = trpc.safeMeals.add.useMutation({
    onSuccess: () => {
      toast.success("Refeição segura adicionada!");
      setOpen(false);
      setName(""); setDesc(""); setCarbs(""); setImpact("low");
      utils.safeMeals.list.invalidate();
    },
    onError: () => toast.error("Erro ao adicionar refeição."),
  });

  const deleteMeal = trpc.safeMeals.delete.useMutation({
    onSuccess: () => {
      toast.success("Refeição removida.");
      utils.safeMeals.list.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Refeições Seguras</h1>
          <p className="text-sm text-muted-foreground">Alimentos que funcionam bem para você.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Adicionar</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nova Refeição Segura</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <Input placeholder="Ex: Omelete com queijo" value={name} onChange={e => setName(e.target.value)}
                  className="mt-1 bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição (opcional)</Label>
                <Input placeholder="Ex: 2 ovos, 30g de queijo" value={desc} onChange={e => setDesc(e.target.value)}
                  className="mt-1 bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-muted-foreground">Carboidratos Estimados (g)</Label>
                <Input type="number" placeholder="Ex: 5" value={carbs} onChange={e => setCarbs(e.target.value)}
                  className="mt-1 bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-muted-foreground">Impacto Glicêmico</Label>
                <Select value={impact} onValueChange={setImpact}>
                  <SelectTrigger className="mt-1 bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo Impacto</SelectItem>
                    <SelectItem value="medium">Impacto Moderado</SelectItem>
                    <SelectItem value="high">Alto Impacto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!name || addMeal.isPending}
                onClick={() => addMeal.mutate({ name, description: desc || undefined, carbsEstimate: carbs ? parseInt(carbs) : undefined, glycemicImpact: impact as any })}>
                Salvar Refeição
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!meals || meals.length === 0 ? (
        <div className="text-center py-16">
          <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma refeição segura cadastrada.</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione alimentos que não causam picos na sua glicemia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map(meal => {
            const imp = impactConfig[(meal.glycemicImpact as keyof typeof impactConfig) || "low"];
            const ImpIcon = imp.icon;
            return (
              <Card key={meal.id} className="bg-card border-border">
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${imp.bg} flex items-center justify-center shrink-0`}>
                    <ImpIcon className={`w-5 h-5 ${imp.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{meal.name}</p>
                    {meal.description && <p className="text-sm text-muted-foreground">{meal.description}</p>}
                    <div className="flex gap-3 mt-1">
                      {meal.carbsEstimate != null && <span className="text-xs text-muted-foreground">{meal.carbsEstimate}g carbs</span>}
                      <span className={`text-xs ${imp.color}`}>{imp.label}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteMeal.mutate({ id: meal.id })} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
