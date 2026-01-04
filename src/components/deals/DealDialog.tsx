import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDeal,
  useCreateDeal,
  useUpdateDeal,
  useAddDealItem,
  useRemoveDealItem,
  DEAL_STATUSES,
} from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useManufacturers } from "@/hooks/useManufacturers";
import { getWebhookSettings } from "@/hooks/useSettings";
import { useMeilisearch, MeilisearchProduct } from "@/hooks/useMeilisearch";
import { QuotationsSection } from "./QuotationsSection";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Save,
  FileText,
  RefreshCw,
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  Euro,
  Loader2,
  Package,
} from "lucide-react";

interface DealDialogProps {
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDialog({ dealId, open, onOpenChange }: DealDialogProps) {
  const isNew = !dealId;
  const { data: deal, isLoading } = useDeal(dealId || undefined);
  const { data: contacts } = useContacts();
  const { data: manufacturers } = useManufacturers();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const addDealItem = useAddDealItem();
  const removeDealItem = useRemoveDealItem();

  const { search, results, isSearching, error: searchError, clearResults } = useMeilisearch();

  const [formData, setFormData] = useState({
    title: "",
    status: "lead",
    customer_id: "",
    manufacturer_id: "",
    total_amount: 0,
  });

  const [productSearch, setProductSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title || "",
        status: deal.status || "lead",
        customer_id: deal.customer_id || "",
        manufacturer_id: deal.manufacturer_id || "",
        total_amount: deal.total_amount || 0,
      });
    } else if (isNew) {
      setFormData({
        title: "",
        status: "lead",
        customer_id: "",
        manufacturer_id: "",
        total_amount: 0,
      });
    }
  }, [deal, isNew]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (productSearch.trim().length >= 2) {
        search(productSearch);
        setShowResults(true);
      } else {
        clearResults();
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch, search, clearResults]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Converter strings vazias para null para evitar erro de UUID
      const dataToSave = {
        ...formData,
        customer_id: formData.customer_id || null,
        manufacturer_id: formData.manufacturer_id || null,
      };

      if (isNew) {
        await createDeal.mutateAsync(dataToSave);
        toast({ title: "Negócio criado com sucesso" });
      } else if (dealId) {
        await updateDeal.mutateAsync({ id: dealId, ...dataToSave });
        toast({ title: "Negócio atualizado com sucesso" });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao guardar negócio", variant: "destructive" });
    }
  };

  const handleAddProduct = async (product: MeilisearchProduct) => {
    if (!dealId) {
      toast({ title: "Guarde o negócio primeiro", variant: "destructive" });
      return;
    }
    
    try {
      await addDealItem.mutateAsync({
        deal_id: dealId,
        product_id: product.id,
        product_name: product.title || product.name,
        sku: product.sku,
        unit_price: product.price,
        cost_price: product.cost || null,
        quantity: 1,
      });

      // REGRA 1: Auto-adicionar SKU ao sku_history do contacto
      if (formData.customer_id && product.sku) {
        try {
          const { data: contact, error: fetchError } = await supabase
            .from('contacts')
            .select('sku_history')
            .eq('id', formData.customer_id)
            .maybeSingle();
          
          if (fetchError) {
            console.error('Erro ao buscar histórico SKU:', fetchError);
          } else {
            const currentHistory: string[] = Array.isArray(contact?.sku_history) 
              ? contact.sku_history 
              : [];
            
            if (!currentHistory.includes(product.sku)) {
              const newHistory = [...currentHistory, product.sku];
              const { error: updateError } = await supabase
                .from('contacts')
                .update({ sku_history: newHistory })
                .eq('id', formData.customer_id);
              
              if (updateError) {
                console.error('Erro ao atualizar histórico SKU:', updateError);
              } else {
                console.log('SKU adicionado ao histórico:', product.sku);
                toast({ title: `SKU ${product.sku} adicionado ao histórico do cliente` });
              }
            }
          }
        } catch (skuError) {
          console.error('Erro ao adicionar SKU ao histórico:', skuError);
        }
      }

      toast({ title: "Produto adicionado" });
      setProductSearch("");
      clearResults();
      setShowResults(false);
    } catch (error) {
      toast({ title: "Erro ao adicionar produto", variant: "destructive" });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!dealId) return;
    try {
      await removeDealItem.mutateAsync({ id: itemId, dealId });
      toast({ title: "Produto removido" });
    } catch (error) {
      toast({ title: "Erro ao remover produto", variant: "destructive" });
    }
  };

  const [webhookLoading, setWebhookLoading] = useState<string | null>(null);

  const handleWebhookAction = async (action: "pdf" | "moloni" | "woo") => {
    const webhookSettings = getWebhookSettings();
    const webhookUrl =
      action === "pdf"
        ? webhookSettings.webhook_proposta_pdf
        : action === "moloni"
        ? webhookSettings.webhook_moloni_sync
        : webhookSettings.webhook_woo_checkout;

    if (!webhookUrl) {
      toast({
        title: "Webhook não configurado",
        description: "Configure o webhook nas Integrações",
        variant: "destructive",
      });
      return;
    }

    setWebhookLoading(action);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, deal }),
      });

      if (response.ok) {
        toast({ title: "Ação executada com sucesso" });
      } else {
        throw new Error("Webhook failed");
      }
    } catch (error) {
      toast({ title: "Erro ao executar ação", variant: "destructive" });
    } finally {
      setWebhookLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Novo Negócio" : deal?.title || "Detalhe do Negócio"}
          </DialogTitle>
          <DialogDescription>
            {isNew ? "Preencha os dados para criar um novo negócio" : "Gerir detalhes, produtos e orçamentos"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && !isNew ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Integration Actions - Only show for existing deals */}
            {!isNew && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWebhookAction("pdf")}
                    disabled={webhookLoading === "pdf"}
                  >
                    {webhookLoading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                    Gerar Proposta PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWebhookAction("moloni")}
                    disabled={webhookLoading === "moloni"}
                  >
                    {webhookLoading === "moloni" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Sincronizar Moloni
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWebhookAction("woo")}
                    disabled={webhookLoading === "woo"}
                  >
                    {webhookLoading === "woo" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                    Checkout WooCommerce
                  </Button>
                </div>
                <Separator />
              </>
            )}

            {/* Form Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Nome do negócio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => handleChange("customer_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts?.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Fornecedor</Label>
                <Select
                  value={formData.manufacturer_id}
                  onValueChange={(value) => handleChange("manufacturer_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers?.map((manufacturer) => (
                      <SelectItem key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">Valor Total</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) =>
                      handleChange("total_amount", parseFloat(e.target.value) || 0)
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Products Section - Only for existing deals */}
            {!isNew && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produtos
                  </Label>
                  
                  {/* Product Search */}
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar produtos no Meilisearch..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10 pr-10"
                        onFocus={() => results.length > 0 && setShowResults(true)}
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Search Error */}
                    {searchError && (
                      <p className="text-xs text-destructive mt-1">{searchError}</p>
                    )}

                    {/* Search Results Dropdown */}
                    {showResults && results.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg">
                        <ScrollArea className="max-h-64">
                          <div className="divide-y">
                            {results.map((product) => (
                              <div
                                key={product.id}
                                className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                                onClick={() => handleAddProduct(product)}
                              >
                                {/* Product Image */}
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded-md border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {product.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono">{product.sku}</span>
                                    {product.category && (
                                      <>
                                        <span>•</span>
                                        <span>{product.category}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary" className="font-mono">
                                    {product.price?.toLocaleString("pt-PT", {
                                      style: "currency",
                                      currency: "EUR",
                                    })}
                                  </Badge>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* No results */}
                    {showResults && !isSearching && productSearch.length >= 2 && results.length === 0 && !searchError && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
                        Nenhum produto encontrado
                      </div>
                    )}
                  </div>

                  {/* Deal Items */}
                  {deal?.items && deal.items.length > 0 ? (
                    <div className="border rounded-lg divide-y">
                      {deal.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.product_name || "Produto"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-mono">{item.sku}</span>
                              <span className="mx-1">•</span>
                              Qtd: {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-medium font-mono">
                              {(item.unit_price || 0).toLocaleString("pt-PT", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 text-center">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Sem produtos adicionados
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pesquise acima para adicionar produtos ao orçamento
                      </p>
                    </div>
                  )}
                </div>

                {/* Quotations Section */}
                <Separator />
                <QuotationsSection dealId={dealId} customerId={formData.customer_id} />
              </>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={createDeal.isPending || updateDeal.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {isNew ? "Criar Negócio" : "Guardar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
