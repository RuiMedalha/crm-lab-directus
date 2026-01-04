import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Building2,
  Mail,
  MessageCircle,
  Phone,
  PhoneIncoming,
  PhoneOff,
} from "lucide-react";
import {
  computeDedupeKey,
  markLeadMissedWithAggregation,
  patchLead,
  type LeadItem,
} from "@/integrations/directus/leads";

const TIMER_SECONDS = 18; // 15–20s (requested). Keep 18 as default.

const SOURCE_LABEL: Record<string, string> = {
  phone: "Chamada",
  central: "Central Telefónica",
  whatsapp: "WhatsApp",
  typebot: "Typebot",
  chatwoot: "Chatwoot",
  email: "Email",
  web: "Website",
};

const SOURCE_ICON: Record<string, typeof Phone> = {
  phone: Phone,
  central: Phone,
  whatsapp: MessageCircle,
  typebot: MessageCircle,
  chatwoot: MessageCircle,
  email: Mail,
  web: Mail,
};

export function LeadPopup360({
  lead,
  isVisible,
  onDismiss,
  currentUserLabel,
}: {
  lead: LeadItem;
  isVisible: boolean;
  onDismiss: (leadId?: string) => void;
  currentUserLabel?: string;
}) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [busy, setBusy] = useState<"answer" | "reject" | "spam" | "timeout" | null>(null);
  const timerRef = useRef<number | null>(null);

  const source = lead.source || "phone";
  const SourceIcon = SOURCE_ICON[source] || PhoneIncoming;
  const sourceLabel = SOURCE_LABEL[source] || String(source);

  const primary = useMemo(() => {
    return lead.display_name || lead.phone || lead.email || "Lead";
  }, [lead.display_name, lead.phone, lead.email]);

  useEffect(() => {
    if (!isVisible) return;
    setTimeLeft(TIMER_SECONDS);
    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isVisible, lead.id]);

  useEffect(() => {
    if (!isVisible) return;
    if (timeLeft > 0) return;
    if (busy) return;

    // Timeout → “não atendida” com agregação e fecho do popup
    (async () => {
      setBusy("timeout");
      try {
        await markLeadMissedWithAggregation({
          ...lead,
          dedupe_key: lead.dedupe_key || computeDedupeKey({ phone: lead.phone, email: lead.email }),
        });
        toast({ title: "Lead não atendido", description: "Foi movido para Leads não atendidas." });
      } catch (e) {
        console.error(e);
      } finally {
        onDismiss(lead.id);
        setBusy(null);
      }
    })();
  }, [busy, isVisible, lead, onDismiss, timeLeft]);

  const handleAnswer = async () => {
    if (busy) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setBusy("answer");
    try {
      await patchLead(lead.id, {
        status: "ongoing",
        claimed_at: new Date().toISOString(),
        claimed_by: currentUserLabel || undefined,
      });

      // Open the “card de contacto/lead” immediately to start filling
      const params = new URLSearchParams();
      if (lead.phone) params.set("phone", lead.phone);
      if (lead.email) params.set("email", lead.email);
      if (lead.display_name) params.set("name", lead.display_name);
      if (lead.nif) params.set("nif", lead.nif);
      if (lead.source) params.set("source", String(lead.source));
      params.set("leadId", lead.id);

      onDismiss(lead.id);
      navigate(`/dashboard360?${params.toString()}`);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao atender lead", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (busy) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setBusy("reject");
    try {
      await patchLead(lead.id, { status: "rejected" });
      toast({ title: "Lead rejeitado" });
      onDismiss(lead.id);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao rejeitar", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleSpam = async () => {
    if (busy) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setBusy("spam");
    try {
      await patchLead(lead.id, { status: "spam", discarded_at: new Date().toISOString() });
      toast({ title: "Marcado como publicidade", variant: "destructive" });
      onDismiss(lead.id);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao marcar publicidade", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const progress = (timeLeft / TIMER_SECONDS) * 100;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <Card className={cn("w-80 shadow-2xl border-destructive/50 bg-card")}>
        <CardContent className="p-4 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Tempo para atender</span>
              <span className={cn("text-sm font-bold", timeLeft <= 5 ? "text-destructive" : "text-foreground")}>
                {timeLeft}s
              </span>
            </div>
            <Progress value={progress} className={cn("h-2", timeLeft <= 5 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-3 rounded-full bg-destructive/20">
                <PhoneIncoming className="h-5 w-5 text-destructive animate-bounce" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Novo Lead • {sourceLabel}
                </p>
                <p className="font-semibold text-foreground truncate">{primary}</p>
                {lead.phone && <p className="text-sm text-muted-foreground font-mono truncate">{lead.phone}</p>}
                {lead.email && <p className="text-xs text-muted-foreground truncate">{lead.email}</p>}
              </div>
            </div>

            <Badge variant="outline" className="flex items-center gap-1">
              <SourceIcon className="h-3 w-3" />
              <span className="text-[10px]">{sourceLabel}</span>
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              className="bg-success hover:bg-success/90 text-success-foreground"
              size="sm"
              onClick={handleAnswer}
              disabled={!!busy}
            >
              <Phone className="h-4 w-4 mr-1" />
              Atender
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={!!busy}>
              <PhoneOff className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSpam}
              disabled={!!busy}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Publicidade
            </Button>
          </div>

          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Ao atender, abre o Card 360 para preencher.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

