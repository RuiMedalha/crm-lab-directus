import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";

export const DIRECTUS_INTERACTIONS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_INTERACTIONS_COLLECTION || "interactions";

type FieldInfo = { field: string; type?: string; schema?: { data_type?: string } };

let cachedFieldType: Record<string, string> | null = null;

async function getFieldTypes(): Promise<Record<string, string> | null> {
  if (cachedFieldType) return cachedFieldType;
  try {
    const res = await directusRequest<{ data: FieldInfo[] }>(`/fields/${encodeURIComponent(DIRECTUS_INTERACTIONS_COLLECTION)}`);
    const map: Record<string, string> = {};
    for (const row of res?.data || []) {
      const f = String((row as any)?.field || "").trim();
      if (!f) continue;
      const t = String((row as any)?.type || (row as any)?.schema?.data_type || "").trim().toLowerCase();
      if (t) map[f] = t;
    }
    cachedFieldType = map;
    return map;
  } catch {
    return null;
  }
}

function normalizeRelationId(value: any, expectedType?: string): any {
  // unwrap { id } patterns
  const v = value && typeof value === "object" && "id" in value ? (value as any).id : value;
  if (v === null || v === undefined || v === "") return null;

  const t = String(expectedType || "").toLowerCase();
  const s = String(v).trim();

  // If server expects integer/bigint, send Number when safe.
  if (t.includes("int")) {
    return /^\d+$/.test(s) ? Number(s) : s;
  }

  // If server expects uuid, keep string.
  if (t.includes("uuid")) {
    return s;
  }

  // fallback: keep as-is (string)
  return typeof v === "number" ? v : s;
}

export type InteractionType = "call" | "email" | "whatsapp" | "note" | string;
export type InteractionDirection = "in" | "out" | string;
export type InteractionStatus = "open" | "done" | "failed" | string;

export interface InteractionRow {
  id: string;
  type?: InteractionType | null;
  direction?: InteractionDirection | null;
  status?: InteractionStatus | null;
  source?: string | null;
  external_id?: string | null;
  occurred_at?: string | null;
  phone?: string | null;
  email?: string | null;
  display_name?: string | null;
  summary?: string | null;
  payload?: any;
  contact_id?: any;
  lead_id?: any;
  date_created?: string | null;
  date_updated?: string | null;
}

export async function listInteractions(params?: {
  contactId?: string;
  limit?: number;
  page?: number;
}): Promise<InteractionRow[]> {
  const types = await getFieldTypes().catch(() => null);
  const q: Record<string, any> = {
    limit: params?.limit ?? 200,
    page: params?.page ?? 1,
    sort: "-occurred_at,-date_created",
    fields:
      "id,type,direction,status,source,external_id,occurred_at,summary,display_name,phone,email,payload,contact_id.id,lead_id.id,date_created,date_updated",
  };
  if (params?.contactId) q["filter[contact_id][_eq]"] = normalizeRelationId(params.contactId, types?.contact_id);

  const res = await directusRequest<{ data: InteractionRow[] }>(
    `/items/${DIRECTUS_INTERACTIONS_COLLECTION}${qs(q)}`
  );
  return res.data || [];
}

export async function createInteraction(payload: Partial<InteractionRow>) {
  const types = await getFieldTypes().catch(() => null);
  const normalized: any = { ...(payload || {}) };
  if ("contact_id" in normalized) normalized.contact_id = normalizeRelationId(normalized.contact_id, types?.contact_id);
  if ("lead_id" in normalized) normalized.lead_id = normalizeRelationId(normalized.lead_id, types?.lead_id);

  const res = await directusRequest<{ data: InteractionRow }>(
    `/items/${DIRECTUS_INTERACTIONS_COLLECTION}`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    }
  );
  return res.data;
}

