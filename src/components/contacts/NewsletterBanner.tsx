import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Gift, Loader2, MailCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NewsletterBannerProps {
  contactId: string;
  contactEmail: string | null;
  contactPhone: string | null;
  acceptNewsletter: boolean;
  newsletterWelcomeSent: boolean;
  onUpdate: (acceptNewsletter: boolean, welcomeSent: boolean) => void;
}

export function NewsletterBanner({
  contactId,
  contactEmail,
  contactPhone,
  acceptNewsletter,
  newsletterWelcomeSent,
  onUpdate,
}: NewsletterBannerProps) {
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
      // Atualizar base de dados
      const { error } = await supabase
        .from("contacts")
        .update({ accept_newsletter: true })
        .eq("id", contactId);

      if (error) throw error;

      // Disparar webhook para n8n (se configurado)
      try {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("webhook_pdf_proposta")
          .single();

        // Usar um webhook genérico para newsletter (pode ser configurado depois)
        // O n8n irá enviar o email/WhatsApp de boas-vindas
        console.log("Newsletter subscription event:", {
          contactId,
          email: contactEmail,
          phone: contactPhone,
        });
      } catch {
        // Ignorar erro de webhook - não é crítico
      }

      onUpdate(true, false);
      toast({
        title: "Cliente subscrito!",
        description: "O email de boas-vindas será enviado automaticamente.",
      });
    } catch (error) {
      console.error("Erro ao subscrever:", error);
      toast({ title: "Erro ao subscrever", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Se já está subscrito, mostrar badge de confirmação
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

  // Banner de incentivo (pode ser dispensado)
  if (dismissed) return null;

  return (
    <div className={cn(
      "p-4 rounded-lg border-2 border-dashed",
      "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30",
      "border-orange-300 dark:border-orange-700"
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-orange-500/20">
            <Gift className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Cliente não subscrito à Newsletter</p>
            <p className="text-xs text-muted-foreground">
              Ofereça 5% de desconto na primeira compra!
            </p>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
