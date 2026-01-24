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
  chatwoot_account_id?: string | null;
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
  "chatwoot_account_id",
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

const SAFE_FIELDS = [
  "id",
  "name",
  "vat_number",
  "phone",
  "email",
  "logo_url",
  "chatwoot_url",
  "chatwoot_token",
  "chatwoot_account_id",
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

async function getCompanySettingsFields(): Promise<Set<string> | null> {
  try {
    const res = await directusRequest<{ data: Array<{ field: string }> }>(
      `/fields/${encodeURIComponent(DIRECTUS_COMPANY_SETTINGS_COLLECTION)}`
    );
    const fields = new Set<string>((res?.data || []).map((f) => f.field).filter(Boolean));
    return fields.size ? fields : null;
  } catch {
    return null;
  }
}

function filterPatchToFields(patch: Partial<CompanySettingsItem>, allowed: Set<string> | null) {
  if (!allowed) return patch;
  const out: any = {};
  Object.entries(patch || {}).forEach(([k, v]) => {
    if (!allowed.has(k)) return;
    out[k] = v;
  });
  return out as Partial<CompanySettingsItem>;
}

export async function getCompanySettings(): Promise<CompanySettingsItem | null> {
  const fixedId = import.meta.env.VITE_DIRECTUS_COMPANY_SETTINGS_ID || "";
  const readOne = async (fields: string) => {
    return await directusRequest<{ data: CompanySettingsItem }>(
      `/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}/${encodeURIComponent(String(fixedId))}${qs({ fields })}`
    );
  };
  const readList = async (fields: string) => {
    return await directusRequest<{ data: CompanySettingsItem[] }>(
      `/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}${qs({
        limit: 1,
        sort: "-id",
        fields,
      })}`
    );
  };

  const shouldFallback = (msg: string) =>
    msg.includes("permission to access fields") ||
    msg.includes("does not exist") ||
    msg.includes("Invalid query") ||
    msg.includes("Invalid field");

  try {
    if (fixedId) {
      const res = await readOne(FIELDS);
      return res.data || null;
    }
    const res = await readList(FIELDS);
    return res.data?.[0] || null;
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (!shouldFallback(msg)) throw e;
    if (fixedId) {
      const res = await readOne(SAFE_FIELDS);
      return res.data || null;
    }
    const res = await readList(SAFE_FIELDS);
    return res.data?.[0] || null;
  }
}

export async function upsertCompanySettings(patch: Partial<CompanySettingsItem>): Promise<CompanySettingsItem> {
  const allowed = await getCompanySettingsFields();
  const filtered = filterPatchToFields(patch, allowed);

  const current = await getCompanySettings().catch(() => null);
  if (current?.id) {
    const res = await directusRequest<{ data: CompanySettingsItem }>(
      `/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}/${encodeURIComponent(String(current.id))}`,
      { method: "PATCH", body: JSON.stringify(filtered) }
    );
    return res.data;
  }

  const res = await directusRequest<{ data: CompanySettingsItem }>(`/items/${DIRECTUS_COMPANY_SETTINGS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(filtered),
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

