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
import { FileText, Download, Send, Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings } from '@/hooks/useSettings';

interface QuotationPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
}

interface QuotationData {
  id: string;
  quotation_number: string;
  status: string;
  subtotal: number;
  total_amount: number;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  customer: {
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

export function QuotationPreview({ open, onOpenChange, quotationId }: QuotationPreviewProps) {
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: settings } = useCompanySettings();

  useEffect(() => {
    if (open && quotationId) {
      fetchQuotation();
    }
  }, [open, quotationId]);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select(`
          *,
          customer:contacts(company_name, contact_name, address, postal_code, city, nif, email, phone)
        `)
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      const { data: items, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sort_order');

      if (itemsError) throw itemsError;

      setQuotation({
        ...quotationData,
        customer: quotationData.customer,
        items: items || [],
      });
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
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
              <p className="font-semibold">Condições de Pagamento:</p>
              <p>• Orçamento válido por 30 dias a partir da data de emissão</p>
              <p>• Pagamento: 50% no ato da encomenda, 50% antes da entrega</p>
              <p>• Prazo de entrega: A combinar conforme disponibilidade de stock</p>
              
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