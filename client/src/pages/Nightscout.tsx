import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Link, Unlink, RefreshCw, CheckCircle2, XCircle, Activity, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Nightscout() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: status, isLoading: statusLoading } = trpc.connectors.nightscout.status.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const connect = trpc.connectors.nightscout.connect.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.connectors.nightscout.status.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sync = trpc.connectors.nightscout.sync.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronizado! ${data.imported.glucose} leituras, ${data.imported.treatments} eventos.`);
      utils.connectors.nightscout.status.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnect = trpc.connectors.nightscout.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Desconectado do Nightscout.");
      setBaseUrl("");
      setApiKey("");
      utils.connectors.nightscout.status.invalidate();
    },
  });

  const isConnected = status?.connected ?? false;
  const lastSync = status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("pt-BR") : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/profile")} className="p-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Nightscout</h1>
      </div>

      {/* Status Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Status da Conexão
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={`text-sm font-medium ${isConnected ? "text-green-500" : "text-muted-foreground"}`}>
                  {isConnected ? "Conectado" : "Desconectado"}
                </span>
              </div>
              {isConnected && status?.baseUrl && (
                <p className="text-xs text-muted-foreground break-all">{status.baseUrl}</p>
              )}
              {lastSync && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />
                  Última sincronização: {lastSync}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect Form */}
      {!isConnected && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="w-4 h-4 text-primary" />
              Conectar ao Nightscout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">URL do Nightscout</Label>
              <Input
                placeholder="https://seu-site.herokuapp.com"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="mt-1 bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">API Secret (opcional)</Label>
              <Input
                type="password"
                placeholder="Sua chave secreta"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="mt-1 bg-input border-border text-foreground"
              />
            </div>
            <Button
              className="w-full gap-2"
              disabled={!baseUrl || connect.isPending}
              onClick={() => connect.mutate({ baseUrl, apiKey: apiKey || undefined })}
            >
              {connect.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link className="w-4 h-4" />
              )}
              Conectar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected Actions */}
      {isConnected && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Ações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full gap-2"
              variant="default"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              {sync.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sincronizar Agora
            </Button>
            <Button
              className="w-full gap-2"
              variant="outline"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate()}
            >
              <Unlink className="w-4 h-4" />
              Desconectar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
