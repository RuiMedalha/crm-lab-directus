import { directusApiUrl, directusRequest, getDirectusTokenForRequest } from "@/integrations/directus/client";
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
  internal_notes?: string | null;
  sent_to_email?: string | null;
  sent_at?: string | null;
  follow_up_at?: string | null;
  follow_up_notes?: string | null;
  subtotal?: number | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  pdf_link?: string | null;
  pdf_file?: any;
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
  iva_percent?: number | null;
  cost_price?: number | null;
  discount_percent?: number | null;
  line_total?: number | null;
  notes?: string | null;
  image_url?: string | null;
  manual_entry?: boolean | null;
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
      fields: "id,quotation_number,status,total_amount,valid_until,date_created,date_updated,deal_id,customer_id.id,customer_id.company_name",
      ...(search ? { search } : {}),
    })}`
  );
  return res.data || [];
}

export async function listQuotationsByCustomer(customerId: string | number, params?: { limit?: number; page?: number }) {
  const cid = /^\d+$/.test(String(customerId)) ? Number(customerId) : String(customerId);
  const res = await directusRequest<{ data: QuotationRow[] }>(
    `/items/${DIRECTUS_QUOTATIONS_COLLECTION}${qs({
      limit: params?.limit ?? 100,
      page: params?.page ?? 1,
      sort: "-date_created",
      fields: "id,quotation_number,status,total_amount,valid_until,date_created,date_updated,deal_id",
      "filter[customer_id][_eq]": cid as any,
    })}`
  );
  return res.data || [];
}

export async function listActiveQuotationsByCustomerIds(customerIds: Array<string | number>, params?: { limit?: number }) {
  const ids = (customerIds || [])
    .map((x) => (x === null || x === undefined ? "" : String(x)).trim())
    .filter(Boolean);
  if (!ids.length) return [];
  const res = await directusRequest<{ data: QuotationRow[] }>(
    `/items/${DIRECTUS_QUOTATIONS_COLLECTION}${qs({
      limit: params?.limit ?? 3000,
      page: 1,
      sort: "-date_created",
      fields: "id,quotation_number,status,total_amount,valid_until,date_created,customer_id.id,customer_id.company_name",
      "filter[customer_id][_in]": ids.join(","),
      // active = draft/sent (approved may be closed depending on your flow; keep it out for now)
      "filter[status][_in]": "draft,sent",
    })}`
  );
  return res.data || [];
}

export async function getQuotationById(quotationId: string) {
  const fullFields =
    "id,quotation_number,status,deal_id,subtotal,total_amount,notes,terms_conditions,internal_notes,sent_to_email,sent_at,follow_up_at,follow_up_notes,pdf_link,pdf_file,valid_until,date_created,customer_id.id,customer_id.company_name,customer_id.contact_name,customer_id.address,customer_id.postal_code,customer_id.city,customer_id.nif,customer_id.email,customer_id.phone";
  const safeFields =
    "id,quotation_number,status,deal_id,subtotal,total_amount,notes,terms_conditions,internal_notes,pdf_link,valid_until,date_created,customer_id.id,customer_id.company_name,customer_id.contact_name,customer_id.address,customer_id.postal_code,customer_id.city,customer_id.nif,customer_id.email,customer_id.phone";

  const fetchOne = async (fields: string) =>
    await directusRequest<{ data: any }>(
      `/items/${DIRECTUS_QUOTATIONS_COLLECTION}/${encodeURIComponent(quotationId)}${qs({ fields })}`
    );

  const res = await fetchOne(fullFields).catch(async (e: any) => {
    const msg = String(e?.message || e || "");
    // Fallback: some policies can't read tracking fields; don't break the UI.
    if (msg.includes(`You don't have permission to access fields`) || msg.includes("permission to access fields")) {
      return await fetchOne(safeFields);
    }
    throw e;
  });

  const items = await directusRequest<{ data: QuotationItemRow[] }>(
    `/items/${DIRECTUS_QUOTATION_ITEMS_COLLECTION}${qs({
      limit: 1000,
      sort: "sort_order,id",
      fields: "id,quotation_id,product_id,product_name,sku,quantity,unit_price,iva_percent,cost_price,discount_percent,notes,image_url,manual_entry,line_total,sort_order",
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

export async function patchQuotation(id: string, patch: Partial<QuotationRow>) {
  const res = await directusRequest<{ data: QuotationRow }>(`/items/${DIRECTUS_QUOTATIONS_COLLECTION}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.data;
}

export async function listQuotationItems(quotationId: string) {
  const res = await directusRequest<{ data: QuotationItemRow[] }>(
    `/items/${DIRECTUS_QUOTATION_ITEMS_COLLECTION}${qs({
      limit: 2000,
      sort: "sort_order,id",
      fields: "id,quotation_id",
      "filter[quotation_id][_eq]": quotationId,
    })}`
  );
  return res.data || [];
}

export async function deleteQuotationItem(id: string) {
  await directusRequest(`/items/${DIRECTUS_QUOTATION_ITEMS_COLLECTION}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function replaceQuotationItems(quotationId: string, items: Array<Partial<QuotationItemRow>>) {
  const existing = await listQuotationItems(quotationId).catch(() => []);
  for (const row of existing) {
    if (row?.id) await deleteQuotationItem(String(row.id));
  }
  return await createQuotationItems(items);
}

export async function deleteQuotation(id: string) {
  await directusRequest(`/items/${DIRECTUS_QUOTATIONS_COLLECTION}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchQuotationPdf(quotationId: string): Promise<Blob> {
  const res = await fetch(directusApiUrl(`/gerar-pdf/${encodeURIComponent(quotationId)}`), {
    method: "POST",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Falha ao gerar PDF (${res.status})`);
  }

  const ct = String(res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/pdf")) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Resposta inesperada ao gerar PDF (não é PDF).");
  }

  return await res.blob();
}

export async function createQuotationFromDeal(dealId: string, customerId?: string | null) {
  const dealItems: DealItemRow[] = await listDealItems(dealId).catch(() => []);
  const subtotal = dealItems.reduce((sum, i) => sum + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
  const total_amount = subtotal;

  const customerIdForDirectus: string | number | undefined = (() => {
    if (customerId === undefined || customerId === null || customerId === "") return undefined;
    return /^\d+$/.test(String(customerId)) ? Number(customerId) : customerId;
  })();

  const quotation = await createQuotation({
    deal_id: dealId,
    customer_id: customerIdForDirectus,
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

