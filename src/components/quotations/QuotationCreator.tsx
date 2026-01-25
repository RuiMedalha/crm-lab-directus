import { useMemo, useState, useEffect } from 'react';
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
import { Plus, Trash2, Calculator, FileText, Eye, Search, TextCursorInput, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { QuotationPreview } from './QuotationPreview';
import { createQuotation, createQuotationItems, getQuotationById, patchQuotation, replaceQuotationItems } from '@/integrations/directus/quotations';
import { useMeilisearch, type MeilisearchProduct } from "@/hooks/useMeilisearch";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductSearchDialog } from "@/components/products/ProductSearchDialog";
import { useCreateInteraction } from "@/hooks/useInteractions";
import { useCompanySettings } from "@/hooks/useSettings";

interface QuotationItem {
  id: string;
  line_type: "product" | "free";
  product_id?: string | null;
  image_url?: string | null;
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
  quotationId?: string; // if present, edit mode
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
  quotationId: editingQuotationId,
  dealId,
  initialItems,
  onComplete
}: QuotationCreatorProps) {
  const isMobile = useIsMobile();
  const createInteraction = useCreateInteraction();
  const { data: companySettings } = useCompanySettings();
  const wooUrl = String((companySettings as any)?.woo_url || "").replace(/\/+$/, "");
  const [items, setItems] = useState<QuotationItem[]>([]);
  // Visível ao cliente (vai para PDF)
  const [notes, setNotes] = useState('');
  // Condições visíveis ao cliente (pagamento/entrega/etc) -> terms_conditions
  const [termsConditions, setTermsConditions] = useState('');
  // Notas internas (não vai para PDF)
  const [internalNotes, setInternalNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const isEditMode = !!editingQuotationId;

  const { search, results, isSearching, error: searchError, clearResults } = useMeilisearch();
  const [searchItemId, setSearchItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null);

  const normalizeContactIdForDirectus = (cid: any) => {
    const s = String(cid ?? "").trim();
    return /^\d+$/.test(s) ? Number(s) : s;
  };

  const normalizeImageUrl = (url: any) => {
    const s = String(url ?? "").trim();
    if (!s) return null;
    if (s.startsWith("//")) return `https:${s}`;
    if (s.startsWith("/") && wooUrl) return `${wooUrl}${s}`;
    return s;
  };

  const getProductImage = (product: MeilisearchProduct) => {
    const p = product as unknown as Record<string, any>;
    return (
      p.featured_media_url ||
      p.image_url ||
      p.media_url ||
      p.thumbnail ||
      p.thumb ||
      (Array.isArray(p.images) ? p.images?.[0]?.src || p.images?.[0]?.url : null) ||
      (p.image ? p.image.src || p.image.url : null) ||
      (p.featured_media ? p.featured_media.src || p.featured_media.url : null) ||
      null
    );
  };

  // Inicializar com itens passados ou linha vazia
  useEffect(() => {
    if (open) {
      if (editingQuotationId) {
        // Load draft for editing
        (async () => {
          try {
            const { quotation: q, items: its } = await getQuotationById(String(editingQuotationId));
            if (!q) return;
            setQuotationId(String(q.id));
            setNotes(String(q.notes || ""));
            setTermsConditions(String(q.terms_conditions || ""));
            setInternalNotes(String(q.internal_notes || ""));
            setValidUntil(q.valid_until ? String(q.valid_until).slice(0, 10) : "");
            const mapped = (its || []).map((it: any) => ({
              id: `item-${it.id}`,
              line_type: it.manual_entry ? "free" : "product",
              product_id: it.product_id ?? null,
              image_url: it.image_url ?? null,
              product_name: it.product_name || "",
              sku: it.sku || "",
              quantity: Number(it.quantity || 1),
              cost_price: Number(it.cost_price || 0),
              margin_percent: 30,
              unit_price: Number(it.unit_price || 0),
              discount_percent: Number(it.discount_percent || 0),
              iva_percent: Number(it.iva_percent || IVA_RATE),
              notes: it.notes || "",
              line_total: Number(it.line_total || 0),
            })) as QuotationItem[];
            setItems(mapped.length ? mapped : []);
            if (!mapped.length) addNewItem();
          } catch (e) {
            console.error(e);
            toast({ title: "Erro ao carregar orçamento", variant: "destructive" });
          }
        })();
        return;
      }

      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
      } else if (items.length === 0) {
        addNewItem();
      }
    }
  }, [open, initialItems, editingQuotationId]);

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

  const openPickerForLine = (lineId: string, seed?: string) => {
    setPickerTargetId(lineId);
    setSearchItemId(lineId);
    setSearchQuery(seed || "");
    setPickerOpen(true);
  };

  const generateItemId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addNewItem = () => {
    const newItem: QuotationItem = {
      id: generateItemId(),
      line_type: "product",
      product_id: null,
      image_url: null,
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

  const round2 = (n: unknown) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v)) return 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
  };

  const roundInt = (n: unknown, fallback = 1) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    const i = Math.trunc(v);
    return i > 0 ? i : fallback;
  };

  const computeLineBase = (item: QuotationItem) => {
    const qty = roundInt(item.quantity || 1);
    const unit = Number(item.unit_price || 0);
    const base = qty * unit;
    const discount = base * (Number(item.discount_percent || 0) / 100);
    return Math.max(0, base - discount);
  };

  const computeLineIvaAmount = (item: QuotationItem) => {
    const taxable = computeLineBase(item);
    return round2(taxable * (Number(item.iva_percent || 0) / 100));
  };

  const computeLineTotal = (item: QuotationItem) => {
    const taxable = computeLineBase(item);
    const ivaAmount = computeLineIvaAmount(item);
    return round2(taxable + ivaAmount);
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated: any = { ...item, [field]: value };

      // Quantidades: apenas inteiros
      if (field === "quantity") {
        updated.quantity = roundInt(value, 1);
      }

      // Enforce 2 decimals on money fields
      if (field === "cost_price" || field === "unit_price") {
        updated[field] = round2(value);
      }

      // Auto-calcular preço de venda com base em custo + margem
      if (field === 'cost_price' || field === 'margin_percent') {
        const cost = field === 'cost_price' ? Number(value) : item.cost_price;
        const margin = field === 'margin_percent' ? Number(value) : item.margin_percent;
        updated.unit_price = round2(cost * (1 + margin / 100));
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
        const unit_price = round2(product.price || 0);
        const cost_price = round2(product.cost || 0);
        const image_url = normalizeImageUrl(getProductImage(product));
        const margin_percent =
          cost_price > 0 ? Math.max(0, ((unit_price / cost_price) - 1) * 100) : item.margin_percent;

        const updated: QuotationItem = {
          ...item,
          line_type: "product",
          product_id: String(product.id || ""),
          image_url: image_url ? String(image_url) : null,
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
      return sum + computeLineBase(item);
    }, 0);
    const ivaTotal = items.reduce((sum, item) => {
      return sum + computeLineIvaAmount(item);
    }, 0);
    const total = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);

    return { subtotal: round2(subtotal), ivaTotal: round2(ivaTotal), total: round2(total) };
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

      const customerIdForDirectus: string | number =
        /^\d+$/.test(String(contactId || "")) ? Number(contactId) : contactId;

      const basePayload: any = {
        customer_id: customerIdForDirectus,
        deal_id: dealId || undefined,
        status: 'draft',
        subtotal: round2(subtotal),
        total_amount: round2(total),
        notes: notes || undefined,
        terms_conditions: termsConditions || undefined,
        internal_notes: internalNotes || undefined,
        valid_until: validUntil || undefined,
      };

      const quotation = isEditMode && editingQuotationId
        ? await patchQuotation(String(editingQuotationId), basePayload)
        : await createQuotation(basePayload);

      const itemsPayload = validItems.map((item, index) => ({
        quotation_id: quotation.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        sku: item.sku || null,
        quantity: item.quantity,
        cost_price: round2(item.cost_price || 0),
        unit_price: round2(item.unit_price),
        iva_percent: item.iva_percent,
        discount_percent: item.discount_percent || 0,
        line_total: round2(item.line_total),
        notes: item.notes || undefined,
        image_url: item.image_url || null,
        manual_entry: item.line_type === "free",
        sort_order: index,
      }));

      if (isEditMode && editingQuotationId) {
        await replaceQuotationItems(String(editingQuotationId), itemsPayload);
      } else {
        await createQuotationItems(itemsPayload);
      }

      setQuotationId(quotation.id);
      toast({ title: `Orçamento ${quotation.quotation_number || ''} guardado com sucesso!` });
      setShowPreview(true);

      // Registar automaticamente no histórico do cliente (separador "Histórico")
      try {
        await createInteraction.mutateAsync({
          type: "quotation",
          direction: "out",
          status: "done",
          source: "crm",
          occurred_at: new Date().toISOString(),
          contact_id: normalizeContactIdForDirectus(contactId),
          summary: isEditMode
            ? `Orçamento atualizado: ${String(quotation.quotation_number || quotation.id)}`
            : `Orçamento criado: ${String(quotation.quotation_number || quotation.id)}`,
          payload: {
            kind: isEditMode ? "quotation_updated" : "quotation_created",
            quotation_id: String(quotation.id),
            quotation_number: String(quotation.quotation_number || ""),
          },
        } as any);
      } catch {
        // best-effort: não bloquear o fluxo do orçamento
      }
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      const msg = String((error as any)?.message || error || "");
      if (msg.includes("invalid input syntax for type uuid") && (msg.includes("customer_id") || msg.includes("contacts"))) {
        toast({
          title: "Erro de modelo no Directus (ID do cliente)",
          description:
            "O teu Directus está a tentar gravar `customer_id` como UUID, mas o teu `contacts.id` é inteiro (ex: 40). Corrige o Data Model: recria `quotations.customer_id` como Integer (M2O) para `contacts.id`.",
          variant: "destructive",
        });
      } else {
        toast({ title: 'Erro ao criar orçamento', description: msg || undefined, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setItems([]);
    setNotes('');
    setTermsConditions('');
    setInternalNotes('');
    setValidUntil('');
    setQuotationId(null);
    setShowPreview(false);
    setSearchItemId(null);
    setSearchQuery("");
    clearResults();
    setPickerOpen(false);
    setPickerTargetId(null);
    onComplete?.();
    onOpenChange(false);
  };

  const { subtotal, ivaTotal, total } = calculateTotals();

  const formatEUR = useMemo(() => {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
  }, []);

  // Product picker modal (search like the website)
  const activePickerLine = items.find((i) => i.id === pickerTargetId) || null;

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
      <DialogContent className="w-[98vw] max-w-[1400px] h-[96vh] max-h-[96vh] overflow-hidden flex flex-col">
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPickerForLine(items[items.length - 1]?.id || generateItemId(), "")}
                      title="Abrir pesquisa de produtos"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Pesquisar
                    </Button>
                    <Button size="sm" variant="outline" onClick={addNewItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Linha
                    </Button>
                  </div>
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
                            <div className="space-y-2">
                              {item.image_url ? (
                                <img
                                  src={String(item.image_url)}
                                  alt={item.product_name || item.sku || "Produto"}
                                  className="w-full h-28 object-contain bg-muted rounded-md border"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                                  }}
                                />
                              ) : null}
                              <div className="flex items-end justify-between gap-2">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Produto (nome)</Label>
                                  <Input
                                    value={item.product_name}
                                    onChange={(e) => updateItem(item.id, "product_name", e.target.value)}
                                    placeholder="Nome do produto…"
                                    className="h-9"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9"
                                  onClick={() => openPickerForLine(item.id, item.product_name || item.sku || "")}
                                >
                                  <Search className="h-4 w-4 mr-2" />
                                  Procurar
                                </Button>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">SKU</Label>
                                <Input
                                  value={item.sku}
                                  onChange={(e) => updateItem(item.id, "sku", e.target.value)}
                                  placeholder="SKU (opcional)…"
                                  className="h-9"
                                />
                              </div>
                            </div>
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
                                min="1"
                                step="1"
                                value={String(item.quantity)}
                                onChange={(e) => {
                                  updateItem(item.id, "quantity", Number.parseInt(e.target.value, 10) || 1);
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
                              <div className="text-[11px] text-muted-foreground">
                                IVA: {formatEUR.format(computeLineIvaAmount(item))}
                              </div>
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
                        <TableHead className="w-[420px]">Produto / Linha</TableHead>
                        <TableHead className="w-[220px]">SKU</TableHead>
                        <TableHead className="w-[80px] text-center">Qtd</TableHead>
                        <TableHead className="w-[80px] text-right">Desc %</TableHead>
                        <TableHead className="w-[110px] text-right">P. Venda</TableHead>
                        <TableHead className="w-[70px] text-center">IVA %</TableHead>
                        <TableHead className="w-[110px] text-right">IVA €</TableHead>
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
                              <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                                  {item.image_url ? (
                                    <img
                                      src={String(item.image_url)}
                                      alt={item.product_name || item.sku || "Produto"}
                                      className="h-10 w-10 object-contain"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                                      }}
                                    />
                                  ) : (
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <Input
                                  value={item.product_name}
                                  onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                                  placeholder="Produto…"
                                  className="h-8"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => openPickerForLine(item.id, item.product_name || item.sku || "")}
                                  title="Pesquisar e escolher produto"
                                >
                                  <Search className="h-4 w-4" />
                                </Button>
                              </div>
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
                              onFocus={() => {
                                if (item.line_type !== "free") {
                                  setSearchItemId(item.id);
                                  setSearchQuery(item.sku || "");
                                }
                              }}
                              onChange={(e) => {
                                updateItem(item.id, 'sku', e.target.value);
                                if (item.line_type !== "free") {
                                  setSearchItemId(item.id);
                                  setSearchQuery(e.target.value);
                                }
                              }}
                              placeholder="SKU"
                              className="h-8 font-mono"
                              disabled={item.line_type === "free"}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={String(item.quantity)}
                              onChange={(e) => {
                                updateItem(item.id, 'quantity', Number.parseInt(e.target.value, 10) || 1);
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
                          <TableCell className="align-top text-right font-medium">
                            {formatEUR.format(computeLineIvaAmount(item))}
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

            {/* Condições / Notas / Validade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="terms_conditions">Condições (pagamento, entrega, etc.) — visível no PDF</Label>
                  <textarea
                    id="terms_conditions"
                    value={termsConditions}
                    onChange={(e) => setTermsConditions(e.target.value)}
                    placeholder={"• Pagamento: 50% encomenda, 50% antes entrega\n• Prazo entrega: …\n• Garantia: …"}
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas para o cliente — visível no PDF</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas que o cliente deve ver (ex.: materiais incluídos/excluídos, observações)…"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="internal_notes">Notas internas — NÃO vai para o cliente</Label>
                  <textarea
                    id="internal_notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Notas internas (ex.: margem alvo, histórico, o que falta validar)…"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={5}
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

        <ProductSearchDialog
          open={pickerOpen}
          onOpenChange={(v) => {
            setPickerOpen(v);
            if (!v) setPickerTargetId(null);
          }}
          title="Pesquisar Produtos"
          initialQuery={searchQuery}
          pickLabel="Escolher"
          onPick={(p) => {
            if (!pickerTargetId) return;
            applyProductToItem(pickerTargetId, p);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
