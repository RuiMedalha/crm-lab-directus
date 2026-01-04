import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, ShoppingCart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface SkuHistorySectionProps {
  contactId: string;
  skuHistory: string[];
}

export function SkuHistorySection({ contactId, skuHistory }: SkuHistorySectionProps) {
  const queryClient = useQueryClient();
  const [newSku, setNewSku] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const handleAddSku = async () => {
    if (!newSku.trim()) {
      toast({ title: "Digite um SKU", variant: "destructive" });
      return;
    }

    const trimmedSku = newSku.trim().toUpperCase();
    if (skuHistory.includes(trimmedSku)) {
      toast({ title: "SKU já existe no histórico", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    try {
      const updatedHistory = [...skuHistory, trimmedSku];
      const { error } = await supabase
        .from('contacts')
        .update({ sku_history: updatedHistory })
        .eq('id', contactId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      toast({ title: `SKU ${trimmedSku} adicionado` });
      setNewSku("");
    } catch (error) {
      console.error('Erro ao adicionar SKU:', error);
      toast({ title: "Erro ao adicionar SKU", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSku = async (sku: string) => {
    setIsRemoving(sku);
    try {
      const updatedHistory = skuHistory.filter(s => s !== sku);
      const { error } = await supabase
        .from('contacts')
        .update({ sku_history: updatedHistory })
        .eq('id', contactId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      toast({ title: `SKU ${sku} removido` });
    } catch (error) {
      console.error('Erro ao remover SKU:', error);
      toast({ title: "Erro ao remover SKU", variant: "destructive" });
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Histórico de SKUs</h3>
        <Badge variant="secondary" className="text-xs">
          {skuHistory.length} SKU{skuHistory.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Add SKU Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar SKU..."
          value={newSku}
          onChange={(e) => setNewSku(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAddSku()}
          className="h-8 text-sm font-mono"
        />
        <Button 
          size="sm" 
          onClick={handleAddSku} 
          disabled={isAdding}
          className="h-8 px-3"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* SKU List */}
      {skuHistory.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum SKU no histórico. Os SKUs são adicionados automaticamente quando adiciona produtos a orçamentos.
        </p>
      ) : (
        <ScrollArea className="h-48">
          <div className="space-y-1.5">
            {skuHistory.map((sku) => (
              <div
                key={sku}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 group"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-sm">{sku}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveSku(sku)}
                  disabled={isRemoving === sku}
                >
                  {isRemoving === sku ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
