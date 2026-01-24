import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";

export const DIRECTUS_INTERACTIONS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_INTERACTIONS_COLLECTION || "interactions";

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
  const q: Record<string, any> = {
    limit: params?.limit ?? 200,
    page: params?.page ?? 1,
    sort: "-occurred_at,-date_created",
    fields:
      "id,type,direction,status,source,external_id,occurred_at,summary,display_name,phone,email,payload,contact_id.id,lead_id.id,date_created,date_updated",
  };
  if (params?.contactId) q["filter[contact_id][_eq]"] = params.contactId;

  const res = await directusRequest<{ data: InteractionRow[] }>(
    `/items/${DIRECTUS_INTERACTIONS_COLLECTION}${qs(q)}`
  );
  return res.data || [];
}

export async function createInteraction(payload: Partial<InteractionRow>) {
  const res = await directusRequest<{ data: InteractionRow }>(
    `/items/${DIRECTUS_INTERACTIONS_COLLECTION}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}

