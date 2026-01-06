import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  fetchMissedLeads,
  deleteLead,
  patchLead,
  type LeadItem,
} from "@/integrations/directus/leads";
import { findDuplicateContact } from "@/integrations/directus/contacts";
import { Clock, Mail, MessageCircle, Phone, Trash2, Smartphone } from "lucide-react";

const SOURCE_BADGE: Record<string, { label: string; icon: any }> = {
  phone: { label: "Chamada", icon: Phone },
  central: { label: "Central", icon: Phone },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  typebot: { label: "Typebot", icon: MessageCircle },
  chatwoot: { label: "Chatwoot", icon: MessageCircle },
  email: { label: "Email", icon: Mail },
  web: { label: "Website", icon: Mail },
};

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    return format(new Date(iso), "d MMM HH:mm", { locale: pt });
  } catch {
    return iso;
  }
}

const WHATSAPP_TEMPLATE =
  import.meta.env.VITE_OUTREACH_TEMPLATE_WHATSAPP ||
  "Olá! Pedimos desculpa por não termos atendido. Pode dizer-nos o que pretende e deixar mais dados (nome/empresa)?";
const SMS_TEMPLATE =
  import.meta.env.VITE_OUTREACH_TEMPLATE_SMS ||
  "Olá! Pedimos desculpa por não termos atendido. Pode indicar o que pretende e o seu nome/empresa? Obrigado.";
const EMAIL_SUBJECT =
  import.meta.env.VITE_OUTREACH_TEMPLATE_EMAIL_SUBJECT || "Re: Contacto CRM Hotelequip";
const EMAIL_BODY =
  import.meta.env.VITE_OUTREACH_TEMPLATE_EMAIL_BODY ||
  "Olá! Pedimos desculpa por não termos respondido de imediato.\n\nPode indicar-nos o que pretende e os seus dados (nome/empresa/telefone)?\n\nObrigado.";

export default function Leads360() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LeadItem[]>([]);
  const [deleting, setDeleting] = useState<LeadItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMissedLeads();
      setItems(data);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = new Date(a.last_attempt_at || a.date_created || 0).getTime();
      const db = new Date(b.last_attempt_at || b.date_created || 0).getTime();
      return db - da;
    });
  }, [items]);

  const handleOpenCard = (lead: LeadItem) => {
    (async () => {
      const existing = await findDuplicateContact({
        nif: lead.nif || null,
        phone: lead.phone || null,
        email: lead.email || null,
      }).catch(() => null);

      if (existing?.id) {
        await patchLead(lead.id, { contact_id: String(existing.id) }).catch(() => undefined);
        navigate(`/dashboard360/${encodeURIComponent(String(existing.id))}?leadId=${encodeURIComponent(lead.id)}`);
        return;
      }

      const params = new URLSearchParams();
      if (lead.phone) params.set("phone", lead.phone);
      if (lead.email) params.set("email", lead.email);
      if (lead.display_name) params.set("name", lead.display_name);
      if (lead.nif) params.set("nif", lead.nif);
      if (lead.source) params.set("source", String(lead.source));
      params.set("leadId", lead.id);
      navigate(`/dashboard360?${params.toString()}`);
    })();
  };

  const handleDiscard = async (lead: LeadItem) => {
    try {
      await patchLead(lead.id, { status: "discarded", discarded_at: new Date().toISOString() });
      toast({ title: "Lead descartado" });
      load();
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao descartar", variant: "destructive" });
    }
  };

  const handleDeleteForever = async () => {
    if (!deleting?.id) return;
    try {
      await deleteLead(deleting.id);
      toast({ title: "Lead apagado" });
      setDeleting(null);
      load();
    } catch (e) {
      console.error(e);
      toast({ title: "Sem permissões para apagar (Directus)", variant: "destructive" });
    }
  };

  const handleCall = (lead: LeadItem) => {
    if (!lead.phone) {
      toast({ title: "Sem telefone", variant: "destructive" });
      return;
    }
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsApp = (lead: LeadItem) => {
    if (lead.phone) {
      const phone = lead.phone.replace(/\D/g, "");
      const text = encodeURIComponent(WHATSAPP_TEMPLATE);
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
      return;
    }
    toast({ title: "Sem telefone para WhatsApp", variant: "destructive" });
  };

  const handleSms = (lead: LeadItem) => {
    if (!lead.phone) {
      toast({ title: "Sem telefone para SMS", variant: "destructive" });
      return;
    }
    const phone = lead.phone.replace(/\D/g, "");
    const body = encodeURIComponent(SMS_TEMPLATE);
    // Works on mobile and some desktop handlers
    window.location.href = `sms:${phone}?&body=${body}`;
  };

  const handleEmail = (lead: LeadItem) => {
    if (!lead.email) {
      toast({ title: "Sem email", variant: "destructive" });
      return;
    }
    const subject = encodeURIComponent(EMAIL_SUBJECT);
    const body = encodeURIComponent(EMAIL_BODY);
    window.location.href = `mailto:${lead.email}?subject=${subject}&body=${body}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entrada de Leads (Não atendidas)</h1>
            <p className="text-muted-foreground">Ordenado por última tentativa; agregação por contacto.</p>
          </div>
          <Badge variant="outline" className="text-base px-3 py-1">
            {sorted.length} leads
          </Badge>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Sem leads não atendidas.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sorted.map((lead) => {
              const src = lead.source || "phone";
              const meta = SOURCE_BADGE[src] || { label: String(src), icon: Phone };
              const Icon = meta.icon;
              const attempts = lead.attempt_count || (Array.isArray(lead.attempt_log) ? lead.attempt_log.length : 1) || 1;

              return (
                <Card key={lead.id} className="border-4 border-orange-500/70 bg-orange-500/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {lead.display_name || lead.phone || lead.email || "Lead"}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>Última: {fmtDate(lead.last_attempt_at || lead.date_created)}</span>
                          <span className="text-orange-700 font-medium">• {attempts}x</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      {lead.phone && <div className="font-mono">{lead.phone}</div>}
                      {lead.email && <div className="text-muted-foreground">{lead.email}</div>}
                    </div>

                    {Array.isArray(lead.attempt_log) && lead.attempt_log.length > 1 && (
                      <div className="text-xs text-muted-foreground">
                        Horários:{" "}
                        {lead.attempt_log
                          .slice(0, 5)
                          .map((a) => fmtDate(a.at))
                          .join(" • ")}
                        {lead.attempt_log.length > 5 ? " …" : ""}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCall(lead)} className="flex-1 min-w-32">
                        <Phone className="h-4 w-4 mr-2" />
                        Ligar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsApp(lead)}
                        className="flex-1 min-w-32"
                        disabled={!lead.phone}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSms(lead)}
                        className="flex-1 min-w-32"
                        disabled={!lead.phone}
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        SMS
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEmail(lead)}
                        className="flex-1 min-w-32"
                        disabled={!lead.email}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button size="sm" onClick={() => handleOpenCard(lead)} className="flex-1 min-w-32">
                        Abrir Card
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleting(lead)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-background border shadow-lg p-4 space-y-3">
            <div className="text-base font-semibold">Apagar lead?</div>
            <div className="text-sm text-muted-foreground">
              Isto apaga definitivamente do Directus. Confirma?
              <div className="mt-2 font-mono text-xs">
                {deleting.display_name || deleting.phone || deleting.email || deleting.id}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteForever}>Apagar</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

