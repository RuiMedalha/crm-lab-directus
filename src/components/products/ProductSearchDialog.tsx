import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Plus, ExternalLink } from "lucide-react";
import { useMeilisearch, type MeilisearchProduct, getMeilisearchSettings } from "@/hooks/useMeilisearch";
import { useCompanySettings } from "@/hooks/useSettings";

export interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  initialQuery?: string;
  onPick: (product: MeilisearchProduct) => void;
  pickLabel?: string;
}

function getProductImage(product: MeilisearchProduct) {
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
}

function getProductName(product: MeilisearchProduct) {
  return product.title || product.name;
}

function getProductUrl(product: MeilisearchProduct, wooUrl: string) {
  if ((product as any).link) return (product as any).link as string;
  if (wooUrl && product.sku) return `${wooUrl.replace(/\/+$/, "")}/produto/${product.sku}`;
  return null;
}

export function ProductSearchDialog({
  open,
  onOpenChange,
  title = "Pesquisar Produtos",
  initialQuery = "",
  onPick,
  pickLabel = "Adicionar",
}: ProductSearchDialogProps) {
  const { search, results, isSearching, error, clearResults } = useMeilisearch();
  const { data: settings } = useCompanySettings();
  const wooUrl = (settings as any)?.woo_url || "";

  const [query, setQuery] = useState(initialQuery);

  const isConfigured = useMemo(() => {
    const s = getMeilisearchSettings();
    // Mesmo sem host, podemos usar proxy via Directus (ver useMeilisearch)
    return true;
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery || "");
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (query.trim().length >= 2) search(query);
      else clearResults();
    }, 250);
    return () => clearTimeout(t);
  }, [open, query, search, clearResults]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-6xl h-[92vh] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, SKU ou categoria…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {error ? <div className="text-xs text-destructive">{error}</div> : null}
          {!isConfigured ? (
            <div className="text-xs text-muted-foreground">
              Meilisearch não configurado. Configure nas Definições ou use o proxy no Directus.
            </div>
          ) : null}
        </div>

        <ScrollArea className="flex-1 mt-4 pr-2">
          {isSearching ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-56 w-full rounded-lg" />
              ))}
            </div>
          ) : results.length === 0 && query.trim().length >= 2 ? (
            <div className="text-sm text-muted-foreground text-center py-10">Nenhum produto encontrado</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-6">
              {results.map((p) => {
                const img = getProductImage(p);
                const url = getProductUrl(p, wooUrl);
                return (
                  <div key={String(p.id)} className="rounded-lg border bg-card overflow-hidden flex flex-col">
                    {img ? (
                      <img
                        src={img}
                        alt={getProductName(p)}
                        className="h-32 w-full object-cover bg-muted"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="h-32 w-full bg-muted flex items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="text-xs font-medium line-clamp-2">{getProductName(p)}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 truncate">
                          {p.sku || "—"}
                        </Badge>
                        <div className="text-sm font-bold text-primary">{Number(p.price || 0).toFixed(2)}€</div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            onPick(p);
                            onOpenChange(false);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {pickLabel}
                        </Button>
                        {url ? (
                          <Button variant="outline" size="sm" className="h-8" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir no site">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

