import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
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
import { Plus, Trash2, Calculator, FileText, Eye, Search, TextCursorInput } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { QuotationPreview } from './QuotationPreview';
import { createQuotation, createQuotationItems } from '@/integrations/directus/quotations';
import { useMeilisearch, type MeilisearchProduct } from "@/hooks/useMeilisearch";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuotationItem {
  id: string;
  line_type: "product" | "free";
  product_id?: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  margin_percent: number;
  unit_price: number;
  discount_percent: number;
  iva_percent: number;
  notes?: string;
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
  const isMobile = useIsMobile();
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [quotationId, setQuotationId] = useState<string | null>(null);

  const { search, results, isSearching, error: searchError, clearResults } = useMeilisearch();
  const [searchItemId, setSearchItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Pesquisa Meilisearch (debounce) para a linha ativa
  useEffect(() => {
    const active = items.find((i) => i.id === searchItemId);
    const canSearch = !!active && active.line_type === "product" && searchQuery.trim().length >= 2;
    const t = setTimeout(() => {
      if (canSearch) {
        search(searchQuery);
      } else {
        clearResults();
      }
    }, 250);
    return () => clearTimeout(t);
  }, [items, searchItemId, searchQuery, search, clearResults]);

  const generateItemId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addNewItem = () => {
    const newItem: QuotationItem = {
      id: generateItemId(),
      line_type: "product",
      product_id: null,
      product_name: '',
      sku: '',
      quantity: 1,
      cost_price: 0,
      margin_percent: 30,
      unit_price: 0,
      discount_percent: 0,
      iva_percent: IVA_RATE,
      notes: '',
      line_total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const computeLineTotal = (item: QuotationItem) => {
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price || 0);
    const base = qty * unit;
    const discount = base * (Number(item.discount_percent || 0) / 100);
    const taxable = Math.max(0, base - discount);
    const ivaAmount = taxable * (Number(item.iva_percent || 0) / 100);
    return taxable + ivaAmount;
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
      updated.line_total = computeLineTotal(updated);

      return updated;
    }));
  };

  const applyProductToItem = (id: string, product: MeilisearchProduct) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const name = product.title || product.name || "";
        const sku = product.sku || "";
        const unit_price = Number(product.price || 0);
        const cost_price = Number(product.cost || 0);
        const margin_percent =
          cost_price > 0 ? Math.max(0, ((unit_price / cost_price) - 1) * 100) : item.margin_percent;

        const updated: QuotationItem = {
          ...item,
          line_type: "product",
          product_id: String(product.id || ""),
          product_name: name,
          sku,
          unit_price,
          cost_price,
          margin_percent: Number.isFinite(margin_percent) ? Math.round(margin_percent * 10) / 10 : item.margin_percent,
        };
        updated.line_total = computeLineTotal(updated);
        return updated;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const base = Number(item.quantity || 0) * Number(item.unit_price || 0);
      const discount = base * (Number(item.discount_percent || 0) / 100);
      return sum + Math.max(0, base - discount);
    }, 0);
    const ivaTotal = items.reduce((sum, item) => {
      const base = Number(item.quantity || 0) * Number(item.unit_price || 0);
      const discount = base * (Number(item.discount_percent || 0) / 100);
      const taxable = Math.max(0, base - discount);
      return sum + taxable * (Number(item.iva_percent || 0) / 100);
    }, 0);
    const total = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);

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
          product_id: item.product_id || null,
          product_name: item.product_name,
          sku: item.sku || null,
          quantity: item.quantity,
          cost_price: item.cost_price || 0,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          line_total: item.line_total,
          notes: item.notes || undefined,
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
    setSearchItemId(null);
    setSearchQuery("");
    clearResults();
    onComplete?.();
    onOpenChange(false);
  };

  const { subtotal, ivaTotal, total } = calculateTotals();

  const formatEUR = useMemo(() => {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
  }, []);

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
                {isMobile ? (
                  <div className="p-4 space-y-3">
                    {items.map((item) => (
                      <Card key={item.id} className="border">
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={item.line_type === "free" ? "default" : "outline"}
                              className="h-8"
                              onClick={() => updateItem(item.id, "line_type", item.line_type === "free" ? "product" : "free")}
                              title="Alternar: produto vs linha livre"
                            >
                              <TextCursorInput className="h-4 w-4 mr-2" />
                              {item.line_type === "free" ? "Linha livre" : "Produto"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Remover linha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {item.line_type === "product" ? (
                            <Popover
                              open={searchItemId === item.id && searchQuery.trim().length >= 2}
                              onOpenChange={(v) => {
                                if (!v) {
                                  setSearchItemId(null);
                                  setSearchQuery("");
                                  clearResults();
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <div>
                                  <Label className="text-xs">Produto (nome ou SKU)</Label>
                                  <Input
                                    value={item.product_name}
                                    onFocus={() => {
                                      setSearchItemId(item.id);
                                      setSearchQuery(item.product_name || "");
                                    }}
                                    onChange={(e) => {
                                      updateItem(item.id, "product_name", e.target.value);
                                      setSearchItemId(item.id);
                                      setSearchQuery(e.target.value);
                                    }}
                                    placeholder="Escreve 2+ letras para pesquisar…"
                                    className="h-9"
                                  />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[90vw] max-w-[520px]" align="start">
                                <Command>
                                  <CommandList>
                                    {searchError ? (
                                      <div className="p-3 text-xs text-destructive">{searchError}</div>
                                    ) : null}
                                    {isSearching ? (
                                      <div className="p-3 text-xs text-muted-foreground">A pesquisar…</div>
                                    ) : null}
                                    <CommandEmpty>Nenhum resultado</CommandEmpty>
                                    <CommandGroup heading="Resultados">
                                      {(results || []).map((p) => (
                                        <CommandItem
                                          key={String(p.id)}
                                          value={`${p.title || p.name || ""} ${p.sku || ""}`}
                                          onSelect={() => {
                                            applyProductToItem(item.id, p);
                                            setSearchItemId(null);
                                            setSearchQuery("");
                                            clearResults();
                                          }}
                                        >
                                          <div className="flex flex-col">
                                            <div className="text-sm font-medium">{p.title || p.name}</div>
                                            <div className="text-xs text-muted-foreground flex gap-2">
                                              <span>SKU: {p.sku}</span>
                                              <span>Preço: {formatEUR.format(Number(p.price || 0))}</span>
                                            </div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-xs">Descrição (linha livre)</Label>
                              <Input
                                value={item.product_name}
                                onChange={(e) => updateItem(item.id, "product_name", e.target.value)}
                                placeholder="Ex.: Transporte / Instalação / Serviço…"
                                className="h-9"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd</Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={String(item.quantity)}
                                onChange={(e) => {
                                  const n = Number.parseFloat(e.target.value);
                                  updateItem(item.id, "quantity", Number.isFinite(n) && n > 0 ? n : 1);
                                }}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Desc %</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={String(item.discount_percent)}
                                onChange={(e) => updateItem(item.id, "discount_percent", Number.parseFloat(e.target.value) || 0)}
                                className="h-9"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">P. Venda</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price === 0 ? "" : String(item.unit_price)}
                                onChange={(e) => updateItem(item.id, "unit_price", Number.parseFloat(e.target.value) || 0)}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">IVA %</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={String(item.iva_percent)}
                                onChange={(e) => updateItem(item.id, "iva_percent", Number.parseFloat(e.target.value) || 0)}
                                className="h-9"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Notas (opcional)</Label>
                            <Input
                              value={item.notes || ""}
                              onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                              placeholder="Observações da linha…"
                              className="h-9"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">Total linha</div>
                            <div className="font-bold">{formatEUR.format(Number(item.line_total || 0))}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[48px]">Tipo</TableHead>
                        <TableHead className="w-[240px]">Produto / Linha</TableHead>
                        <TableHead className="w-[110px]">SKU</TableHead>
                        <TableHead className="w-[80px] text-center">Qtd</TableHead>
                        <TableHead className="w-[80px] text-right">Desc %</TableHead>
                        <TableHead className="w-[100px] text-right">P. Custo</TableHead>
                        <TableHead className="w-[80px] text-right">Margem %</TableHead>
                        <TableHead className="w-[110px] text-right">P. Venda</TableHead>
                        <TableHead className="w-[70px] text-center">IVA %</TableHead>
                        <TableHead className="w-[110px] text-right">Total</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="align-top">
                            <Button
                              type="button"
                              variant={item.line_type === "free" ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateItem(item.id, "line_type", item.line_type === "free" ? "product" : "free")}
                              title={item.line_type === "free" ? "Linha livre" : "Produto"}
                            >
                              <TextCursorInput className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="align-top">
                            {item.line_type === "product" ? (
                              <Popover
                                open={searchItemId === item.id && searchQuery.trim().length >= 2}
                                onOpenChange={(v) => {
                                  if (!v) {
                                    setSearchItemId(null);
                                    setSearchQuery("");
                                    clearResults();
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      value={item.product_name}
                                      onFocus={() => {
                                        setSearchItemId(item.id);
                                        setSearchQuery(item.product_name || "");
                                      }}
                                      onChange={(e) => {
                                        updateItem(item.id, 'product_name', e.target.value);
                                        setSearchItemId(item.id);
                                        setSearchQuery(e.target.value);
                                      }}
                                      placeholder="Nome ou SKU (2+ letras)…"
                                      className="h-8 pl-8"
                                    />
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[520px]" align="start">
                                  <Command>
                                    <CommandList>
                                      {searchError ? (
                                        <div className="p-3 text-xs text-destructive">{searchError}</div>
                                      ) : null}
                                      {isSearching ? (
                                        <div className="p-3 text-xs text-muted-foreground">A pesquisar…</div>
                                      ) : null}
                                      <CommandEmpty>Nenhum resultado</CommandEmpty>
                                      <CommandGroup heading="Resultados">
                                        {(results || []).map((p) => (
                                          <CommandItem
                                            key={String(p.id)}
                                            value={`${p.title || p.name || ""} ${p.sku || ""}`}
                                            onSelect={() => {
                                              applyProductToItem(item.id, p);
                                              setSearchItemId(null);
                                              setSearchQuery("");
                                              clearResults();
                                            }}
                                          >
                                            <div className="flex items-center justify-between w-full gap-3">
                                              <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">{p.title || p.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">SKU: {p.sku}</div>
                                              </div>
                                              <div className="text-sm font-semibold">{formatEUR.format(Number(p.price || 0))}</div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Input
                                value={item.product_name}
                                onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                                placeholder="Linha livre (ex.: Transporte)…"
                                className="h-8"
                              />
                            )}
                            <Input
                              value={item.notes || ""}
                              onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                              placeholder="Notas da linha (opcional)…"
                              className="h-8 mt-2"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              value={item.sku}
                              onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="h-8"
                              disabled={item.line_type === "free"}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={String(item.quantity)}
                              onChange={(e) => {
                                const n = Number.parseFloat(e.target.value);
                                updateItem(item.id, 'quantity', Number.isFinite(n) && n > 0 ? n : 1);
                              }}
                              className="h-8 text-center"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={String(item.discount_percent)}
                              onChange={(e) => updateItem(item.id, 'discount_percent', Number.parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.cost_price === 0 ? "" : String(item.cost_price)}
                              onChange={(e) => updateItem(item.id, 'cost_price', Number.parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-8 text-right"
                              disabled={item.line_type === "free"}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={String(item.margin_percent)}
                              onChange={(e) => updateItem(item.id, 'margin_percent', Number.parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                              disabled={item.line_type === "free"}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price === 0 ? "" : String(item.unit_price)}
                              onChange={(e) => updateItem(item.id, 'unit_price', Number.parseFloat(e.target.value) || 0)}
                              className="h-8 text-right font-medium"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={String(item.iva_percent)}
                              onChange={(e) => updateItem(item.id, 'iva_percent', Number.parseFloat(e.target.value) || 0)}
                              className="h-8 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold align-top">
                            {formatEUR.format(Number(item.line_total || 0))}
                          </TableCell>
                          <TableCell className="align-top">
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
                )}
              </CardContent>
            </Card>

            {/* Totais */}
            <Card>
              <CardContent className="py-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatEUR.format(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA:</span>
                      <span>{formatEUR.format(ivaTotal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-primary">{formatEUR.format(total)}</span>
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