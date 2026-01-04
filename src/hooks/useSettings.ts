import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type CompanySettings = Tables<"company_settings">;

export interface WebhookSettings {
  webhook_proposta_pdf?: string;
  webhook_moloni_sync?: string;
  webhook_woo_checkout?: string;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as CompanySettings | null;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: TablesUpdate<"company_settings">) => {
      const { data, error } = await supabase
        .from("company_settings")
        .update(settings)
        .eq("id", 1)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
}

// Local storage for webhook settings
const WEBHOOK_STORAGE_KEY = "hotelequip_webhook_settings";

export function getWebhookSettings(): WebhookSettings {
  const stored = localStorage.getItem(WEBHOOK_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function saveWebhookSettings(settings: WebhookSettings) {
  localStorage.setItem(WEBHOOK_STORAGE_KEY, JSON.stringify(settings));
}

// Re-export Meilisearch settings for convenience
export { getMeilisearchSettings, saveMeilisearchSettings, type MeilisearchSettings } from "./useMeilisearch";
