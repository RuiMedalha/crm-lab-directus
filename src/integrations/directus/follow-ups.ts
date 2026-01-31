import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";

export const DIRECTUS_FOLLOW_UPS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_FOLLOW_UPS_COLLECTION || "follow_ups";

export type FollowUpType = "call" | "email" | "whatsapp" | "task" | string;
export type FollowUpStatus = "open" | "done" | "cancelled" | string;

export interface FollowUpRow {
  id: string;
  status?: FollowUpStatus | null;
  type?: FollowUpType | null;
  due_at?: string | null;
  completed_at?: string | null;
  title?: string | null;
  notes?: string | null;

  // relations
  contact_id?: any; // integer m2o -> contacts
  quotation_id?: any; // integer m2o -> quotations
  deal_id?: any; // uuid m2o -> deals

  assigned_employee_id?: any; // m2o -> employees
  created_by_employee_id?: any; // m2o -> employees

  date_created?: string | null;
  date_updated?: string | null;
}

export async function listFollowUps(params?: {
  search?: string;
  limit?: number;
  page?: number;
  status?: string;
  assignedEmployeeId?: string;
  contactId?: string | number;
  quotationId?: string | number;
  dealId?: string;
  dueBefore?: string; // ISO
}): Promise<FollowUpRow[]> {
  const search = params?.search?.trim() || "";
  const q: Record<string, any> = {
    limit: params?.limit ?? 200,
    page: params?.page ?? 1,
    sort: "-due_at,-date_created",
    fields:
      "id,status,type,due_at,completed_at,title,notes,contact_id.id,contact_id.company_name,quotation_id.id,quotation_id.quotation_number,deal_id.id,deal_id.title,assigned_employee_id.id,assigned_employee_id.full_name,created_by_employee_id.id,created_by_employee_id.full_name,date_created,date_updated",
    ...(search ? { search } : {}),
  };
  if (params?.status) q["filter[status][_eq]"] = params.status;
  if (params?.assignedEmployeeId) q["filter[assigned_employee_id][_eq]"] = params.assignedEmployeeId;
  if (params?.contactId !== undefined) q["filter[contact_id][_eq]"] = params.contactId;
  if (params?.quotationId !== undefined) q["filter[quotation_id][_eq]"] = params.quotationId;
  if (params?.dealId) q["filter[deal_id][_eq]"] = params.dealId;
  if (params?.dueBefore) q["filter[due_at][_lte]"] = params.dueBefore;

  const res = await directusRequest<{ data: FollowUpRow[] }>(
    `/items/${DIRECTUS_FOLLOW_UPS_COLLECTION}${qs(q)}`
  );
  return res.data || [];
}

export async function createFollowUp(payload: Partial<FollowUpRow>) {
  const res = await directusRequest<{ data: FollowUpRow }>(`/items/${DIRECTUS_FOLLOW_UPS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function patchFollowUp(id: string, patch: Partial<FollowUpRow>) {
  const res = await directusRequest<{ data: FollowUpRow }>(`/items/${DIRECTUS_FOLLOW_UPS_COLLECTION}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.data;
}

