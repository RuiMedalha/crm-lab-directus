import { directusRequest } from "@/integrations/directus/client";

export interface NewsletterIdentityMap {
  id: string;
  email_normalized?: string | null;
  phone_e164?: string | null;
  directus_contact_id?: string | null;
  subscription_id?: string | null;
  confidence?: number | null;
  matched_by?: "email" | "phone" | "both" | "manual" | string | null;
  last_verified_at?: string | null;
}

const COLLECTION = "newsletter_identity_map";

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function normalizeEmail(email?: string | null) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone?: string | null) {
  return String(phone || "").trim();
}

export async function findIdentityMap(params: { email?: string | null; phone?: string | null }) {
  const email = normalizeEmail(params.email);
  const phone = normalizePhone(params.phone);
  if (!email && !phone) return null;

  const res = await directusRequest<{ data: NewsletterIdentityMap[] }>(
    `/items/${COLLECTION}${qs({
      limit: 1,
      fields: "*",
      ...(email ? { ["filter[_or][0][email_normalized][_eq]"]: email } : {}),
      ...(phone ? { ["filter[_or][1][phone_e164][_eq]"]: phone } : {}),
    })}`
  );
  return res?.data?.[0] || null;
}

export async function upsertIdentityMap(input: Omit<NewsletterIdentityMap, "id"> & { email?: string | null; phone?: string | null }) {
  const email_normalized = normalizeEmail(input.email || input.email_normalized || null) || null;
  const phone_e164 = normalizePhone(input.phone || input.phone_e164 || null) || null;
  if (!email_normalized && !phone_e164) throw new Error("Precisa de email ou phone para identity_map.");

  const existing = await findIdentityMap({ email: email_normalized, phone: phone_e164 });
  const payload: Partial<NewsletterIdentityMap> = {
    ...input,
    email_normalized,
    phone_e164,
  };

  if (existing?.id) {
    const res = await directusRequest<{ data: NewsletterIdentityMap }>(`/items/${COLLECTION}/${encodeURIComponent(String(existing.id))}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res?.data || null;
  }

  const res = await directusRequest<{ data: NewsletterIdentityMap }>(`/items/${COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res?.data || null;
}

