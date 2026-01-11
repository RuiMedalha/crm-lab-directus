import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Calculator, FileText, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { QuotationPreview } from './QuotationPreview';
import { createQuotation, createQuotationItems } from '@/integrations/directus/quotations';

interface QuotationItem {
  id: string;
  product_name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  margin_percent: number;
  unit_price: number;
  iva_percent: number;
  line_total: number;
}

interface QuotationCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  dealId?: string;
  initialItems?: QuotationItem[];
  onComplete?: () => void;
}

const IVA_RATE = 23;

export function QuotationCreator({ 
  open, 
  onOpenChange, 
  contactId, 
  contactName,
  dealId,
  initialItems,
  onComplete
}: QuotationCreatorProps) {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [quotationId, setQuotationId] = useState<string | null>(null);

  // Inicializar com itens passados ou linha vazia
  useEffect(() => {
    if (open) {
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
      } else if (items.length === 0) {
        addNewItem();
      }
    }
  }, [open, initialItems]);

  // Calcular validade padrão (30 dias)
  useEffect(() => {
    if (open && !validUntil) {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setValidUntil(date.toISOString().split('T')[0]);
    }
  }, [open]);

  const generateItemId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addNewItem = () => {
    const newItem: QuotationItem = {
      id: generateItemId(),
      product_name: '',
      sku: '',
      quantity: 1,
      cost_price: 0,
      margin_percent: 30,
      unit_price: 0,
      iva_percent: IVA_RATE,
      line_total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // Auto-calcular preço de venda com base em custo + margem
      if (field === 'cost_price' || field === 'margin_percent') {
        const cost = field === 'cost_price' ? Number(value) : item.cost_price;
        const margin = field === 'margin_percent' ? Number(value) : item.margin_percent;
        updated.unit_price = cost * (1 + margin / 100);
      }

      // Recalcular total da linha
      const subtotal = updated.quantity * updated.unit_price;
      const ivaAmount = subtotal * (updated.iva_percent / 100);
      updated.line_total = subtotal + ivaAmount;

      return updated;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const ivaTotal = items.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      return sum + (lineSubtotal * (item.iva_percent / 100));
    }, 0);
    const total = subtotal + ivaTotal;

    return { subtotal, ivaTotal, total };
  };

  const handleSave = async () => {
    const validItems = items.filter(item => item.product_name.trim());
    
    if (validItems.length === 0) {
      toast({ title: 'Adicione pelo menos um produto', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { subtotal, total } = calculateTotals();

      const quotation = await createQuotation({
        customer_id: contactId,
        deal_id: dealId || undefined,
        status: 'draft',
        subtotal,
        total_amount: total,
        notes: notes || undefined,
        valid_until: validUntil || undefined,
      });

      await createQuotationItems(
        validItems.map((item, index) => ({
          quotation_id: quotation.id,
          product_name: item.product_name,
          sku: item.sku || null,
          quantity: item.quantity,
          cost_price: item.cost_price,
          unit_price: item.unit_price,
          discount_percent: 0,
          line_total: item.line_total,
          sort_order: index,
        }))
      );

      setQuotationId(quotation.id);
      toast({ title: `Orçamento ${quotation.quotation_number || ''} criado com sucesso!` });
      setShowPreview(true);
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      toast({ title: 'Erro ao criar orçamento', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setItems([]);
    setNotes('');
    setValidUntil('');
    setQuotationId(null);
    setShowPreview(false);
    onComplete?.();
    onOpenChange(false);
  };

  const { subtotal, ivaTotal, total } = calculateTotals();

  if (showPreview && quotationId) {
    return (
      <QuotationPreview
        open={true}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        quotationId={quotationId}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Novo Orçamento - {contactName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Tabela de produtos */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Produtos / Serviços</CardTitle>
                  <Button size="sm" variant="outline" onClick={addNewItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Linha
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Produto</TableHead>
                      <TableHead className="w-[100px]">SKU</TableHead>
                      <TableHead className="w-[60px] text-center">Qtd</TableHead>
                      <TableHead className="w-[100px] text-right">P. Custo</TableHead>
                      <TableHead className="w-[80px] text-right">Margem %</TableHead>
                      <TableHead className="w-[100px] text-right">P. Venda</TableHead>
                      <TableHead className="w-[60px] text-center">IVA %</TableHead>
                      <TableHead className="w-[100px] text-right">Total</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.product_name}
                            onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                            placeholder="Nome do produto..."
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.sku}
                            onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                            placeholder="SKU"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-8 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost_price || ''}
                            onChange={(e) => updateItem(item.id, 'cost_price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={item.margin_percent}
                            onChange={(e) => updateItem(item.id, 'margin_percent', parseFloat(e.target.value) || 0)}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price.toFixed(2)}
                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="h-8 text-right font-medium"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.iva_percent}
                            onChange={(e) => updateItem(item.id, 'iva_percent', parseFloat(e.target.value) || 0)}
                            className="h-8 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.line_total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Totais */}
            <Card>
              <CardContent className="py-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{subtotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA:</span>
                      <span>{ivaTotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-primary">{total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notas e Validade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas ou condições especiais..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">Válido até</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowPreview(true)} disabled={items.filter(i => i.product_name).length === 0}>
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualizar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Calculator className="h-4 w-4 mr-2" />
              {saving ? 'A guardar...' : 'Criar Orçamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}