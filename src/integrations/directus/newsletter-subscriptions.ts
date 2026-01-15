import { directusRequest } from "@/integrations/directus/client";

export interface NewsletterSubscription {
  id: string;
  email: string;
  phone?: string | null;
  full_name?: string | null;
  whatsapp_opt_in?: boolean | null;
  coupon_code?: string | null;
  coupon_wc_id?: number | null;
  coupon_expires_at?: string | null;
  mautic_contact_id?: number | null;
  chatwoot_contact_id?: number | null;
  status?: "active" | "unsubscribed" | string | null;
  created_at?: string | null;
  last_seen_at?: string | null;
  source?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
}

const COLLECTION = "newsletter_subscriptions";

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function listNewsletterSubscriptions(params?: { search?: string; limit?: number; page?: number }) {
  const limit = params?.limit ?? 200;
  const page = params?.page ?? 1;
  const search = (params?.search || "").trim();

  const q: Record<string, string | number | undefined | null> = {
    limit,
    page,
    sort: "-id",
    fields: "*",
  };

  if (search) {
    q["filter[_or][0][email][_icontains]"] = search;
    q["filter[_or][1][phone][_icontains]"] = search;
    q["filter[_or][2][coupon_code][_icontains]"] = search;
  }

  const res = await directusRequest<{ data: NewsletterSubscription[] }>(`/items/${COLLECTION}${qs(q)}`);
  return res?.data || [];
}

export async function upsertNewsletterSubscriptionByEmail(input: Partial<NewsletterSubscription> & { email: string }) {
  const email = String(input.email || "").trim().toLowerCase();
  const existing = await directusRequest<{ data: NewsletterSubscription[] }>(
    `/items/${COLLECTION}${qs({ limit: 1, fields: "*", ["filter[email][_eq]"]: email })}`
  );
  const row = existing?.data?.[0];
  if (row?.id) {
    const res = await directusRequest<{ data: NewsletterSubscription }>(`/items/${COLLECTION}/${encodeURIComponent(String(row.id))}`, {
      method: "PATCH",
      body: JSON.stringify({ ...input, email }),
    });
    return res.data;
  }
  const res = await directusRequest<{ data: NewsletterSubscription }>(`/items/${COLLECTION}`, {
    method: "POST",
    body: JSON.stringify({ ...input, email }),
  });
  return res.data;
}

