import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, User, Settings, Phone, Plus, Trash2, LogOut, Shield, Radio } from "lucide-react";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: contacts } = trpc.emergency.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const [targetMin, setTargetMin] = useState("");
  const [targetMax, setTargetMax] = useState("");

  // Emergency contact form
  const [contactOpen, setContactOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRel, setContactRel] = useState("");
  const [contactPrimary, setContactPrimary] = useState(false);

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success("Perfil atualizado!"); utils.profile.get.invalidate(); utils.dashboard.get.invalidate(); },
    onError: () => toast.error("Erro ao atualizar."),
  });

  const addContact = trpc.emergency.add.useMutation({
    onSuccess: () => {
      toast.success("Contato adicionado!");
      setContactOpen(false);
      setContactName(""); setContactPhone(""); setContactRel(""); setContactPrimary(false);
      utils.emergency.list.invalidate();
    },
    onError: () => toast.error("Erro ao adicionar contato."),
  });

  const deleteContact = trpc.emergency.delete.useMutation({
    onSuccess: () => { toast.success("Contato removido."); utils.emergency.list.invalidate(); },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { logout(); window.location.href = "/"; },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const diabetesLabels: Record<string, string> = {
    type1: "Tipo 1", type2: "Tipo 2", gestational: "Gestacional", prediabetes: "Pré-Diabetes", other: "Outro",
  };
  const deviceLabels: Record<string, string> = {
    cgm: "Sensor CGM", glucometer: "Glicosímetro", both: "Ambos", none: "Nenhum",
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* User Info */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>{user?.name || "Usuário"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
        </div>
      </div>

      {/* Metabolic Profile */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Perfil Metabólico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Tipo de Diabetes</span>
            <span className="font-medium text-foreground text-sm">{profile?.diabetesType ? diabetesLabels[profile.diabetesType] : "Não definido"}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Dispositivo</span>
            <span className="font-medium text-foreground text-sm">{profile?.deviceType ? deviceLabels[profile.deviceType] : "Não definido"}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Alvo Glicêmico</span>
            <span className="font-medium text-foreground text-sm">{profile?.targetMin ?? 70} - {profile?.targetMax ?? 180} mg/dL</span>
          </div>
          <div className="pt-2 flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Mínimo</Label>
              <Input type="number" placeholder={String(profile?.targetMin ?? 70)} value={targetMin} onChange={e => setTargetMin(e.target.value)}
                className="mt-1 bg-input border-border text-foreground h-9 text-sm" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Máximo</Label>
              <Input type="number" placeholder={String(profile?.targetMax ?? 180)} value={targetMax} onChange={e => setTargetMax(e.target.value)}
                className="mt-1 bg-input border-border text-foreground h-9 text-sm" />
            </div>
            <Button size="sm" className="mt-auto" disabled={(!targetMin && !targetMax) || updateProfile.isPending}
              onClick={() => updateProfile.mutate({
                ...(targetMin ? { targetMin: parseInt(targetMin) } : {}),
                ...(targetMax ? { targetMax: parseInt(targetMax) } : {}),
              })}>
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-destructive" /> Contatos de Emergência</CardTitle>
            <Dialog open={contactOpen} onOpenChange={setContactOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 bg-secondary h-8"><Plus className="w-3 h-3" /> Adicionar</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Novo Contato de Emergência</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <Input placeholder="Ex: Maria Silva" value={contactName} onChange={e => setContactName(e.target.value)}
                      className="mt-1 bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <Input placeholder="Ex: (11) 99999-9999" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                      className="mt-1 bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Parentesco</Label>
                    <Input placeholder="Ex: Mãe, Cônjuge" value={contactRel} onChange={e => setContactRel(e.target.value)}
                      className="mt-1 bg-input border-border text-foreground" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={contactPrimary} onChange={e => setContactPrimary(e.target.checked)}
                      className="w-4 h-4 rounded border-border" />
                    <span className="text-sm text-foreground">Contato principal (aparece no SOS)</span>
                  </label>
                  <Button className="w-full" disabled={!contactName || !contactPhone || addContact.isPending}
                    onClick={() => addContact.mutate({ name: contactName, phone: contactPhone, relationship: contactRel || undefined, isPrimary: contactPrimary })}>
                    Salvar Contato
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!contacts || contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum contato cadastrado. Adicione para usar no SOS.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{c.name} {c.isPrimary && <span className="text-xs text-primary">(Principal)</span>}</p>
                    <p className="text-xs text-muted-foreground">{c.phone} {c.relationship && `- ${c.relationship}`}</p>
                  </div>
                  <button onClick={() => deleteContact.mutate({ id: c.id })} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setLocation("/nightscout")}>
        <CardContent className="flex items-center gap-3 py-4">
          <Radio className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Nightscout</p>
            <p className="text-xs text-muted-foreground">Conectar CGM e sincronizar dados</p>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="outline" className="w-full gap-2 bg-secondary text-muted-foreground hover:text-destructive" onClick={() => logoutMutation.mutate()}>
        <LogOut className="w-4 h-4" /> Sair da Conta
      </Button>
    </div>
  );
}
