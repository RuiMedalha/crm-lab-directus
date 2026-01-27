import { useState, useEffect, forwardRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useCompanySettings,
  useUpdateCompanySettings,
  getWebhookSettings,
  saveWebhookSettings,
  WebhookSettings,
  getMeilisearchSettings,
  saveMeilisearchSettings,
  MeilisearchSettings,
} from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save,
  Webhook,
  FileText,
  RefreshCw,
  ShoppingCart,
  Search,
  Database,
  MessageCircle,
  Bot,
  Store,
  Receipt,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdminEmail } from "@/lib/superadmin";

const Integracoes = forwardRef<HTMLDivElement>(function Integracoes(_, ref) {
  const { user } = useAuth();
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const [moloni, setMoloni] = useState({
    moloni_client_id: "",
    moloni_client_secret: "",
    moloni_api_key: "",
  });

  const [woocommerce, setWoocommerce] = useState({
    woo_url: "",
    woo_consumer_key: "",
    woo_consumer_secret: "",
  });

  const [chatwoot, setChatwoot] = useState({
    chatwoot_url: "",
    chatwoot_token: "",
  });

  const [typebot, setTypebot] = useState({
    typebot_url: "",
    typebot_token: "",
  });

  const [whatsapp, setWhatsapp] = useState({
    whatsapp_api_url: "",
  });

  const [webhooks, setWebhooks] = useState<WebhookSettings>({
    webhook_proposta_pdf: "",
    webhook_moloni_sync: "",
    webhook_woo_checkout: "",
  });

  const [meilisearch, setMeilisearch] = useState<MeilisearchSettings>({
    meilisearch_host: "",
    meilisearch_api_key: "",
    meilisearch_index: "products_stage",
  });

  const [testingMeilisearch, setTestingMeilisearch] = useState(false);

  useEffect(() => {
    if (settings) {
      setMoloni({
        moloni_client_id: settings.moloni_client_id || "",
        moloni_client_secret: settings.moloni_client_secret || "",
        moloni_api_key: settings.moloni_api_key || "",
      });
      setWoocommerce({
        woo_url: (settings as any).woo_url || "",
        woo_consumer_key: (settings as any).woo_consumer_key || "",
        woo_consumer_secret: (settings as any).woo_consumer_secret || "",
      });
      setChatwoot({
        chatwoot_url: (settings as any).chatwoot_url || "",
        chatwoot_token: (settings as any).chatwoot_token || "",
      });
      setTypebot({
        typebot_url: (settings as any).typebot_url || "",
        typebot_token: (settings as any).typebot_token || "",
      });
      setWhatsapp({
        whatsapp_api_url: (settings as any).whatsapp_api_url || "",
      });
    }
    setWebhooks(getWebhookSettings());
    setMeilisearch(getMeilisearchSettings());
  }, [settings]);

  const handleSaveMoloni = async () => {
    try {
      await updateSettings.mutateAsync(moloni);
      toast({ title: "Credenciais Moloni guardadas" });
    } catch (error) {
      toast({ title: "Erro ao guardar", variant: "destructive" });
    }
  };

  const handleSaveWoocommerce = async () => {
    try {
      await updateSettings.mutateAsync(woocommerce as any);
      toast({ title: "Credenciais WooCommerce guardadas" });
    } catch (error) {
      toast({ title: "Erro ao guardar", variant: "destructive" });
    }
  };

  const handleSaveChatwoot = async () => {
    try {
      await updateSettings.mutateAsync(chatwoot as any);
      toast({ title: "Credenciais Chatwoot guardadas" });
    } catch (error) {
      toast({ title: "Erro ao guardar", variant: "destructive" });
    }
  };

  const handleSaveTypebot = async () => {
    try {
      await updateSettings.mutateAsync(typebot as any);
      toast({ title: "Credenciais Typebot guardadas" });
    } catch (error) {
      toast({ title: "Erro ao guardar", variant: "destructive" });
    }
  };

  const handleSaveWhatsapp = async () => {
    try {
      await updateSettings.mutateAsync(whatsapp as any);
      toast({ title: "Configuração WhatsApp guardada" });
    } catch (error) {
      toast({ title: "Erro ao guardar", variant: "destructive" });
    }
  };

  const handleSaveWebhooks = () => {
    saveWebhookSettings(webhooks);
    toast({ title: "Webhooks guardados" });
  };

  const handleSaveMeilisearch = () => {
    saveMeilisearchSettings(meilisearch);
    toast({ title: "Configurações Meilisearch guardadas" });
  };

  const handleTestMeilisearch = async () => {
    if (!meilisearch.meilisearch_host) {
      toast({ title: "Configure o URL do Meilisearch", variant: "destructive" });
      return;
    }

    setTestingMeilisearch(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (meilisearch.meilisearch_api_key) {
        headers["Authorization"] = `Bearer ${meilisearch.meilisearch_api_key}`;
      }

      const response = await fetch(`${meilisearch.meilisearch_host}/health`, { headers });
      
      if (response.ok) {
        toast({ title: "Conexão Meilisearch OK", description: "Servidor a responder" });
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      toast({ 
        title: "Erro na conexão", 
        description: error instanceof Error ? error.message : "Verifique as configurações",
        variant: "destructive" 
      });
    } finally {
      setTestingMeilisearch(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          <p className="text-muted-foreground">Configure as ligações externas do sistema</p>
        </div>

        {!isSuperAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Acesso restrito</CardTitle>
              <CardDescription>
                Apenas o <strong>Superadmin</strong> pode alterar integrações. Os restantes utilizadores usam as integrações já configuradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Se precisares de alterações, pede ao Superadmin para atualizar esta página.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Moloni */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Moloni
              </CardTitle>
              <CardDescription>API de faturação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  value={moloni.moloni_client_id}
                  onChange={(e) => setMoloni((prev) => ({ ...prev, moloni_client_id: e.target.value }))}
                  placeholder="Client ID do Moloni"
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  value={moloni.moloni_client_secret}
                  onChange={(e) => setMoloni((prev) => ({ ...prev, moloni_client_secret: e.target.value }))}
                  placeholder="Client Secret"
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={moloni.moloni_api_key}
                  onChange={(e) => setMoloni((prev) => ({ ...prev, moloni_api_key: e.target.value }))}
                  placeholder="Chave API"
                />
              </div>
              <Button onClick={handleSaveMoloni} disabled={!isSuperAdmin || updateSettings.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </CardContent>
          </Card>

          {/* WooCommerce */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                WooCommerce
              </CardTitle>
              <CardDescription>Loja online</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL da Loja</Label>
                <Input
                  value={woocommerce.woo_url}
                  onChange={(e) => setWoocommerce((prev) => ({ ...prev, woo_url: e.target.value }))}
                  placeholder="https://loja.exemplo.pt"
                />
              </div>
              <div className="space-y-2">
                <Label>Consumer Key</Label>
                <Input
                  type="password"
                  value={woocommerce.woo_consumer_key}
                  onChange={(e) => setWoocommerce((prev) => ({ ...prev, woo_consumer_key: e.target.value }))}
                  placeholder="ck_..."
                />
              </div>
              <div className="space-y-2">
                <Label>Consumer Secret</Label>
                <Input
                  type="password"
                  value={woocommerce.woo_consumer_secret}
                  onChange={(e) => setWoocommerce((prev) => ({ ...prev, woo_consumer_secret: e.target.value }))}
                  placeholder="cs_..."
                />
              </div>
              <Button onClick={handleSaveWoocommerce} disabled={!isSuperAdmin || updateSettings.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </CardContent>
          </Card>

          {/* Chatwoot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chatwoot
              </CardTitle>
              <CardDescription>Central de mensagens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL da Instância</Label>
                <Input
                  value={chatwoot.chatwoot_url}
                  onChange={(e) => setChatwoot((prev) => ({ ...prev, chatwoot_url: e.target.value }))}
                  placeholder="https://app.chatwoot.com"
                />
              </div>
              <div className="space-y-2">
                <Label>API Token</Label>
                <Input
                  type="password"
                  value={chatwoot.chatwoot_token}
                  onChange={(e) => setChatwoot((prev) => ({ ...prev, chatwoot_token: e.target.value }))}
                  placeholder="Token de acesso"
                />
              </div>
              <Button onClick={handleSaveChatwoot} disabled={!isSuperAdmin || updateSettings.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </CardContent>
          </Card>

          {/* Typebot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Typebot
              </CardTitle>
              <CardDescription>Chatbot automático</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Bot</Label>
                <Input
                  value={typebot.typebot_url}
                  onChange={(e) => setTypebot((prev) => ({ ...prev, typebot_url: e.target.value }))}
                  placeholder="https://typebot.io/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Token</Label>
                <Input
                  type="password"
                  value={typebot.typebot_token}
                  onChange={(e) => setTypebot((prev) => ({ ...prev, typebot_token: e.target.value }))}
                  placeholder="Token de acesso"
                />
              </div>
              <Button onClick={handleSaveTypebot} disabled={!isSuperAdmin || updateSettings.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-success" />
                WhatsApp API
              </CardTitle>
              <CardDescription>Integração n8n/API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook n8n</Label>
                <Input
                  value={whatsapp.whatsapp_api_url}
                  onChange={(e) => setWhatsapp((prev) => ({ ...prev, whatsapp_api_url: e.target.value }))}
                  placeholder="https://n8n.../webhook/whatsapp"
                />
              </div>
              <Button onClick={handleSaveWhatsapp} disabled={!isSuperAdmin || updateSettings.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </CardContent>
          </Card>

          {/* Meilisearch */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Meilisearch
              </CardTitle>
              <CardDescription>Pesquisa de produtos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  URL do Servidor
                </Label>
                <Input
                  value={meilisearch.meilisearch_host || ""}
                  onChange={(e) => setMeilisearch((prev) => ({ ...prev, meilisearch_host: e.target.value }))}
                  placeholder="https://meilisearch.exemplo.pt"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Chave API</Label>
                  <Input
                    type="password"
                    value={meilisearch.meilisearch_api_key || ""}
                    onChange={(e) => setMeilisearch((prev) => ({ ...prev, meilisearch_api_key: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Índice</Label>
                  <Input
                    value={meilisearch.meilisearch_index || "products_stage"}
                    onChange={(e) => setMeilisearch((prev) => ({ ...prev, meilisearch_index: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestMeilisearch} disabled={testingMeilisearch} className="flex-1">
                  {testingMeilisearch ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}
                </Button>
                <Button onClick={handleSaveMeilisearch} className="flex-1" disabled={!isSuperAdmin}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Webhooks n8n */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks n8n
            </CardTitle>
            <CardDescription>URLs para automações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Gerar Proposta PDF
                </Label>
                <Input
                  value={webhooks.webhook_proposta_pdf || ""}
                  onChange={(e) => setWebhooks((prev) => ({ ...prev, webhook_proposta_pdf: e.target.value }))}
                  placeholder="https://n8n.../webhook/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar Moloni
                </Label>
                <Input
                  value={webhooks.webhook_moloni_sync || ""}
                  onChange={(e) => setWebhooks((prev) => ({ ...prev, webhook_moloni_sync: e.target.value }))}
                  placeholder="https://n8n.../webhook/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Checkout WooCommerce
                </Label>
                <Input
                  value={webhooks.webhook_woo_checkout || ""}
                  onChange={(e) => setWebhooks((prev) => ({ ...prev, webhook_woo_checkout: e.target.value }))}
                  placeholder="https://n8n.../webhook/..."
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveWebhooks} disabled={!isSuperAdmin}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Webhooks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
});

export default Integracoes;
