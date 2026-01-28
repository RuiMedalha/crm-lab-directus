import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { MeilisearchProduct } from '@/hooks/useMeilisearch';

export interface QuotationBuilderItem {
  id: string;
  product_name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  margin_percent: number;
  unit_price: number;
  iva_percent: number;
  line_total: number;
  image_url?: string;
  link?: string;
}

interface QuotationBuilderContextType {
  items: QuotationBuilderItem[];
  addItem: (product: MeilisearchProduct) => void;
  addManualItem: (name: string, sku?: string) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<QuotationBuilderItem>) => void;
  clearItems: () => void;
  getTotal: () => { subtotal: number; iva: number; total: number };
  itemCount: number;
}

const QuotationBuilderContext = createContext<QuotationBuilderContextType | undefined>(undefined);

const IVA_RATE = 23;
const DEFAULT_MARGIN = 30;

export function QuotationBuilderProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuotationBuilderItem[]>([]);

  const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const calculateLineTotal = (quantity: number, unitPrice: number, ivaPercent: number) => {
    const subtotal = quantity * unitPrice;
    return subtotal * (1 + ivaPercent / 100);
  };

  const addItem = useCallback((product: MeilisearchProduct) => {
    const costPrice = product.cost || product.price * 0.7; // Estimate cost if not available
    const unitPrice = product.price;
    const imageUrl = product.featured_media_url || product.image_url || product.media_url;

    const newItem: QuotationBuilderItem = {
      id: generateId(),
      product_name: product.title || product.name,
      sku: product.sku,
      quantity: 1,
      cost_price: costPrice,
      margin_percent: costPrice > 0 ? ((unitPrice - costPrice) / costPrice) * 100 : DEFAULT_MARGIN,
      unit_price: unitPrice,
      iva_percent: IVA_RATE,
      line_total: calculateLineTotal(1, unitPrice, IVA_RATE),
      image_url: imageUrl || undefined,
      link: product.link,
    };

    setItems(prev => [...prev, newItem]);
  }, []);

  const addManualItem = useCallback((name: string, sku?: string) => {
    const newItem: QuotationBuilderItem = {
      id: generateId(),
      product_name: name,
      sku: sku || '',
      quantity: 1,
      cost_price: 0,
      margin_percent: DEFAULT_MARGIN,
      unit_price: 0,
      iva_percent: IVA_RATE,
      line_total: 0,
    };

    setItems(prev => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<QuotationBuilderItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, ...updates };

      // Recalculate unit_price if cost or margin changed
      if ('cost_price' in updates || 'margin_percent' in updates) {
        const cost = updates.cost_price ?? item.cost_price;
        const margin = updates.margin_percent ?? item.margin_percent;
        if (cost > 0) {
          updated.unit_price = cost * (1 + margin / 100);
        }
      }

      // Recalculate line total
      updated.line_total = calculateLineTotal(
        updated.quantity,
        updated.unit_price,
        updated.iva_percent
      );

      return updated;
    }));
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const iva = items.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      return sum + (lineSubtotal * (item.iva_percent / 100));
    }, 0);
    return { subtotal, iva, total: subtotal + iva };
  }, [items]);

  return (
    <QuotationBuilderContext.Provider value={{
      items,
      addItem,
      addManualItem,
      removeItem,
      updateItem,
      clearItems,
      getTotal,
      itemCount: items.length,
    }}>
      {children}
    </QuotationBuilderContext.Provider>
  );
}

export function useQuotationBuilder() {
  const context = useContext(QuotationBuilderContext);
  if (context === undefined) {
    throw new Error('useQuotationBuilder must be used within a QuotationBuilderProvider');
  }
  return context;
}

// Versão "safe" para componentes que podem ser usados fora do provider (ex: tabs reutilizadas).
export function useQuotationBuilderOptional() {
  return useContext(QuotationBuilderContext);
}
