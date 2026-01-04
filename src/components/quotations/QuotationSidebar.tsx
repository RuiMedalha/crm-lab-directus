import { useState } from 'react';
import { useQuotationBuilder, type QuotationBuilderItem } from '@/contexts/QuotationBuilderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  FileText, 
  Package,
  X
} from 'lucide-react';
import { QuotationCreator } from './QuotationCreator';

interface QuotationSidebarProps {
  contactId: string;
  contactName: string;
  dealId?: string;
}

export function QuotationSidebar({ contactId, contactName, dealId }: QuotationSidebarProps) {
  const { items, removeItem, updateItem, clearItems, getTotal, itemCount } = useQuotationBuilder();
  const [showCreator, setShowCreator] = useState(false);
  const { subtotal, iva, total } = getTotal();

  const handleQuantityChange = (item: QuotationBuilderItem, delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    updateItem(item.id, { quantity: newQty });
  };

  const handlePriceChange = (item: QuotationBuilderItem, newPrice: number) => {
    updateItem(item.id, { unit_price: newPrice });
  };

  if (itemCount === 0) {
    return (
      <Card className="h-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-full py-8 text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Carrinho vazio</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione produtos da pesquisa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orçamento
              <Badge variant="secondary" className="ml-1">{itemCount}</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={clearItems}
            >
              Limpar
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.product_name}
                      className="w-10 h-10 rounded object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-1">{item.product_name}</p>
                    {item.sku && (
                      <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleQuantityChange(item, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleQuantityChange(item, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Input
                        type="number"
                        value={item.unit_price.toFixed(2)}
                        onChange={(e) => handlePriceChange(item, parseFloat(e.target.value) || 0)}
                        className="h-6 w-16 text-xs text-right"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex justify-end mt-1">
                  <span className="text-xs font-medium text-primary">
                    {item.line_total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-4 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{subtotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA (23%)</span>
              <span>{iva.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Total</span>
              <span className="text-primary">
                {total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>

          <Button className="w-full" onClick={() => setShowCreator(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Finalizar Orçamento
          </Button>
        </div>
      </Card>

      <QuotationCreator
        open={showCreator}
        onOpenChange={setShowCreator}
        contactId={contactId}
        contactName={contactName}
        dealId={dealId}
        initialItems={items}
        onComplete={clearItems}
      />
    </>
  );
}
