import { useState, useEffect, useRef } from "react";
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
import { DIRECTUS_TOKEN, DIRECTUS_URL } from "@/integrations/directus/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Building2, Webhook, FileText, RefreshCw, ShoppingCart, Search, Database, Copy, ArrowDownToLine, MessageCircle, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Definicoes() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyData, setCompanyData] = useState({
    name: "",
    vat_number: "",
    phone: "",
    email: "",
    logo_url: "",
  });

  const [uploading, setUploading] = useState(false);

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

  const [integrations, setIntegrations] = useState({
    chatwoot_url: "",
    chatwoot_token: "",
    whatsapp_api_url: "",
    typebot_url: "",
    typebot_token: "",
  });

  useEffect(() => {
    if (settings) {
      setCompanyData({
        name: settings.name || "",
        vat_number: settings.vat_number || "",
        phone: settings.phone || "",
        email: settings.email || "",
        logo_url: settings.logo_url || "",
      });
      setIntegrations({
        chatwoot_url: settings.chatwoot_url || "",
        chatwoot_token: settings.chatwoot_token || "",
        whatsapp_api_url: settings.whatsapp_api_url || "",
        typebot_url: settings.typebot_url || "",
        typebot_token: settings.typebot_token || "",
      });
    }
    setWebhooks(getWebhookSettings());
    setMeilisearch(getMeilisearchSettings());
  }, [settings]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Por favor selecione uma imagem", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "A imagem deve ter menos de 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      if (!DIRECTUS_TOKEN) {
        throw new Error("Missing Directus token (VITE_DIRECTUS_TOKEN).");
      }

      const fd = new FormData();
      fd.append("file", file, file.name);

      const res = await fetch(`${DIRECTUS_URL.replace(/\/+$/, "")}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
        body: fd,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json?.errors?.[0]?.message ||
          json?.message ||
          json?.error ||
          `Upload failed (${res.status})`;
        throw new Error(msg);
      }

      const fileId = json?.data?.id;
      if (!fileId) throw new Error("Upload completed but file id missing.");

      const assetUrl = `${DIRECTUS_URL.replace(/\/+$/, "")}/assets/${encodeURIComponent(String(fileId))}`;

      // Update company settings with new logo URL
      await updateSettings.mutateAsync({ logo_url: assetUrl });
      setCompanyData(prev => ({ ...prev, logo_url: assetUrl }));

      toast({ title: "Logótipo carregado com sucesso" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Erro ao carregar logótipo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await updateSettings.mutateAsync({ logo_url: null });
      setCompanyData(prev => ({ ...prev, logo_url: "" }));
      toast({ title: "Logótipo removido" });
    } catch (error) {
      toast({ title: "Erro ao remover logótipo", variant: "destructive" });
    }
  };

  const handleSaveCompany = async () => {
    try {
      const { logo_url, ...dataToSave } = companyData;
      await updateSettings.mutateAsync(dataToSave);
      toast({ title: "Definições da empresa guardadas" });
    } catch (error) {
      toast({ title: "Erro ao guardar definições", variant: "destructive" });
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

  const handleSaveIntegrations = async () => {
    try {
      await updateSettings.mutateAsync(integrations);
      toast({ title: "Integrações guardadas" });
    } catch (error) {
      toast({ title: "Erro ao guardar integrações", variant: "destructive" });
    }
  };

  const handleTestMeilisearch = async () => {
    if (!meilisearch.meilisearch_host) {
      toast({ title: "Configure o URL do Meilisearch", variant: "destructive" });
      return;
    }

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (meilisearch.meilisearch_api_key) {
        headers["Authorization"] = `Bearer ${meilisearch.meilisearch_api_key}`;
      }

      const response = await fetch(`${meilisearch.meilisearch_host}/health`, { headers });
      
      if (response.ok) {
        toast({ title: "Conexão Meilisearch OK", description: "Servidor a responder corretamente" });
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      toast({ 
        title: "Erro na conexão Meilisearch", 
        description: error instanceof Error ? error.message : "Verifique as configurações",
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Definições</h1>
          <p className="text-muted-foreground">Configurações do sistema</p>
        </div>

        {/* Company Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>
              Informações gerais da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Logótipo da Empresa
              </Label>
              <div className="flex items-start gap-4">
                {/* Logo Preview */}
                <div className="shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center overflow-hidden">
                  {companyData.logo_url ? (
                    <img 
                      src={companyData.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-1 opacity-50" />
                      <span className="text-xs">Sem logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          A carregar...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Carregar Logo
                        </>
                      )}
                    </Button>
                    {companyData.logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formatos suportados: JPG, PNG, SVG, WebP. Tamanho máximo: 2MB
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome</Label>
                <Input
                  id="company_name"
                  value={companyData.name}
                  onChange={(e) =>
                    setCompanyData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat_number">Contribuinte (NIF)</Label>
                <Input
                  id="vat_number"
                  value={companyData.vat_number}
                  onChange={(e) =>
                    setCompanyData((prev) => ({ ...prev, vat_number: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_phone">Telemóvel</Label>
                <Input
                  id="company_phone"
                  value={companyData.phone}
                  onChange={(e) =>
                    setCompanyData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email">Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={companyData.email}
                  onChange={(e) =>
                    setCompanyData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveCompany} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Meilisearch Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Meilisearch
            </CardTitle>
            <CardDescription>
              Configuração da pesquisa de produtos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meili_host" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                URL do Servidor
              </Label>
              <Input
                id="meili_host"
                value={meilisearch.meilisearch_host || ""}
                onChange={(e) =>
                  setMeilisearch((prev) => ({ ...prev, meilisearch_host: e.target.value }))
                }
                placeholder="https://meilisearch.seudominio.com"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meili_key">Chave API (opcional)</Label>
                <Input
                  id="meili_key"
                  type="password"
                  value={meilisearch.meilisearch_api_key || ""}
                  onChange={(e) =>
                    setMeilisearch((prev) => ({ ...prev, meilisearch_api_key: e.target.value }))
                  }
                  placeholder="Chave de pesquisa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meili_index">Índice</Label>
                <Input
                  id="meili_index"
                  value={meilisearch.meilisearch_index || "products_stage"}
                  onChange={(e) =>
                    setMeilisearch((prev) => ({ ...prev, meilisearch_index: e.target.value }))
                  }
                  placeholder="products_stage"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleTestMeilisearch}>
                Testar Conexão
              </Button>
              <Button onClick={handleSaveMeilisearch}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhooks Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Integrações n8n
            </CardTitle>
            <CardDescription>
              Configure os URLs dos webhooks para integrações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook_pdf" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Webhook Gerar Proposta PDF
              </Label>
              <Input
                id="webhook_pdf"
                value={webhooks.webhook_proposta_pdf || ""}
                onChange={(e) =>
                  setWebhooks((prev) => ({ ...prev, webhook_proposta_pdf: e.target.value }))
                }
                placeholder="https://n8n.seudominio.com/webhook/..."
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="webhook_moloni" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Webhook Sincronizar Moloni
              </Label>
              <Input
                id="webhook_moloni"
                value={webhooks.webhook_moloni_sync || ""}
                onChange={(e) =>
                  setWebhooks((prev) => ({ ...prev, webhook_moloni_sync: e.target.value }))
                }
                placeholder="https://n8n.seudominio.com/webhook/..."
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="webhook_woo" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Webhook Checkout WooCommerce
              </Label>
              <Input
                id="webhook_woo"
                value={webhooks.webhook_woo_checkout || ""}
                onChange={(e) =>
                  setWebhooks((prev) => ({ ...prev, webhook_woo_checkout: e.target.value }))
                }
                placeholder="https://n8n.seudominio.com/webhook/..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveWebhooks}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Webhooks
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inbound Webhooks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Webhooks de Entrada (Leads)
            </CardTitle>
            <CardDescription>
              URL para receber leads de sistemas externos (n8n, WhatsApp, Typebot)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                URL do Webhook
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${DIRECTUS_URL.replace(/\/+$/, "")}/items/leads`}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${DIRECTUS_URL.replace(/\/+$/, "")}/items/leads`);
                    toast({ title: "URL copiado" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use este URL no n8n/Typebot/Chatwoot com header <code>Authorization: Bearer TOKEN</code> para criar leads.
              </p>
            </div>

            <Separator />

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Exemplo de Payload (POST):</p>
              <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "phone": "+351912345678",
  "name": "João Silva",
  "source": "whatsapp",
  "notes": "Interessado em equipamento"
}`}
              </pre>
              <p className="text-xs text-muted-foreground">
                Sources válidos: whatsapp, typebot, n8n, chatwoot, web, email, phone
              </p>
            </div>
          </CardContent>
        </Card>

        {/* External Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Integrações Externas
            </CardTitle>
            <CardDescription>
              Configurações de Chatwoot, WhatsApp e Typebot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chatwoot URL</Label>
                <Input
                  value={integrations.chatwoot_url}
                  onChange={(e) => setIntegrations(prev => ({ ...prev, chatwoot_url: e.target.value }))}
                  placeholder="https://app.chatwoot.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Chatwoot Token</Label>
                <Input
                  type="password"
                  value={integrations.chatwoot_token}
                  onChange={(e) => setIntegrations(prev => ({ ...prev, chatwoot_token: e.target.value }))}
                  placeholder="Token de acesso"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp API URL</Label>
                <Input
                  value={integrations.whatsapp_api_url}
                  onChange={(e) => setIntegrations(prev => ({ ...prev, whatsapp_api_url: e.target.value }))}
                  placeholder="https://api.whatsapp.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Typebot URL</Label>
                <Input
                  value={integrations.typebot_url}
                  onChange={(e) => setIntegrations(prev => ({ ...prev, typebot_url: e.target.value }))}
                  placeholder="https://typebot.io"
                />
              </div>
              <div className="space-y-2">
                <Label>Typebot Token</Label>
                <Input
                  type="password"
                  value={integrations.typebot_token}
                  onChange={(e) => setIntegrations(prev => ({ ...prev, typebot_token: e.target.value }))}
                  placeholder="Token de acesso"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveIntegrations} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Integrações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
