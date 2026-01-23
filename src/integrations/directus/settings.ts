import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";

export const DIRECTUS_COMPANY_SETTINGS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_COMPANY_SETTINGS_COLLECTION || "company_settings";

export interface CompanySettingsItem {
  id: string;
  name?: string | null;
  vat_number?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  iban?: string | null;
  payment_instructions?: string | null;

  chatwoot_url?: string | null;
  chatwoot_token?: string | null;
  whatsapp_api_url?: string | null;
  typebot_url?: string | null;
  typebot_token?: string | null;

  moloni_client_id?: string | null;
  moloni_client_secret?: string | null;
  moloni_api_key?: string | null;

  woo_url?: string | null;
  woo_consumer_key?: string | null;
  woo_consumer_secret?: string | null;
}

const FIELDS = [
  "id",
  "name",
  "vat_number",
  "phone",
  "email",
  "logo_url",
  "address",
  "postal_code",
  "city",
  "iban",
  "payment_instructions",
  "chatwoot_url",
  "chatwoot_token",
  "whatsapp_api_url",
  "typebot_url",
  "typebot_token",
  "moloni_client_id",
  "moloni_client_secret",
  "moloni_api_key",
  "woo_url",
  "woo_consumer_key",
  "woo_consumer_secret",
].join(",");

export async function getCompanySettings(): Promise<CompanySettingsItem | null> {
  const fixedId = import.meta.env.VITE_DIRECTUS_COMPANY_SETTINGS_ID || "";
  if (fixedId) {
    const res = await directusRequest<{ data: CompanySettingsItem }>(
      `/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}/${encodeURIComponent(String(fixedId))}${qs({
        fields: FIELDS,
      })}`
    );
    return res.data || null;
  }

  const res = await directusRequest<{ data: CompanySettingsItem[] }>(
    `/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}${qs({
      limit: 1,
      sort: "-id",
      fields: FIELDS,
    })}`
  );
  return res.data?.[0] || null;
}

export async function upsertCompanySettings(patch: Partial<CompanySettingsItem>): Promise<CompanySettingsItem> {
  const current = await getCompanySettings().catch(() => null);
  if (current?.id) {
    const res = await directusRequest<{ data: CompanySettingsItem }>(
      `/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}/${encodeURIComponent(String(current.id))}`,
      { method: "PATCH", body: JSON.stringify(patch) }
    );
    return res.data;
  }

  const res = await directusRequest<{ data: CompanySettingsItem }>(`/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
  return res.data;
}

// Local storage for webhook settings (keep as-is: UI-only config)
const WEBHOOK_STORAGE_KEY = "hotelequip_webhook_settings";

export interface WebhookSettings {
  webhook_proposta_pdf?: string;
  webhook_moloni_sync?: string;
  webhook_woo_checkout?: string;
}

export function getWebhookSettings(): WebhookSettings {
  const stored = localStorage.getItem(WEBHOOK_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function saveWebhookSettings(settings: WebhookSettings) {
  localStorage.setItem(WEBHOOK_STORAGE_KEY, JSON.stringify(settings));
}

