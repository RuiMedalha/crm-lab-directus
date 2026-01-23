import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Download, Send, Loader2, Printer, Pencil } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useSettings';
import { fetchQuotationPdf, getQuotationById } from '@/integrations/directus/quotations';
import { toast } from "@/hooks/use-toast";

interface QuotationPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  onEdit?: (quotationId: string, customerId?: string | number | null) => void;
}

interface QuotationData {
  id: string;
  quotation_number: string;
  status: string;
  subtotal: number;
  total_amount: number;
  notes: string | null;
  terms_conditions?: string | null;
  internal_notes?: string | null;
  valid_until: string | null;
  created_at: string;
  customer: {
    id?: string | number | null;
    company_name: string;
    contact_name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    nif: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  items: {
    id: string;
    product_name: string | null;
    sku: string | null;
    quantity: number | null;
    unit_price: number | null;
    line_total: number | null;
  }[];
}

export function QuotationPreview({ open, onOpenChange, quotationId, onEdit }: QuotationPreviewProps) {
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const { data: settings } = useCompanySettings();

  useEffect(() => {
    if (open && quotationId) {
      fetchQuotation();
    }
  }, [open, quotationId]);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const { quotation: q, items } = await getQuotationById(quotationId);
      if (!q) throw new Error("Orçamento não encontrado");

      setQuotation({
        id: q.id,
        quotation_number: String(q.quotation_number || ""),
        status: String(q.status || "draft"),
        subtotal: Number(q.subtotal || 0),
        total_amount: Number(q.total_amount || 0),
        notes: (q.notes as any) ?? null,
        terms_conditions: (q.terms_conditions as any) ?? null,
        internal_notes: (q.internal_notes as any) ?? null,
        valid_until: (q.valid_until as any) ?? null,
        created_at: String(q.date_created || ""),
        customer: (q as any).customer_id
          ? {
              id: (q as any).customer_id.id ?? null,
              company_name: (q as any).customer_id.company_name || "",
              contact_name: (q as any).customer_id.contact_name || null,
              address: (q as any).customer_id.address || null,
              postal_code: (q as any).customer_id.postal_code || null,
              city: (q as any).customer_id.city || null,
              nif: (q as any).customer_id.nif || null,
              email: (q as any).customer_id.email || null,
              phone: (q as any).customer_id.phone || null,
            }
          : null,
        items: (items || []).map((i: any) => ({
          id: i.id,
          product_name: i.product_name ?? null,
          sku: i.sku ?? null,
          quantity: i.quantity ?? null,
          unit_price: i.unit_price ?? null,
          line_total: i.line_total ?? null,
        })),
      });
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Imprimir o PDF (mais fiável do que imprimir a página React)
    handleOpenPdf(true).catch(() => undefined);
  };

  const handleOpenPdf = async (_forPrint?: boolean) => {
    if (!quotationId) return;
    setPdfBusy(true);
    try {
      const blob = await fetchQuotationPdf(String(quotationId));
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        toast({ title: "Popup bloqueado", description: "Permite popups para abrir o PDF.", variant: "destructive" });
        return;
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quotationId) return;
    setPdfBusy(true);
    try {
      const blob = await fetchQuotationPdf(String(quotationId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quotation?.quotation_number || quotationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setPdfBusy(false);
    }
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

  const companySettings = settings as any;
  const ivaTotal = (quotation.total_amount || 0) - (quotation.subtotal || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pré-visualização do Orçamento
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Edit is handled by parent (opens QuotationCreator in edit mode)
                  onEdit?.(String(quotationId), quotation?.customer?.id ?? null);
                }}
                disabled={!quotation?.customer?.id}
                title="Editar/retomar"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={pdfBusy}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfBusy}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button size="sm">
                <Send className="h-4 w-4 mr-1" />
                Enviar por Email
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {/* PDF Preview Container */}
          <div className="bg-white text-black p-8 rounded-lg shadow-inner border min-h-[800px] print:shadow-none print:border-none">
            {/* Header com Logo */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <img 
                  src="/logo-hotelequip-dark.svg" 
                  alt="HotelEquip" 
                  className="h-12 mb-2"
                />
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p className="font-semibold">{companySettings?.name || 'HotelEquip'}</p>
                  <p>{companySettings?.address || 'Morada da empresa'}</p>
                  <p>NIF: {companySettings?.vat_number || '000000000'}</p>
                  <p>Tel: {companySettings?.phone || '+351 XXX XXX XXX'}</p>
                  <p>Email: {companySettings?.email || 'geral@hotelequip.pt'}</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">ORÇAMENTO</h1>
                <p className="text-lg font-semibold text-primary">{quotation.quotation_number}</p>
                <p className="text-sm text-gray-600">
                  Data: {new Date(quotation.created_at).toLocaleDateString('pt-PT')}
                </p>
                {quotation.valid_until && (
                  <p className="text-sm text-gray-600">
                    Válido até: {new Date(quotation.valid_until).toLocaleDateString('pt-PT')}
                  </p>
                )}
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Dados do Cliente */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">CLIENTE</h3>
              <div className="text-sm space-y-1">
                <p className="font-bold text-lg">{quotation.customer?.company_name || 'Cliente'}</p>
                {quotation.customer?.contact_name && (
                  <p>Att: {quotation.customer.contact_name}</p>
                )}
                {quotation.customer?.address && <p>{quotation.customer.address}</p>}
                {(quotation.customer?.postal_code || quotation.customer?.city) && (
                  <p>{quotation.customer.postal_code} {quotation.customer.city}</p>
                )}
                {quotation.customer?.nif && <p>NIF: {quotation.customer.nif}</p>}
              </div>
            </div>

            {/* Tabela de Itens */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Descrição</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-600 w-20">Qtd</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">P. Unit.</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-3 text-sm">
                      <p className="font-medium">{item.product_name}</p>
                      {item.sku && (
                        <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                      )}
                    </td>
                    <td className="py-3 text-sm text-center">{item.quantity}</td>
                    <td className="py-3 text-sm text-right">
                      {(item.unit_price || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="py-3 text-sm text-right font-medium">
                      {(item.line_total || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totais */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{(quotation.subtotal || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (23%):</span>
                  <span>{ivaTotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">
                    {(quotation.total_amount || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notas */}
            {quotation.notes && (
              <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">NOTAS</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}

            {/* Rodapé */}
            <div className="border-t-2 border-gray-200 pt-6 text-xs text-gray-500 space-y-2">
              <p className="font-semibold">Condições</p>
              <p className="whitespace-pre-wrap">
                {quotation.terms_conditions || "• Orçamento válido por 30 dias • Pagamento/Entrega: a definir"}
              </p>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Dados Bancários:</p>
                  <p>IBAN: PT50 0000 0000 0000 0000 0000 0</p>
                </div>
                <div className="text-right">
                  <p>{companySettings?.name || 'HotelEquip'}</p>
                  <p>Tel: {companySettings?.phone || '+351 XXX XXX XXX'}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}