import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";

export const DIRECTUS_DEALS_COLLECTION = import.meta.env.VITE_DIRECTUS_DEALS_COLLECTION || "deals";
export const DIRECTUS_DEAL_ITEMS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_DEAL_ITEMS_COLLECTION || "deal_items";

export type DealStatus =
  | "lead"
  | "qualificacao"
  | "proposta"
  | "negociacao"
  | "ganho"
  | "perdido"
  | string;

export interface DealItemRow {
  id: string;
  deal_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  sku?: string | null;
  unit_price?: number | null;
  cost_price?: number | null;
  quantity?: number | null;
}

export interface DealRow {
  id: string;
  title?: string | null;
  status?: DealStatus | null;
  customer_id?: any; // m2o -> contacts (object when requested with fields=customer_id.*)
  manufacturer_id?: any; // m2o -> manufacturers
  total_amount?: number | null;
  owner_employee_id?: any;
  assigned_employee_id?: any;
  assigned_by_employee_id?: any;
  assigned_at?: string | null;
  items?: DealItemRow[];
  quotations?: any[]; // optional (if your schema has it)
}

const LIST_FIELDS = [
  "id",
  "title",
  "status",
  "total_amount",
  "customer_id.id",
  "customer_id.company_name",
  "manufacturer_id.id",
  "manufacturer_id.name",
  "owner_employee_id.id",
  "owner_employee_id.full_name",
  "assigned_employee_id.id",
  "assigned_employee_id.full_name",
  "assigned_by_employee_id.id",
  "assigned_by_employee_id.full_name",
  "assigned_at",
].join(",");

const DETAIL_FIELDS = [
  "id",
  "title",
  "status",
  "total_amount",
  "customer_id.*",
  "manufacturer_id.*",
  "owner_employee_id.id",
  "owner_employee_id.full_name",
  "assigned_employee_id.id",
  "assigned_employee_id.full_name",
  "assigned_by_employee_id.id",
  "assigned_by_employee_id.full_name",
  "assigned_at",
].join(",");

export async function listDeals(params?: { search?: string; limit?: number; page?: number }) {
  const search = params?.search?.trim() || "";
  const res = await directusRequest<{ data: DealRow[] }>(
    `/items/${DIRECTUS_DEALS_COLLECTION}${qs({
      limit: params?.limit ?? 200,
      page: params?.page ?? 1,
      sort: "-id",
      fields: LIST_FIELDS,
      ...(search ? { search } : {}),
    })}`
  );
  return res.data || [];
}

export async function getDealById(id: string) {
  const res = await directusRequest<{ data: DealRow }>(
    `/items/${DIRECTUS_DEALS_COLLECTION}/${encodeURIComponent(id)}${qs({
      fields: DETAIL_FIELDS,
    })}`
  );
  return res.data || null;
}

export async function listDealItems(dealId: string) {
  const res = await directusRequest<{ data: DealItemRow[] }>(
    `/items/${DIRECTUS_DEAL_ITEMS_COLLECTION}${qs({
      limit: 500,
      sort: "id",
      fields: "id,deal_id,product_id,product_name,sku,unit_price,cost_price,quantity",
      "filter[deal_id][_eq]": dealId,
    })}`
  );
  return res.data || [];
}

export async function createDeal(payload: Partial<DealRow>) {
  const res = await directusRequest<{ data: DealRow }>(`/items/${DIRECTUS_DEALS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function patchDeal(id: string, patch: Partial<DealRow>) {
  const res = await directusRequest<{ data: DealRow }>(`/items/${DIRECTUS_DEALS_COLLECTION}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.data;
}

export async function listActiveDealsByCustomerIds(customerIds: string[], params?: { limit?: number }) {
  const ids = (customerIds || []).map((x) => String(x || "").trim()).filter(Boolean);
  if (!ids.length) return [];
  const res = await directusRequest<{ data: DealRow[] }>(
    `/items/${DIRECTUS_DEALS_COLLECTION}${qs({
      limit: params?.limit ?? 2000,
      page: 1,
      sort: "-id",
      fields: "id,status,total_amount,customer_id.id,customer_id.company_name",
      "filter[customer_id][_in]": ids.join(","),
      // active = anything not closed
      "filter[status][_nin]": "ganho,perdido",
    })}`
  );
  return res.data || [];
}

export async function createDealItem(payload: Partial<DealItemRow>) {
  const res = await directusRequest<{ data: DealItemRow }>(`/items/${DIRECTUS_DEAL_ITEMS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteDealItem(id: string) {
  await directusRequest(`/items/${DIRECTUS_DEAL_ITEMS_COLLECTION}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

