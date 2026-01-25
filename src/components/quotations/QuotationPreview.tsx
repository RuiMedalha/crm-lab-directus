import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Printer, Send, Loader2, Share2 } from 'lucide-react';
import { directusRequest } from '@/integrations/directus/client';
import { useCompanySettings } from '@/hooks/useSettings';
import { QuotationPDF, QuotationData } from './QuotationPDF';
import { ShareQuotationDialog } from './ShareQuotationDialog';
import { useToast } from '@/hooks/use-toast';

interface QuotationPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
}

export function QuotationPreview({ open, onOpenChange, quotationId }: QuotationPreviewProps) {
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const { data: settings } = useCompanySettings();
  const { toast } = useToast();
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && quotationId) {
      fetchQuotation();
    }
  }, [open, quotationId]);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const response = await directusRequest<{ data: any }>(
        `/items/quotations/${quotationId}?fields=*,customer_id.*,items.*`
      );

      const q = response.data;

      const mappedQuotation: QuotationData = {
        id: q.id,
        quotation_number: q.quotation_number,
        status: q.status,
        subtotal: q.subtotal,
        total_amount: q.total_amount,
        notes: q.notes,
        valid_until: q.valid_until,
        created_at: q.date_created,
        customer: q.customer_id ? {
          company_name: q.customer_id.company_name,
          contact_name: q.customer_id.contact_name,
          address: q.customer_id.address,
          postal_code: q.customer_id.postal_code,
          city: q.customer_id.city,
          nif: q.customer_id.nif,
          email: q.customer_id.email,
          phone: q.customer_id.phone
        } : null,
        items: q.items?.map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total
        })) || []
      };

      setQuotation(mappedQuotation);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      toast({ title: "Erro", description: "Não foi possível carregar o orçamento.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    // In a real scenario, we would generate a PDF blob here using html2canvas/jspdf or similar
    // For now, we pass a dummy blob to satisfy the interface, 
    // assuming the N8N workflow might re-generate it or we send HTML content later.
    // Ideally, install `html2pdf.js` to create current view blob.

    // Simulating blob for flow completeness
    const dummyBlob = new Blob(["PDF Content Placeholder"], { type: 'application/pdf' });
    setShowShare(true);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!quotation) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b bg-background z-10 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documento {quotation.quotation_number}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleShare} size="sm" className="bg-[#25D366] hover:bg-[#128C7E] text-white">
                <Share2 className="h-4 w-4 mr-2" />
                Enviar / Partilhar
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 bg-slate-100 p-4 sm:p-8">
            <QuotationPDF quotation={quotation} settings={settings} id="printable-content" />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ShareQuotationDialog
        open={showShare}
        onOpenChange={setShowShare}
        quotationNumber={quotation.quotation_number}
        customerEmail={quotation.customer?.email || ''}
        customerPhone={quotation.customer?.phone || ''}
        // In the future, pass the actual PDF blob generated from pdfRef
        quotationBlob={new Blob(['dummy'], { type: 'application/pdf' })}
      />
    </>
  );
}