import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useQuotationsByDeal,
  useCreateQuotationFromDeal,
  useDeleteQuotation,
  QUOTATION_STATUSES,
} from "@/hooks/useQuotations";
import { getWebhookSettings } from "@/hooks/useSettings";
import { toast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Calendar,
  Euro,
  Send,
} from "lucide-react";

interface QuotationsSectionProps {
  dealId: string;
  customerId?: string | null;
}

export function QuotationsSection({ dealId, customerId }: QuotationsSectionProps) {
  const { data: quotations, isLoading } = useQuotationsByDeal(dealId);
  const createQuotation = useCreateQuotationFromDeal();
  const deleteQuotation = useDeleteQuotation();
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const handleCreateQuotation = async () => {
    try {
      const quotation = await createQuotation.mutateAsync(dealId);
      toast({ title: `Orçamento ${quotation.quotation_number} criado` });
    } catch (error) {
      toast({ title: "Erro ao criar orçamento", variant: "destructive" });
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      await deleteQuotation.mutateAsync({ id: quotationId, dealId });
      toast({ title: "Orçamento eliminado" });
    } catch (error) {
      toast({ title: "Erro ao eliminar orçamento", variant: "destructive" });
    }
  };

  const handleGeneratePdf = async (quotationId: string, quotationNumber: string) => {
    const webhookSettings = getWebhookSettings();
    const webhookUrl = webhookSettings.webhook_proposta_pdf;

    if (!webhookUrl) {
      toast({
        title: "Webhook não configurado",
        description: "Configure o webhook de PDF nas Definições",
        variant: "destructive",
      });
      return;
    }

    setGeneratingPdf(quotationId);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          quotation_id: quotationId, 
          deal_id: dealId,
          customer_id: customerId,
        }),
      });

      if (response.ok) {
        toast({ title: `PDF do ${quotationNumber} gerado com sucesso` });
      } else {
        throw new Error("Webhook failed");
      }
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = QUOTATION_STATUSES.find((s) => s.value === status);
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "default",
      approved: "default",
      rejected: "destructive",
      expired: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Orçamentos ({quotations?.length || 0})
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateQuotation}
          disabled={createQuotation.isPending}
        >
          {createQuotation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Novo Orçamento
        </Button>
      </div>

      {quotations && quotations.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {quotations.map((quotation) => (
            <div
              key={quotation.id}
              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm font-mono">
                    {quotation.quotation_number}
                  </span>
                  {getStatusBadge(quotation.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(quotation.created_at).toLocaleDateString("pt-PT")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    {quotation.total_amount?.toLocaleString("pt-PT", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGeneratePdf(quotation.id, quotation.quotation_number)}
                  disabled={generatingPdf === quotation.id}
                  title="Gerar PDF"
                >
                  {generatingPdf === quotation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteQuotation(quotation.id)}
                  disabled={deleteQuotation.isPending}
                  title="Eliminar"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border rounded-lg bg-muted/30">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum orçamento criado
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={handleCreateQuotation}
            disabled={createQuotation.isPending}
          >
            Criar primeiro orçamento
          </Button>
        </div>
      )}
    </div>
  );
}
