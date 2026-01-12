import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";
import { listDealItems, type DealItemRow } from "@/integrations/directus/deals";

export const DIRECTUS_QUOTATIONS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_QUOTATIONS_COLLECTION || "quotations";
export const DIRECTUS_QUOTATION_ITEMS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_QUOTATION_ITEMS_COLLECTION || "quotation_items";

export interface QuotationRow {
  id: string;
  deal_id?: any;
  customer_id?: any;
  quotation_number?: string | null;
  status?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  terms_conditions?: string | null;
  subtotal?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  pdf_link?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
}

export interface QuotationItemRow {
  id: string;
  quotation_id?: any;
  product_id?: string | null;
  product_name?: string | null;
  sku?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  cost_price?: number | null;
  discount_percent?: number | null;
  line_total?: number | null;
  notes?: string | null;
  sort_order?: number | null;
}

function generateQuotationNumber() {
  const d = new Date();
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORC-${y}${m}${day}-${rand}`;
}

export async function listQuotationsByDeal(dealId: string) {
  const res = await directusRequest<{ data: QuotationRow[] }>(
    `/items/${DIRECTUS_QUOTATIONS_COLLECTION}${qs({
      limit: 200,
      sort: "-date_created",
      fields: "id,quotation_number,status,total_amount,valid_until,date_created,date_updated,deal_id,customer_id",
      "filter[deal_id][_eq]": dealId,
    })}`
  );
  return res.data || [];
}

export async function listQuotations(params?: { search?: string; limit?: number; page?: number }) {
  const search = params?.search?.trim() || "";
  const res = await directusRequest<{ data: QuotationRow[] }>(
    `/items/${DIRECTUS_QUOTATIONS_COLLECTION}${qs({
      limit: params?.limit ?? 200,
      page: params?.page ?? 1,
      sort: "-date_created",
      fields: "id,quotation_number,status,total_amount,valid_until,date_created,date_updated,deal_id,customer_id.company_name",
      ...(search ? { search } : {}),
    })}`
  );
  return res.data || [];
}

export async function getQuotationById(quotationId: string) {
  const res = await directusRequest<{ data: any }>(
    `/items/${DIRECTUS_QUOTATIONS_COLLECTION}/${encodeURIComponent(quotationId)}${qs({
      fields:
        "id,quotation_number,status,subtotal,total_amount,notes,valid_until,date_created,customer_id.company_name,customer_id.contact_name,customer_id.address,customer_id.postal_code,customer_id.city,customer_id.nif,customer_id.email,customer_id.phone",
    })}`
  );

  const items = await directusRequest<{ data: QuotationItemRow[] }>(
    `/items/${DIRECTUS_QUOTATION_ITEMS_COLLECTION}${qs({
      limit: 1000,
      sort: "sort_order,id",
      fields: "id,product_name,sku,quantity,unit_price,line_total",
      "filter[quotation_id][_eq]": quotationId,
    })}`
  );

  return { quotation: res.data || null, items: items.data || [] };
}

export async function createQuotation(payload: Partial<QuotationRow>) {
  const quotation_number = payload.quotation_number || generateQuotationNumber();
  const res = await directusRequest<{ data: QuotationRow }>(`/items/${DIRECTUS_QUOTATIONS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify({ ...payload, quotation_number }),
  });
  return res.data;
}

export async function createQuotationItems(items: Array<Partial<QuotationItemRow>>) {
  const res = await directusRequest<{ data: QuotationItemRow[] }>(`/items/${DIRECTUS_QUOTATION_ITEMS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(items),
  });
  return res.data || [];
}

export async function deleteQuotation(id: string) {
  await directusRequest(`/items/${DIRECTUS_QUOTATIONS_COLLECTION}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createQuotationFromDeal(dealId: string, customerId?: string | null) {
  const dealItems: DealItemRow[] = await listDealItems(dealId).catch(() => []);
  const subtotal = dealItems.reduce((sum, i) => sum + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
  const total_amount = subtotal;

  const quotation = await createQuotation({
    deal_id: dealId,
    customer_id: customerId || undefined,
    status: "draft",
    subtotal,
    total_amount,
  });

  if (dealItems.length) {
    await createQuotationItems(
      dealItems.map((i, idx) => ({
        quotation_id: quotation.id,
        product_id: i.product_id || null,
        product_name: i.product_name || null,
        sku: i.sku || null,
        quantity: i.quantity || 1,
        unit_price: i.unit_price || 0,
        cost_price: i.cost_price || null,
        discount_percent: 0,
        line_total: Number(i.quantity || 1) * Number(i.unit_price || 0),
        sort_order: idx,
      }))
    );
  }

  return quotation;
}

