import { useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createContact,
  findDuplicateContact,
  getContactById,
  patchContact,
} from "@/integrations/directus/contacts";
import { createLead, patchLead } from "@/integrations/directus/leads";
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
  StickyNote,
  Truck,
  ShoppingCart,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function NewsletterBannerDirectus({
  contactId,
  contactEmail,
  contactPhone,
  acceptNewsletter,
  newsletterWelcomeSent,
  newsletterConsentAt,
  newsletterUnsubscribedAt,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const CONSENT_VERSION = import.meta.env.VITE_NEWSLETTER_CONSENT_VERSION || "v1";

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
      const now = new Date().toISOString();
      await patchContact(contactId, {
        accept_newsletter: true,
        newsletter_unsubscribed_at: null,
        newsletter_consent_at: now,
        newsletter_consent_source: "card360_manual",
        newsletter_consent_user_agent: navigator.userAgent || null,
        newsletter_consent_version: CONSENT_VERSION,
      });
      onUpdate(true, false, now, null);
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

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await patchContact(contactId, {
        accept_newsletter: false,
        newsletter_unsubscribed_at: now,
      });
      onUpdate(false, newsletterWelcomeSent, newsletterConsentAt || null, now);
      toast({ title: "Consentimento removido (RGPD)" });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao remover consentimento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (acceptNewsletter) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <div>Subscrito à Newsletter</div>
            <div className="text-xs text-muted-foreground">
              {newsletterUnsubscribedAt
                ? `Revogado em ${new Date(newsletterUnsubscribedAt).toLocaleString("pt-PT")}`
                : newsletterConsentAt
                  ? `Consentimento em ${new Date(newsletterConsentAt).toLocaleString("pt-PT")}`
                  : "Consentimento registado"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {newsletterWelcomeSent && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <MailCheck className="h-3 w-3 mr-1" />
              Email de Boas-Vindas Enviado
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnsubscribe}
            disabled={loading}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            title="Remover consentimento (RGPD)"
          >
            Remover
          </Button>
        </div>
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
  const [savingLead, setSavingLead] = useState(false);
  const [skuInput, setSkuInput] = useState("");

  const contactId = useMemo(() => (contact?.id ? String(contact.id) : id ? String(id) : null), [contact, id]);
  const resolvedExistingRef = useRef(false);

  // If we arrive with identity params (phone/email/nif) and a contact already exists in Directus,
  // redirect to the existing Card360 instead of creating a duplicate.
  useEffect(() => {
    if (id) return;
    if (resolvedExistingRef.current) return;

    const phone = searchParams.get("phone");
    const email = searchParams.get("email");
    const nif = searchParams.get("nif");
    const leadId = searchParams.get("leadId");

    if (!phone && !email && !nif) return;

    resolvedExistingRef.current = true;
    (async () => {
      const existing = await findDuplicateContact({
        nif: nif || null,
        phone: phone || null,
        email: email || null,
      }).catch(() => null);

      if (existing?.id) {
        const sp = new URLSearchParams();
        if (leadId) sp.set("leadId", leadId);
        navigate(`/dashboard360/${encodeURIComponent(String(existing.id))}${sp.toString() ? `?${sp.toString()}` : ""}`, {
          replace: true,
        });
      }
    })();
  }, [id, navigate, searchParams]);

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

  const leadId = searchParams.get("leadId");

  const buildCardSnapshot = () => {
    // Merge current saved contact + pending form edits
    return { ...(contact || {}), ...(formData || {}) };
  };

  const handleSaveContact = async () => {
    // Incremental scope: ficha de cliente + newsletter (contacts collection)
    const patch = { ...formData };
    if (!Object.keys(patch).length) return;

    setSaving(true);
    try {
      // If we don't have an ID (create mode), do dedupe first
      let targetId = contactId;
      if (!targetId) {
        const duplicate = await findDuplicateContact({ nif: patch.nif, phone: patch.phone, email: patch.email });
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

      // If we came from a lead, link it to the created/updated contact and mark it processed
      if (leadId && saved?.id) {
        await patchLead(String(leadId), {
          contact_id: String(saved.id),
          status: "processed",
        }).catch(() => undefined);
      }

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

  const handleSaveLead = async () => {
    const snapshot = buildCardSnapshot();
    const phone = snapshot.phone || null;
    const email = snapshot.email || null;
    const nif = snapshot.nif || null;
    const display_name =
      snapshot.company_name || snapshot.contact_name || snapshot.display_name || phone || email || "Lead";
    const source = snapshot.source || searchParams.get("source") || "phone";

    setSavingLead(true);
    try {
      if (leadId) {
        await patchLead(String(leadId), {
          status: "open",
          source: String(source),
          phone,
          email,
          nif,
          display_name: String(display_name),
          lead_data: snapshot,
          notes: snapshot.notes || null,
        });
      } else {
        await createLead({
          status: "open",
          source: String(source),
          phone,
          email,
          nif,
          display_name: String(display_name),
          lead_data: snapshot,
          notes: snapshot.notes || null,
        });
      }

      setFormData({});
      setHasChanges(false);
      toast({ title: "Lead guardado no Directus" });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao guardar lead", variant: "destructive" });
    } finally {
      setSavingLead(false);
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
            <Button size="sm" variant="outline" onClick={handleSaveLead} disabled={!hasChanges || savingLead}>
              {savingLead ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Lead
            </Button>
            <Button size="sm" onClick={handleSaveContact} disabled={!hasChanges || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Contacto
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
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="geral" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="altlog" className="text-xs">
                  <Truck className="h-3 w-3 mr-1" />
                  Moradas & Logística
                </TabsTrigger>
                <TabsTrigger value="comercial" className="text-xs">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Comercial
                </TabsTrigger>
                <TabsTrigger value="notas" className="text-xs">
                  <StickyNote className="h-3 w-3 mr-1" />
                  Notas
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
                    newsletterConsentAt={contact?.newsletter_consent_at ?? getValue("newsletter_consent_at") ?? null}
                    newsletterUnsubscribedAt={contact?.newsletter_unsubscribed_at ?? getValue("newsletter_unsubscribed_at") ?? null}
                    onUpdate={(accept, sent, consentAt, unsubAt) => {
                      // keep immediate UX feedback (and allow saving later if needed)
                      setContact((prev) => ({
                        ...(prev || {}),
                        accept_newsletter: accept,
                        newsletter_welcome_sent: sent,
                        newsletter_consent_at: consentAt ?? (prev || {}).newsletter_consent_at,
                        newsletter_unsubscribed_at: unsubAt ?? (prev || {}).newsletter_unsubscribed_at,
                      }));
                      handleChange("accept_newsletter", accept);
                    }}
                  />
                )}

                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
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

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={getValue("phone")}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          placeholder="+351..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={getValue("email")}
                          onChange={(e) => handleChange("email", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="whatsapp_number">WhatsApp</Label>
                        <Input
                          id="whatsapp_number"
                          value={getValue("whatsapp_number")}
                          onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                          placeholder="+351..."
                        />
                      </div>

                      <Separator className="sm:col-span-2" />

                      <div className="space-y-2">
                        <Label htmlFor="contact_person">Contacto Secundário - Nome</Label>
                        <Input
                          id="contact_person"
                          value={getValue("contact_person")}
                          onChange={(e) => handleChange("contact_person", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">Contacto Secundário - Telefone</Label>
                        <Input
                          id="contact_phone"
                          value={getValue("contact_phone")}
                          onChange={(e) => handleChange("contact_phone", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="contact_email">Contacto Secundário - Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          value={getValue("contact_email")}
                          onChange={(e) => handleChange("contact_email", e.target.value)}
                        />
                      </div>

                      <Separator className="sm:col-span-2" />

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="address">Morada Principal</Label>
                        <Input
                          id="address"
                          value={getValue("address")}
                          onChange={(e) => handleChange("address", e.target.value)}
                        />
                      </div>
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

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={getValue("website")}
                          onChange={(e) => handleChange("website", e.target.value)}
                          placeholder="https://"
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                        <Input
                          id="tags"
                          value={(() => {
                            const v = getValue("tags");
                            if (Array.isArray(v)) return v.join(", ");
                            if (typeof v === "string") return v;
                            return "";
                          })()}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const tags = raw
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            handleChange("tags", tags);
                          }}
                          placeholder="ex: hotel, restaurante, revenda"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1 space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <StickyNote className="h-4 w-4" />
                        Nota rápida (sincroniza com a aba Notas)
                      </div>
                      <Textarea
                        value={getValue("notes")}
                        onChange={(e) => handleChange("notes", e.target.value)}
                        rows={6}
                        placeholder="Escreva aqui e aparecerá também na aba Notas…"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="altlog" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Moradas alternativas (entrega)</h3>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const current = getValue("delivery_addresses");
                        const list = Array.isArray(current) ? [...current] : [];
                        list.push({ label: "", address: "", postal_code: "", city: "", receiver_name: "", receiver_phone: "" });
                        handleChange("delivery_addresses", list);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {(() => {
                    const current = getValue("delivery_addresses");
                    const list = Array.isArray(current) ? current : [];
                    if (list.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground text-center py-6 rounded-lg border bg-muted/20">
                          Sem moradas alternativas.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {list.map((addr, idx) => (
                          <div key={idx} className="p-3 rounded-lg border bg-muted/20 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">Morada #{idx + 1}</div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  const next = [...list];
                                  next.splice(idx, 1);
                                  handleChange("delivery_addresses", next);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Nome/Label</Label>
                                <Input
                                  value={addr?.label || ""}
                                  onChange={(e) => {
                                    const next = [...list];
                                    next[idx] = { ...(next[idx] || {}), label: e.target.value };
                                    handleChange("delivery_addresses", next);
                                  }}
                                  placeholder="ex: Entrega Obra, Armazém, etc."
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Morada</Label>
                                <Input
                                  value={addr?.address || ""}
                                  onChange={(e) => {
                                    const next = [...list];
                                    next[idx] = { ...(next[idx] || {}), address: e.target.value };
                                    handleChange("delivery_addresses", next);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Código Postal</Label>
                                <Input
                                  value={addr?.postal_code || ""}
                                  onChange={(e) => {
                                    const next = [...list];
                                    next[idx] = { ...(next[idx] || {}), postal_code: e.target.value };
                                    handleChange("delivery_addresses", next);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Localidade</Label>
                                <Input
                                  value={addr?.city || ""}
                                  onChange={(e) => {
                                    const next = [...list];
                                    next[idx] = { ...(next[idx] || {}), city: e.target.value };
                                    handleChange("delivery_addresses", next);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Quem recebe - Nome</Label>
                                <Input
                                  value={addr?.receiver_name || ""}
                                  onChange={(e) => {
                                    const next = [...list];
                                    next[idx] = { ...(next[idx] || {}), receiver_name: e.target.value };
                                    handleChange("delivery_addresses", next);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Quem recebe - Telefone</Label>
                                <Input
                                  value={addr?.receiver_phone || ""}
                                  onChange={(e) => {
                                    const next = [...list];
                                    next[idx] = { ...(next[idx] || {}), receiver_phone: e.target.value };
                                    handleChange("delivery_addresses", next);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Logística</h3>
                  </div>
                  <Textarea
                    value={getValue("logistics_notes")}
                    onChange={(e) => handleChange("logistics_notes", e.target.value)}
                    rows={6}
                    placeholder="Instruções de entrega, horários, acessos, restrições, etc."
                  />
                  <p className="text-xs text-muted-foreground">
                    Nota: estes campos começam a gravar assim que existirem no Directus (não quebra se ainda não estiverem criados).
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="comercial" className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Produtos (SKU)</h3>
                  </div>

                  {(() => {
                    const current = getValue("sku_history");
                    const list = Array.isArray(current) ? current : [];

                    return (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={skuInput}
                            onChange={(e) => setSkuInput(e.target.value)}
                            placeholder="Introduzir SKU manualmente (ex: HE-1234)"
                          />
                          <Button
                            onClick={() => {
                              const clean = String(skuInput || "").trim();
                              if (!clean) return;
                              const next = [clean, ...list].filter((x, i, a) => a.indexOf(x) === i);
                              handleChange("sku_history", next);
                              setSkuInput("");
                            }}
                          >
                            Adicionar
                          </Button>
                        </div>

                        {list.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-6 rounded-lg border bg-muted/20">
                            Sem SKUs guardados.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {list.slice(0, 50).map((s) => (
                              <Badge key={s} variant="secondary" className="font-mono">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Depois ligamos aqui a pesquisa (Meilisearch/WooCommerce) e o envio por email/WhatsApp.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Campo livre (Comercial)</Label>
                  <Textarea
                    value={getValue("commercial_notes")}
                    onChange={(e) => handleChange("commercial_notes", e.target.value)}
                    rows={6}
                    placeholder="Observações comerciais, propostas, condições, links, etc."
                  />
                  <p className="text-xs text-muted-foreground">
                    Nota: ao criares o campo `commercial_notes` no Directus, começa a guardar automaticamente.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="notas" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Notas (cliente/lead)</Label>
                  <Textarea
                    value={getValue("notes")}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={10}
                    placeholder="Tudo o que quiseres registar sobre o cliente/lead…"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas internas</Label>
                  <Textarea
                    value={getValue("internal_notes")}
                    onChange={(e) => handleChange("internal_notes", e.target.value)}
                    rows={6}
                    placeholder="Notas internas (equipa) – opcional."
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

