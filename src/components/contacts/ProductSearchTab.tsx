import { useState, useEffect } from "react";
import { useMeilisearch, getMeilisearchSettings, type MeilisearchProduct } from "@/hooks/useMeilisearch";
import { useQuotationBuilder } from "@/contexts/QuotationBuilderContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, Copy, Package, MessageCircle, Send, Plus, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/useSettings";

interface ProductSearchTabProps {
  clientPhone?: string | null;
  showAddToQuotation?: boolean;
}

export function ProductSearchTab({ clientPhone, showAddToQuotation = false }: ProductSearchTabProps) {
  const [query, setQuery] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const { search, results, isSearching, error, clearResults } = useMeilisearch();
  const { data: settings } = useCompanySettings();
  const wooUrl = (settings as any)?.woo_url || "";
  
  // Only use quotation builder when in quotation mode
  const quotationBuilder = showAddToQuotation ? useQuotationBuilder() : null;

  const meilisearchSettings = getMeilisearchSettings();
  const isConfigured = !!meilisearchSettings.meilisearch_host;

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.trim().length >= 2) {
        search(query);
      } else {
        clearResults();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, search, clearResults]);

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    toast({ title: "SKU copiado!" });
  };

  const getProductUrl = (product: MeilisearchProduct) => {
    if (product.link) {
      return product.link;
    }
    if (wooUrl && product.sku) {
      return `${wooUrl}/produto/${product.sku}`;
    }
    return null;
  };

  const getProductImage = (product: MeilisearchProduct) => {
    const p: any = product as any;
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

  const getProductName = (product: MeilisearchProduct) => {
    return product.title || product.name;
  };

  const getProductDescription = (product: MeilisearchProduct) => {
    return product.content || product.description || null;
  };

  const handleSendWhatsApp = (product: MeilisearchProduct, customUrl?: string) => {
    const productUrl = customUrl || getProductUrl(product);
    if (!productUrl) {
      setShowManualInput(product.id);
      return;
    }

    const phone = clientPhone?.replace(/\D/g, '') || '';
    const message = encodeURIComponent(`Olá! Veja este produto: ${getProductName(product)}\n${productUrl}`);
    
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      navigator.clipboard.writeText(productUrl);
      toast({ title: "Link copiado! Cole no WhatsApp." });
    }
    setShowManualInput(null);
    setManualUrl("");
  };

  const handleSendManualUrl = (product: MeilisearchProduct) => {
    if (!manualUrl.trim()) {
      toast({ title: "Cole o URL do produto", variant: "destructive" });
      return;
    }
    handleSendWhatsApp(product, manualUrl.trim());
  };

  const handleAddToQuotation = (product: MeilisearchProduct) => {
    if (quotationBuilder) {
      quotationBuilder.addItem(product);
      setAddedItems(prev => new Set(prev).add(product.id));
      toast({ title: `${product.title || product.name} adicionado ao orçamento` });
      
      // Reset visual feedback after 2 seconds
      setTimeout(() => {
        setAddedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(product.id);
          return newSet;
        });
      }, 2000);
    }
  };

  if (!isConfigured) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Meilisearch não configurado</p>
        <p className="text-xs text-muted-foreground mt-1">
          Configure nas Definições para pesquisar produtos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Pesquisa de Produtos</h3>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, SKU ou categoria..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-9 text-sm"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {isSearching ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 && query.length >= 2 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum produto encontrado
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-[450px] overflow-y-auto">
          {results.map((product) => {
            const productUrl = getProductUrl(product);
            const imageUrl = getProductImage(product);
            const description = getProductDescription(product);
            
            return (
              <div
                key={product.id}
                className="flex flex-col p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Product Image */}
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={getProductName(product)}
                    className="w-full h-24 object-cover rounded-md mb-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                ) : (
                  <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center mb-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2 leading-tight">
                    {getProductName(product)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {product.sku}
                    </Badge>
                  </div>
                  {description && (
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                      {description.replace(/<[^>]*>/g, '').slice(0, 80)}...
                    </p>
                  )}
                  {product.category && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {product.category}
                    </p>
                  )}
                </div>

                {/* Price & Actions */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <span className="text-sm font-bold text-primary">
                    {product.price?.toFixed(2)}€
                  </span>
                  <div className="flex items-center gap-0.5">
                    {showAddToQuotation && (
                      <Button
                        variant={addedItems.has(product.id) ? "default" : "ghost"}
                        size="icon"
                        className={`h-6 w-6 ${addedItems.has(product.id) ? "bg-success hover:bg-success text-success-foreground" : "text-primary hover:text-primary hover:bg-primary/10"}`}
                        onClick={() => handleAddToQuotation(product)}
                        title="Adicionar ao Orçamento"
                      >
                        {addedItems.has(product.id) ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopySku(product.sku)}
                      title="Copiar SKU"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleSendWhatsApp(product)}
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    {productUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        asChild
                      >
                        <a
                          href={productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver no site"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Manual URL Input */}
                {showManualInput === product.id && (
                  <div className="mt-2 pt-2 border-t space-y-2">
                    <p className="text-[10px] text-muted-foreground">URL não disponível. Cole manualmente:</p>
                    <div className="flex gap-1">
                      <Input
                        placeholder="https://..."
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleSendManualUrl(product)}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}