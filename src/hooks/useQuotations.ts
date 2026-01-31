import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createQuotationFromDeal,
  deleteQuotation,
  getQuotationById,
  listQuotationsByDeal,
  createQuotation,
  createQuotationItems,
  type QuotationItemRow,
  type QuotationRow,
} from "@/integrations/directus/quotations";

export interface Quotation {
  id: string;
  deal_id: string | null;
  customer_id: string | null;
  quotation_number: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  terms_conditions: string | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  cost_price: number | null;
  discount_percent: number;
  line_total: number;
  notes: string | null;
  sort_order: number;
}

export const QUOTATION_STATUSES = [
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviado" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "expired", label: "Expirado" },
];

export function useQuotationsByDeal(dealId: string | undefined) {
  return useQuery({
    queryKey: ["quotations", "deal", dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const rows = await listQuotationsByDeal(dealId);
      return (rows || []).map((q: QuotationRow) => ({
        id: q.id,
        deal_id: (q as any).deal_id ? String((q as any).deal_id) : (q as any).deal_id ?? null,
        customer_id: (q as any).customer_id ? String((q as any).customer_id) : (q as any).customer_id ?? null,
        quotation_number: String(q.quotation_number || ""),
        status: String(q.status || "draft"),
        valid_until: (q.valid_until as any) ?? null,
        notes: (q.notes as any) ?? null,
        terms_conditions: (q.terms_conditions as any) ?? null,
        subtotal: Number(q.subtotal || 0),
        discount_percent: Number(q.discount_percent || 0),
        discount_amount: Number(q.discount_amount || 0),
        total_amount: Number(q.total_amount || 0),
        created_at: String(q.date_created || ""),
        updated_at: String(q.date_updated || ""),
      })) as Quotation[];
    },
    enabled: !!dealId,
  });
}

export function useQuotation(quotationId: string | undefined) {
  return useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: async () => {
      if (!quotationId) return null;
      const { quotation, items } = await getQuotationById(quotationId);
      if (!quotation) return null;
      return {
        id: quotation.id,
        deal_id: quotation.deal_id ? String(quotation.deal_id) : null,
        customer_id: quotation.customer_id ? String(quotation.customer_id) : null,
        quotation_number: String(quotation.quotation_number || ""),
        status: String(quotation.status || "draft"),
        valid_until: quotation.valid_until ?? null,
        notes: quotation.notes ?? null,
        terms_conditions: quotation.terms_conditions ?? null,
        subtotal: Number(quotation.subtotal || 0),
        discount_percent: Number(quotation.discount_percent || 0),
        discount_amount: Number(quotation.discount_amount || 0),
        total_amount: Number(quotation.total_amount || 0),
        created_at: String(quotation.date_created || ""),
        updated_at: String(quotation.date_updated || ""),
        items: (items || []).map((i: any) => ({
          id: i.id,
          quotation_id: quotationId,
          product_id: i.product_id ?? null,
          product_name: i.product_name ?? null,
          sku: i.sku ?? null,
          quantity: Number(i.quantity || 0),
          unit_price: Number(i.unit_price || 0),
          cost_price: i.cost_price ?? null,
          discount_percent: Number(i.discount_percent || 0),
          line_total: Number(i.line_total || 0),
          notes: i.notes ?? null,
          sort_order: Number(i.sort_order || 0),
        })),
      } as Quotation;
    },
    enabled: !!quotationId,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      deal_id: string;
      customer_id?: string | null;
      valid_until?: string | null;
      notes?: string | null;
      terms_conditions?: string | null;
    }) => {
      return await createQuotation({
        deal_id: data.deal_id,
        customer_id: data.customer_id || undefined,
        valid_until: data.valid_until || undefined,
        notes: data.notes || undefined,
        terms_conditions: data.terms_conditions || undefined,
        status: "draft",
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations", "deal", variables.deal_id] });
    },
  });
}

export function useCreateQuotationFromDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { dealId: string; customerId?: string | null }) => {
      return await createQuotationFromDeal(input.dealId, input.customerId || undefined);
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["quotations", "deal", input.dealId] });
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Quotation> & { id: string }) => {
      // Minimal for now; implement when UI needs it
      return { id, ...data } as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotation", data.id] });
      if ((data as any)?.deal_id) queryClient.invalidateQueries({ queryKey: ["quotations", "deal", (data as any).deal_id] });
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dealId }: { id: string; dealId: string }) => {
      await deleteQuotation(id);
      return { id, dealId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations", "deal", variables.dealId] });
    },
  });
}
