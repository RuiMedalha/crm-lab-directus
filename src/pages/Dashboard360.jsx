import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { directusRequest } from "@/integrations/directus/client";
import {
  ArrowLeft,
  Building2,
  Mail,
  MailCheck,
  MessageCircle,
  Phone,
  Save,
  Gift,
  Loader2,
  X,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Field mapping layer to avoid “Payload Invalid” errors due to key/case mismatches.
 *
 * - Frontend uses the existing CRM keys (ex: company_name, accept_newsletter, nif).
 * - Directus field keys may differ (ex: Nome vs nome). Configure via env:
 *   VITE_DIRECTUS_CONTACT_FIELD_MAP='{"company_name":"Nome","nif":"NIF"}'
 */
const DIRECTUS_CONTACT_FIELD_MAP = (() => {
  try {
    const raw = import.meta.env.VITE_DIRECTUS_CONTACT_FIELD_MAP;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

const DIRECTUS_CONTACTS_COLLECTION = import.meta.env.VITE_DIRECTUS_CONTACTS_COLLECTION || "contacts";

function mapToDirectusPayload(frontendPatch) {
  const payload = {};
  Object.entries(frontendPatch || {}).forEach(([k, v]) => {
    const directusKey = DIRECTUS_CONTACT_FIELD_MAP[k] || k;
    payload[directusKey] = v;
  });
  return payload;
}

function mapFromDirectusItem(item) {
  if (!item) return item;
  // If field map is identity, keep item as-is. If map is customized, remap back.
  const inverse = Object.entries(DIRECTUS_CONTACT_FIELD_MAP).reduce((acc, [fe, du]) => {
    acc[du] = fe;
    return acc;
  }, {});
  const out = { ...item };
  Object.keys(inverse).forEach((directusKey) => {
    if (directusKey in out) {
      const feKey = inverse[directusKey];
      out[feKey] = out[directusKey];
      if (feKey !== directusKey) delete out[directusKey];
    }
  });
  return out;
}

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function getContactById(id) {
  const res = await directusRequest(`/items/${DIRECTUS_CONTACTS_COLLECTION}/${encodeURIComponent(id)}${qs({ fields: "*" })}`);
  return mapFromDirectusItem(res?.data);
}

async function findDuplicateContact({ nif, phone }) {
  const cleanNif = (nif || "").trim();
  const cleanPhone = (phone || "").trim();

  // Prefer NIF (more reliable)
  if (cleanNif && cleanNif.length >= 9) {
    const nifKey = DIRECTUS_CONTACT_FIELD_MAP.nif || "nif";
    const res = await directusRequest(
      `/items/${DIRECTUS_CONTACTS_COLLECTION}${qs({
        limit: 1,
        // Use * because Directus field keys may be mapped (ex: nome/telefone)
        fields: "*",
        [`filter[${nifKey}][_eq]`]: cleanNif,
      })}`
    );
    const item = res?.data?.[0];
    return item ? mapFromDirectusItem(item) : null;
  }

  // Then by phone (phone OR whatsapp_number OR contact_phone)
  if (cleanPhone && cleanPhone.length >= 9) {
    const phoneKey = DIRECTUS_CONTACT_FIELD_MAP.phone || "phone";
    const waKey = DIRECTUS_CONTACT_FIELD_MAP.whatsapp_number || "whatsapp_number";
    const contactPhoneKey = DIRECTUS_CONTACT_FIELD_MAP.contact_phone || "contact_phone";
    const res = await directusRequest(
      `/items/${DIRECTUS_CONTACTS_COLLECTION}${qs({
        limit: 1,
        fields: "*",
        [`filter[_or][0][${phoneKey}][_eq]`]: cleanPhone,
        [`filter[_or][1][${waKey}][_eq]`]: cleanPhone,
        [`filter[_or][2][${contactPhoneKey}][_eq]`]: cleanPhone,
      })}`
    );
    const item = res?.data?.[0];
    return item ? mapFromDirectusItem(item) : null;
  }

  return null;
}

async function patchContact(id, patch) {
  const payload = mapToDirectusPayload(patch);
  const res = await directusRequest(`/items/${DIRECTUS_CONTACTS_COLLECTION}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapFromDirectusItem(res?.data);
}

async function createContact(payload) {
  const directusPayload = mapToDirectusPayload(payload);
  const res = await directusRequest(`/items/${DIRECTUS_CONTACTS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(directusPayload),
  });
  return mapFromDirectusItem(res?.data);
}

function NewsletterBannerDirectus({
  contactId,
  contactEmail,
  contactPhone,
  acceptNewsletter,
  newsletterWelcomeSent,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleSubscribe = async () => {
    if (!contactEmail && !contactPhone) {
      toast({
        title: "Sem contacto disponível",
        description: "O cliente precisa ter email ou telefone para subscrever.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await patchContact(contactId, { accept_newsletter: true });
      onUpdate(true, false);
      toast({
        title: "Cliente subscrito!",
        description: "O email de boas-vindas pode ser enviado via automação (n8n).",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao subscrever", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (acceptNewsletter) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span className="text-sm">Subscrito à Newsletter</span>
        </div>
        {newsletterWelcomeSent && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <MailCheck className="h-3 w-3 mr-1" />
            Email de Boas-Vindas Enviado
          </Badge>
        )}
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-2 border-dashed",
        "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30",
        "border-orange-300 dark:border-orange-700"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-orange-500/20">
            <Gift className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Cliente não subscrito à Newsletter</p>
            <p className="text-xs text-muted-foreground">Ofereça 5% de desconto na primeira compra!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Mail className="h-4 w-4 mr-1" />
            )}
            Subscrever
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard360() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!!id);
  const [contact, setContact] = useState(null);
  const [formData, setFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const contactId = useMemo(() => (contact?.id ? String(contact.id) : id ? String(id) : null), [contact, id]);

  // Prefill from lead popup / leads inbox
  useEffect(() => {
    if (id) return; // edit mode: do not overwrite loaded contact

    const phone = searchParams.get("phone");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const nif = searchParams.get("nif");
    const source = searchParams.get("source");

    if (!phone && !email && !name && !nif) return;

    setFormData((prev) => ({
      ...prev,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(name ? { contact_name: name, company_name: prev.company_name || name } : {}),
      ...(nif ? { nif } : {}),
      ...(source ? { source } : {}),
    }));
    setHasChanges(true);
  }, [id, searchParams]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getContactById(id);
        if (!active) return;
        setContact(data);
      } catch (e) {
        console.error(e);
        toast({ title: "Erro ao carregar contacto", variant: "destructive" });
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const getValue = (field) => {
    return formData[field] ?? contact?.[field] ?? "";
  };

  const handleSave = async () => {
    // Incremental scope: ficha de cliente + newsletter (contacts collection)
    const patch = { ...formData };
    if (!Object.keys(patch).length) return;

    setSaving(true);
    try {
      // If we don't have an ID (create mode), do dedupe first
      let targetId = contactId;
      if (!targetId) {
        const duplicate = await findDuplicateContact({ nif: patch.nif, phone: patch.phone });
        if (duplicate?.id) {
          targetId = String(duplicate.id);
        }
      }

      const saved = targetId
        ? await patchContact(targetId, patch)
        : await createContact({
            ...patch,
            // keep UX consistent with previous system defaults
            accept_newsletter: patch.accept_newsletter ?? false,
          });

      setContact(saved);
      setFormData({});
      setHasChanges(false);
      toast({ title: targetId ? "Contacto atualizado com sucesso" : "Contacto criado com sucesso" });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao guardar contacto", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (id && !contact) {
    return (
      <AppLayout>
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">Contacto não encontrado no Directus</p>
          <Button variant="outline" onClick={() => navigate("/contactos")}>
            Voltar aos contactos
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{contact?.company_name || getValue("company_name") || "Dashboard 360"}</h1>
              <p className="text-muted-foreground">{contact?.contact_name || getValue("contact_name") || "Ficha de Cliente (Directus)"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(contact?.phone || getValue("phone")) && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${contact?.phone || getValue("phone")}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </a>
              </Button>
            )}
            {(contact?.email || getValue("email")) && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${contact?.email || getValue("email")}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </a>
              </Button>
            )}
            {(contact?.whatsapp_number || getValue("whatsapp_number")) && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://wa.me/${String(contact?.whatsapp_number || getValue("whatsapp_number")).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            )}

            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Ficha de Cliente
            </CardTitle>
            <CardDescription>
              NIF: {contact?.nif || getValue("nif") || "-"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="geral" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="contactos" className="text-xs">
                  <Phone className="h-3 w-3 mr-1" />
                  Contactos
                </TabsTrigger>
                <TabsTrigger value="morada" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Morada
                </TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4 mt-4">
                {contactId && (
                  <NewsletterBannerDirectus
                    contactId={contactId}
                    contactEmail={contact?.email || getValue("email") || null}
                    contactPhone={contact?.phone || getValue("phone") || null}
                    acceptNewsletter={!!(contact?.accept_newsletter ?? getValue("accept_newsletter"))}
                    newsletterWelcomeSent={!!(contact?.newsletter_welcome_sent ?? getValue("newsletter_welcome_sent"))}
                    onUpdate={(accept, sent) => {
                      // keep immediate UX feedback (and allow saving later if needed)
                      setContact((prev) => ({ ...(prev || {}), accept_newsletter: accept, newsletter_welcome_sent: sent }));
                      handleChange("accept_newsletter", accept);
                    }}
                  />
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_name">Nome da Empresa *</Label>
                    <Input
                      id="company_name"
                      value={getValue("company_name")}
                      onChange={(e) => handleChange("company_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Nome do Contacto</Label>
                    <Input
                      id="contact_name"
                      value={getValue("contact_name")}
                      onChange={(e) => handleChange("contact_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nif">Contribuinte (NIF)</Label>
                    <Input id="nif" value={getValue("nif")} onChange={(e) => handleChange("nif", e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={getValue("website")}
                      onChange={(e) => handleChange("website", e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contactos" className="space-y-4 mt-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone Principal</Label>
                    <Input
                      id="phone"
                      value={getValue("phone")}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+351 XXX XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Principal</Label>
                    <Input
                      id="email"
                      type="email"
                      value={getValue("email")}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_number">WhatsApp</Label>
                    <Input
                      id="whatsapp_number"
                      value={getValue("whatsapp_number")}
                      onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                      placeholder="+351..."
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="morada" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Morada Principal</Label>
                  <Input id="address" value={getValue("address")} onChange={(e) => handleChange("address", e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input
                      id="postal_code"
                      value={getValue("postal_code")}
                      onChange={(e) => handleChange("postal_code", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Localidade</Label>
                    <Input id="city" value={getValue("city")} onChange={(e) => handleChange("city", e.target.value)} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Directus mapping debug hint (safe, no token) */}
        {Object.keys(DIRECTUS_CONTACT_FIELD_MAP).length > 0 && (
          <p className="text-xs text-muted-foreground">
            Directus field-map ativo (para respeitar capitalização/keys).
          </p>
        )}
      </div>
    </AppLayout>
  );
}

