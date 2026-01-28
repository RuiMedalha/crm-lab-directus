import { directusRequest } from "@/integrations/directus/client";

/**
 * Contacts access layer for Directus.
 *
 * Goals:
 * - Keep existing frontend keys (company_name, nif, phone, etc.)
 * - Avoid “Payload Invalid” by:
 *   - optional env field-map
 *   - filtering payload to existing Directus fields (schema discovery)
 */

type FieldMap = Record<string, string>;

export interface ContactItem {
  id: string;
  // Common fields (may vary by field map)
  company_name?: string | null;
  contact_name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  full_name?: string | null;
  nif?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp_number?: string | null;
  whatsapp_opt_in?: boolean | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  website?: string | null;
  date_created?: string | null;
  tags?: unknown;
  quick_notes?: unknown;
  sku_history?: unknown;
  notes?: string | null;
  internal_notes?: string | null;
  source?: string | null;
  source_call_id?: string | null;
  moloni_client_id?: string | null;
  accept_newsletter?: boolean | null;
  newsletter_welcome_sent?: boolean | null;
  newsletter_consent_at?: string | null;
  newsletter_consent_source?: string | null;
  newsletter_consent_user_agent?: string | null;
  newsletter_consent_version?: string | null;
  newsletter_unsubscribed_at?: string | null;
  coupon_code?: string | null;
  coupon_used?: boolean | null;
  coupon_wc_id?: number | null;
  coupon_expires_at?: string | null;
  mautic_contact_id?: number | null;
  chatwoot_contact_id?: number | null;
  newsletter_source?: string | null;
  subscribed_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  last_seen_at?: string | null;
  newsletter_notes?: string | null;
  delivery_addresses?: unknown;
  logistics_notes?: string | null;
  commercial_notes?: string | null;

  // assignments
  assigned_employee_id?: any;
  assigned_by_employee_id?: any;
  assigned_at?: string | null;

  // Allow future fields without breaking types
  [k: string]: unknown;
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const DIRECTUS_CONTACTS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_CONTACTS_COLLECTION || "contacts";

export const DIRECTUS_CONTACT_FIELD_MAP: FieldMap = safeJsonParse<FieldMap>(
  import.meta.env.VITE_DIRECTUS_CONTACT_FIELD_MAP,
  {}
);

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function invertMap(map: FieldMap) {
  return Object.entries(map).reduce<Record<string, string>>((acc, [frontendKey, directusKey]) => {
    acc[directusKey] = frontendKey;
    return acc;
  }, {});
}

export function mapToDirectusPayload(frontendPatch: Record<string, unknown>, allowedFields?: Set<string>) {
  const payload: Record<string, unknown> = {};
  Object.entries(frontendPatch || {}).forEach(([k, v]) => {
    const directusKey = DIRECTUS_CONTACT_FIELD_MAP[k] || k;
    if (allowedFields && !allowedFields.has(directusKey)) return;
    payload[directusKey] = v;
  });
  return payload;
}

export function mapFromDirectusItem(item: any): ContactItem | null {
  if (!item) return null;
  const inverse = invertMap(DIRECTUS_CONTACT_FIELD_MAP);
  const out: any = { ...item };
  Object.keys(inverse).forEach((directusKey) => {
    if (directusKey in out) {
      const feKey = inverse[directusKey];
      out[feKey] = out[directusKey];
      if (feKey !== directusKey) delete out[directusKey];
    }
  });
  return out as ContactItem;
}

let fieldsCache: Record<string, { at: number; fields: Set<string> }> = {};
const FIELDS_CACHE_TTL_MS = 60_000;

const DEFAULT_CONTACT_FIELDS = new Set<string>([
  "id",
  "date_created",
  "company_name",
  "contact_name",
  "firstname",
  "lastname",
  "full_name",
  "nif",
  "phone",
  "email",
  "whatsapp_number",
  "whatsapp_opt_in",
  "address",
  "postal_code",
  "city",
  "website",
  "accept_newsletter",
  "newsletter_welcome_sent",
  "newsletter_consent_at",
  "newsletter_consent_source",
  "newsletter_consent_user_agent",
  "newsletter_consent_version",
  "newsletter_unsubscribed_at",
  "coupon_code",
  "coupon_used",
  "coupon_wc_id",
  "coupon_expires_at",
  "mautic_contact_id",
  "chatwoot_contact_id",
  "newsletter_source",
  "subscribed_at",
  "status",
  "created_at",
  "last_seen_at",
  "newsletter_notes",
  "tags",
  "quick_notes",
  "sku_history",
  "contact_person",
  "contact_phone",
  "contact_email",
  "internal_notes",
  "notes",
  "delivery_addresses",
  "logistics_notes",
  "commercial_notes",
  "assigned_employee_id",
  "assigned_by_employee_id",
  "assigned_at",
  "moloni_client_id",
  "source",
  "source_call_id",
]);

export async function getCollectionFields(collection = DIRECTUS_CONTACTS_COLLECTION): Promise<Set<string>> {
  const key = collection;
  const now = Date.now();
  const cached = fieldsCache[key];
  if (cached && now - cached.at < FIELDS_CACHE_TTL_MS) return cached.fields;

  try {
    // Directus endpoint: GET /fields/{collection}
    const res = await directusRequest<{ data: Array<{ field: string }> }>(`/fields/${encodeURIComponent(collection)}`);
    const set = new Set<string>((res?.data || []).map((f) => f.field).filter(Boolean));
    fieldsCache[key] = { at: now, fields: set };
    return set;
  } catch {
    // Fallback: still allow saving the known CRM fields (works even if /fields is restricted).
    fieldsCache[key] = { at: now, fields: DEFAULT_CONTACT_FIELDS };
    return DEFAULT_CONTACT_FIELDS;
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function directusFieldListForContacts(): string {
  /**
   * IMPORTANT:
   * For collections where Directus field keys differ from frontend keys (ex: telefone vs phone),
   * requesting unknown fields can trigger 403. So here we only request:
   * - id
   * - mapped Directus field keys (values of VITE_DIRECTUS_CONTACT_FIELD_MAP)
   */
  const mapped = Object.values(DIRECTUS_CONTACT_FIELD_MAP || {}).filter(Boolean);
  // If no mapping is provided, request a safe set of known CRM fields.
  const base = mapped.length ? mapped : Array.from(DEFAULT_CONTACT_FIELDS);
  const fields = unique(["id", "date_created", ...base]).filter(Boolean);
  return fields.join(",") || "id";
}

export async function getContactById(id: string): Promise<ContactItem | null> {
  const res = await directusRequest<{ data: ContactItem }>(
    `/items/${DIRECTUS_CONTACTS_COLLECTION}/${encodeURIComponent(id)}${qs({ fields: "*" })}`
  );
  return mapFromDirectusItem(res?.data);
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-9);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findDuplicateContact(input: {
  nif?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<ContactItem | null> {
  const cleanNif = (input.nif || "").trim();
  const cleanPhone = (input.phone || "").trim();
  const cleanEmail = (input.email || "").trim();

  // Prefer NIF (more reliable)
  if (cleanNif && cleanNif.length >= 9) {
    const nifKey = DIRECTUS_CONTACT_FIELD_MAP.nif || "nif";
    const res = await directusRequest<{ data: ContactItem[] }>(
      `/items/${DIRECTUS_CONTACTS_COLLECTION}${qs({
        limit: 1,
        fields: "*",
        [`filter[${nifKey}][_eq]`]: cleanNif,
      })}`
    );
    const item = res?.data?.[0];
    return item ? mapFromDirectusItem(item) : null;
  }

  // Then phone across keys
  if (cleanPhone && cleanPhone.length >= 6) {
    const phoneKey = DIRECTUS_CONTACT_FIELD_MAP.phone || "phone";
    const waKey = DIRECTUS_CONTACT_FIELD_MAP.whatsapp_number || "whatsapp_number";
    const contactPhoneKey = DIRECTUS_CONTACT_FIELD_MAP.contact_phone || "contact_phone";
    const normalized = normalizePhone(cleanPhone);
    const res = await directusRequest<{ data: ContactItem[] }>(
      `/items/${DIRECTUS_CONTACTS_COLLECTION}${qs({
        limit: 1,
        fields: "*",
        [`filter[_or][0][${phoneKey}][_ends_with]`]: normalized,
        [`filter[_or][1][${waKey}][_ends_with]`]: normalized,
        [`filter[_or][2][${contactPhoneKey}][_ends_with]`]: normalized,
      })}`
    );
    const item = res?.data?.[0];
    return item ? mapFromDirectusItem(item) : null;
  }

  // Then email
  if (cleanEmail) {
    const emailKey = DIRECTUS_CONTACT_FIELD_MAP.email || "email";
    const res = await directusRequest<{ data: ContactItem[] }>(
      `/items/${DIRECTUS_CONTACTS_COLLECTION}${qs({
        limit: 1,
        fields: "*",
        [`filter[${emailKey}][_eq]`]: normalizeEmail(cleanEmail),
      })}`
    );
    const item = res?.data?.[0];
    return item ? mapFromDirectusItem(item) : null;
  }

  return null;
}

export async function patchContact(id: string, patch: Record<string, unknown>): Promise<ContactItem> {
  const allowed = await getCollectionFields(DIRECTUS_CONTACTS_COLLECTION);
  const payload = mapToDirectusPayload(patch, allowed);
  const res = await directusRequest<{ data: ContactItem }>(
    `/items/${DIRECTUS_CONTACTS_COLLECTION}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  return mapFromDirectusItem(res?.data)!;
}

export async function createContact(payload: Record<string, unknown>): Promise<ContactItem> {
  const allowed = await getCollectionFields(DIRECTUS_CONTACTS_COLLECTION);
  const directusPayload = mapToDirectusPayload(payload, allowed);
  const res = await directusRequest<{ data: ContactItem }>(`/items/${DIRECTUS_CONTACTS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(directusPayload),
  });
  return mapFromDirectusItem(res?.data)!;
}

export async function deleteContact(id: string): Promise<void> {
  await directusRequest(`/items/${DIRECTUS_CONTACTS_COLLECTION}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listContacts(params?: {
  search?: string;
  limit?: number;
  page?: number;
}): Promise<ContactItem[]> {
  const limit = params?.limit ?? 200;
  const page = params?.page ?? 1;
  const search = (params?.search || "").trim();

  const nameKey = DIRECTUS_CONTACT_FIELD_MAP.company_name || "company_name";
  const nifKey = DIRECTUS_CONTACT_FIELD_MAP.nif || "nif";
  const phoneKey = DIRECTUS_CONTACT_FIELD_MAP.phone || "phone";
  const emailKey = DIRECTUS_CONTACT_FIELD_MAP.email || "email";

  const q: Record<string, string | number | undefined | null> = {
    limit,
    page,
    // Avoid system fields permission issues; sort by id (works for int/uuid).
    sort: "-id",
    /**
     * IMPORTANT:
     * Use fields="*" to keep the URL short.
     * Some setups (e.g. Cloudflare/WAF) can block very long query strings when we enumerate many fields.
     *
     * If your policies restrict fields, adjust Directus permissions to allow the required fields.
     */
    fields: "*",
  };

  if (search) {
    q[`filter[_or][0][${nameKey}][_icontains]`] = search;
    q[`filter[_or][1][${nifKey}][_icontains]`] = search;
    q[`filter[_or][2][${phoneKey}][_icontains]`] = search;
    q[`filter[_or][3][${emailKey}][_icontains]`] = search;
  }

  const res = await directusRequest<{ data: any[] }>(`/items/${DIRECTUS_CONTACTS_COLLECTION}${qs(q)}`);
  return (res?.data || []).map((i) => mapFromDirectusItem(i)!).filter(Boolean);
}

