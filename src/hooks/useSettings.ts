import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompanySettings,
  upsertCompanySettings,
  type CompanySettingsItem,
  type WebhookSettings,
  getWebhookSettings,
  saveWebhookSettings,
} from "@/integrations/directus/settings";

export type CompanySettings = CompanySettingsItem;

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      return await getCompanySettings();
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CompanySettingsItem>) => {
      return await upsertCompanySettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
}

// Re-export Meilisearch settings for convenience
export { getMeilisearchSettings, saveMeilisearchSettings, type MeilisearchSettings } from "./useMeilisearch";

export { getWebhookSettings, saveWebhookSettings, type WebhookSettings };
