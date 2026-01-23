import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, UserPlus, Mail, Phone, Ticket, Calendar } from "lucide-react";
import {
  getNewsletterSubscriptionById,
  patchNewsletterSubscription,
  type NewsletterSubscription,
} from "@/integrations/directus/newsletter-subscriptions";
import { createContact, findDuplicateContact, patchContact } from "@/integrations/directus/contacts";
import { upsertIdentityMap } from "@/integrations/directus/newsletter-identity-map";

export default function Newsletter360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<Partial<NewsletterSubscription>>({});

  const query = useQuery({
    queryKey: ["newsletter_subscriptions", "one", id],
    queryFn: async () => {
      if (!id) return null;
      return await getNewsletterSubscriptionById(id);
    },
    enabled: !!id,
  });

  const sub = query.data as NewsletterSubscription | null;

  const displayName = useMemo(() => {
    if (!sub) return "Newsletter";
    return sub.full_name || sub.email || sub.phone || String(sub.id);
  }, [sub]);

  const getValue = (k: keyof NewsletterSubscription) => {
    return (form as any)[k] ?? (sub as any)?.[k] ?? "";
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("ID em falta");
      return await patchNewsletterSubscription(id, form);
    },
    onSuccess: () => {
      toast({ title: "Newsletter atualizada" });
      setForm({});
      qc.invalidateQueries({ queryKey: ["newsletter_subscriptions"] });
      qc.invalidateQueries({ queryKey: ["newsletter_subscriptions", "one", id] });
    },
    onError: (e: any) => toast({ title: e?.message || "Erro ao guardar", variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!sub) throw new Error("Registo não carregado");

      const email = sub.email ? String(sub.email) : null;
      const phone = sub.phone ? String(sub.phone) : null;
      const full_name = sub.full_name ? String(sub.full_name) : sub.firstname || sub.lastname ? `${sub.firstname || ""} ${sub.lastname || ""}`.trim() : null;
      const now = new Date().toISOString();

      // If a contact already exists, do not create duplicates (email/phone matching).
      const dup = await findDuplicateContact({ email, phone, nif: null }).catch(() => null);
      if (dup?.id) {
        // Ensure newsletter fields are mirrored into the existing contact
        await patchContact(String(dup.id), {
          source: "newsletter",
          accept_newsletter: true,
          newsletter_consent_at: sub.created_at || now,
          newsletter_consent_source: sub.source || "newsletter",
          subscribed_at: sub.created_at || null,
          firstname: sub.firstname || null,
          lastname: sub.lastname || null,
          full_name: full_name || null,
          whatsapp_opt_in: !!sub.whatsapp_opt_in,
          status: sub.status || "active",
          created_at: sub.created_at || null,
          last_seen_at: sub.last_seen_at || null,
          coupon_code: sub.coupon_code || null,
          coupon_wc_id: sub.coupon_wc_id ?? null,
          coupon_expires_at: sub.coupon_expires_at || null,
          newsletter_notes: [
            sub.notes || "",
            `Ligado via Newsletter (subscription #${String(sub.id)}) em ${now}`,
          ].filter(Boolean).join("\n"),
        }).catch(() => undefined);

        // Best-effort: link identity_map (do not block conversion if it fails)
        await upsertIdentityMap({
          email: email || undefined,
          phone: phone || undefined,
          directus_contact_id: String(dup.id),
          subscription_id: String(sub.id),
          matched_by: email && phone ? "both" : email ? "email" : "phone",
          confidence: email && phone ? 90 : email ? 80 : 70,
          last_verified_at: now,
        }).catch(() => undefined);

        // Also stamp the ledger note (best-effort)
        await patchNewsletterSubscription(String(sub.id), {
          notes: [
            sub.notes || "",
            `Ligado ao contacto ${String(dup.id)} em ${now}`,
          ].filter(Boolean).join("\n"),
        }).catch(() => undefined);

        return { contactId: String(dup.id), existed: true };
      }

      const created = await createContact({
        company_name: full_name || email || phone || "Newsletter",
        contact_name: full_name || null,
        firstname: sub.firstname || null,
        lastname: sub.lastname || null,
        full_name: full_name || null,
        email,
        phone,
        whatsapp_opt_in: !!sub.whatsapp_opt_in,
        // Mark origin clearly
        source: "newsletter",
        newsletter_source: sub.source || "newsletter",
        accept_newsletter: true,
        newsletter_consent_at: sub.created_at || now,
        newsletter_consent_source: sub.source || "newsletter",
        status: sub.status || "active",
        created_at: sub.created_at || null,
        last_seen_at: sub.last_seen_at || null,
        coupon_code: sub.coupon_code || null,
        coupon_wc_id: sub.coupon_wc_id ?? null,
        coupon_expires_at: sub.coupon_expires_at || null,
        subscribed_at: sub.created_at || null,
        newsletter_notes: [
          sub.notes || "",
          `Criado a partir da Newsletter (subscription #${String(sub.id)}) em ${now}`,
        ].filter(Boolean).join("\n"),
      });

      // Best-effort mapping (do not block conversion if identity_map schema is wrong)
      await upsertIdentityMap({
        email: email || undefined,
        phone: phone || undefined,
        directus_contact_id: String(created.id),
        subscription_id: String(sub.id),
        matched_by: email && phone ? "both" : email ? "email" : "phone",
        confidence: email && phone ? 90 : email ? 80 : 70,
        last_verified_at: now,
      }).catch(() => undefined);

      await patchNewsletterSubscription(String(sub.id), {
        notes: [
          sub.notes || "",
          `Convertido para contacto ${String(created.id)} em ${now}`,
        ].filter(Boolean).join("\n"),
      }).catch(() => undefined);

      return { contactId: String(created.id), existed: false };
    },
    onSuccess: (r: any) => {
      toast({ title: r?.existed ? "Ligado a contacto existente" : "Contacto criado" });
      if (r?.contactId) navigate(`/dashboard360/${encodeURIComponent(String(r.contactId))}`);
    },
    onError: (e: any) => toast({ title: e?.message || "Erro ao converter", variant: "destructive" }),
  });

  if (query.isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!sub) {
    return (
      <AppLayout>
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">Registo de newsletter não encontrado</p>
          <Button variant="outline" onClick={() => navigate("/newsletter")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const expires = sub.coupon_expires_at ? new Date(String(sub.coupon_expires_at)).toLocaleDateString("pt-PT") : "—";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground">Ficha Newsletter (ledger)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              title="Criar/ligar contacto no CRM"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Converter em Contacto
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || Object.keys(form).length === 0}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Dados
              </CardTitle>
              <CardDescription>Atualiza aqui sem criar contacto automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={getValue("email") as any} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={getValue("phone") as any} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Primeiro Nome</Label>
                  <Input value={getValue("firstname") as any} onChange={(e) => setForm((p) => ({ ...p, firstname: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Apelido</Label>
                  <Input value={getValue("lastname") as any} onChange={(e) => setForm((p) => ({ ...p, lastname: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome completo</Label>
                  <Input value={getValue("full_name") as any} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input value={getValue("source") as any} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} placeholder="typebot/site/manual" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Input value={getValue("status") as any} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))} placeholder="active/unsubscribed/blocked" />
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cupão</Label>
                  <Input value={getValue("coupon_code") as any} onChange={(e) => setForm((p) => ({ ...p, coupon_code: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Expira</Label>
                  <Input value={getValue("coupon_expires_at") as any} onChange={(e) => setForm((p) => ({ ...p, coupon_expires_at: e.target.value }))} placeholder="ISO datetime" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={getValue("notes") as any} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={6} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Cupão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código</span>
                  <span className="font-mono">{sub.coupon_code || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validade</span>
                  <span>{expires}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Estado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{String(sub.status || "—")}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last seen</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {sub.last_seen_at ? new Date(String(sub.last_seen_at)).toLocaleString("pt-PT") : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

