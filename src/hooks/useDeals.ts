import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Deal = Tables<"deals">;
export type DealInsert = TablesInsert<"deals">;
export type DealUpdate = TablesUpdate<"deals">;

export type DealItem = Tables<"deal_items">;
export type DealItemInsert = TablesInsert<"deal_items">;

export const DEAL_STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
] as const;

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          customer:contacts(id, company_name, contact_name),
          manufacturer:manufacturers(id, name),
          quotations:quotations(id, pdf_link, status)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          customer:contacts(*),
          manufacturer:manufacturers(*),
          items:deal_items(*)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: DealInsert) => {
      const { data, error } = await supabase
        .from("deals")
        .insert(deal)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...deal }: DealUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("deals")
        .update(deal)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal", data.id] });
    },
  });
}

export function useAddDealItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: DealItemInsert) => {
      const { data, error } = await supabase
        .from("deal_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deal", data.deal_id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useRemoveDealItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dealId }: { id: string; dealId: string }) => {
      const { error } = await supabase.from("deal_items").delete().eq("id", id);
      if (error) throw error;
      return dealId;
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
