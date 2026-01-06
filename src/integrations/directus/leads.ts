import { directusRequest } from "@/integrations/directus/client";

const DIRECTUS_LEADS_COLLECTION = import.meta.env.VITE_DIRECTUS_LEADS_COLLECTION || "leads";

export type LeadSource =
  | "phone"
  | "central"
  | "whatsapp"
  | "typebot"
  | "chatwoot"
  | "email"
  | "web"
  | string;

export type LeadStatus = "incoming" | "ongoing" | "missed" | "rejected" | "spam" | "discarded" | "processed" | string;

export interface LeadAttempt {
  at: string; // ISO
  source?: LeadSource;
  note?: string;
}

export interface LeadItem {
  id: string;
  // Directus system fields
  date_created?: string | null;
  date_updated?: string | null;
  status?: LeadStatus | null;
  source?: LeadSource | null;
  /**
   * Optional id to trace the external event that generated this lead
   * (ex: Supabase calls.id, Chatwoot conversation id, etc.).
   */
  source_event_id?: string | null;
  phone?: string | null;
  email?: string | null;
  display_name?: string | null;
  nif?: string | null;
  dedupe_key?: string | null;
  attempt_count?: number | null;
  attempt_log?: LeadAttempt[] | null;
  first_attempt_at?: string | null;
  last_attempt_at?: string | null;
  contact_id?: string | null;
  notes?: string | null;
  claimed_by?: string | null;
  claimed_at?: string | null;
  discarded_at?: string | null;
}

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-9);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function computeDedupeKey(input: { phone?: string | null; email?: string | null }) {
  const phone = input.phone ? normalizePhone(input.phone) : "";
  if (phone && phone.length >= 6) return `phone:${phone}`;
  const email = input.email ? normalizeEmail(input.email) : "";
  if (email) return `email:${email}`;
  return "";
}

export async function fetchLatestIncomingLead(): Promise<LeadItem | null> {
  const res = await directusRequest<{ data: LeadItem[] }>(
    `/items/${DIRECTUS_LEADS_COLLECTION}${qs({
      limit: 1,
      sort: "-date_created",
      fields: "*",
      "filter[status][_eq]": "incoming",
    })}`
  );
  return res?.data?.[0] || null;
}

export async function fetchMissedLeads(): Promise<LeadItem[]> {
  const res = await directusRequest<{ data: LeadItem[] }>(
    `/items/${DIRECTUS_LEADS_COLLECTION}${qs({
      limit: 200,
      sort: "-last_attempt_at,-date_created",
      fields: "*",
      "filter[status][_eq]": "missed",
    })}`
  );
  return res?.data || [];
}

export async function createLead(payload: Partial<LeadItem>): Promise<LeadItem> {
  const res = await directusRequest<{ data: LeadItem }>(`/items/${DIRECTUS_LEADS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function patchLead(id: string, patch: Partial<LeadItem>): Promise<LeadItem> {
  const res = await directusRequest<{ data: LeadItem }>(`/items/${DIRECTUS_LEADS_COLLECTION}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.data;
}

export async function deleteLead(id: string): Promise<void> {
  await directusRequest(`/items/${DIRECTUS_LEADS_COLLECTION}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function markLeadMissedWithAggregation(lead: LeadItem): Promise<{ keptId: string }> {
  const now = new Date().toISOString();
  const dedupe_key = lead.dedupe_key || computeDedupeKey({ phone: lead.phone, email: lead.email });

  // If we can't dedupe, just mark missed on the same record
  if (!dedupe_key) {
    await patchLead(lead.id, {
      status: "missed",
      last_attempt_at: now,
      first_attempt_at: lead.first_attempt_at || lead.date_created || now,
      attempt_count: Math.max(lead.attempt_count || 0, 1),
      attempt_log: Array.isArray(lead.attempt_log) && lead.attempt_log.length > 0 ? lead.attempt_log : [{ at: now, source: lead.source || undefined }],
    });
    return { keptId: lead.id };
  }

  // Try to find an existing missed record with same dedupe_key (the “single card” rule)
  const search = await directusRequest<{ data: LeadItem[] }>(
    `/items/${DIRECTUS_LEADS_COLLECTION}${qs({
      limit: 1,
      sort: "-last_attempt_at,-date_created",
      fields: "id,attempt_count,attempt_log,first_attempt_at,date_created",
      "filter[status][_eq]": "missed",
      "filter[dedupe_key][_eq]": dedupe_key,
    })}`
  );
  const existing = search?.data?.[0] || null;

  if (existing && existing.id && existing.id !== lead.id) {
    const prevCount = existing.attempt_count || 1;
    const prevLog = Array.isArray(existing.attempt_log) ? existing.attempt_log : [];
    const nextLog: LeadAttempt[] = [{ at: now, source: lead.source || undefined }, ...prevLog].slice(0, 30);

    await patchLead(existing.id, {
      attempt_count: prevCount + 1,
      attempt_log: nextLog,
      last_attempt_at: now,
      first_attempt_at: existing.first_attempt_at || existing.date_created || now,
    });

    // Remove the duplicate record (optional; matches your “não cria vários cards” requirement)
    await deleteLead(lead.id);

    return { keptId: existing.id };
  }

  // No existing missed lead → mark this one as missed
  const prevLog = Array.isArray(lead.attempt_log) ? lead.attempt_log : [];
  const nextLog: LeadAttempt[] = [{ at: now, source: lead.source || undefined }, ...prevLog].slice(0, 30);

  await patchLead(lead.id, {
    status: "missed",
    dedupe_key,
    attempt_count: Math.max(lead.attempt_count || 0, 1),
    attempt_log: nextLog,
    last_attempt_at: now,
    first_attempt_at: lead.first_attempt_at || lead.date_created || now,
  });

  return { keptId: lead.id };
}

