import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";

export const DIRECTUS_MANUFACTURERS_COLLECTION =
  import.meta.env.VITE_DIRECTUS_MANUFACTURERS_COLLECTION || "manufacturers";

export interface ManufacturerItem {
  id: string;
  name?: string | null;
  sku_prefix?: string | null;
  contact_email?: string | null;
  portal_url?: string | null;
  order_method?: string | null;
  internal_notes?: string | null;

  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  phone_main?: string | null;
  phone_secondary?: string | null;
  sales_rep_name?: string | null;
  discount_info?: string | null;
  catalog_url?: string | null;
  email_invoicing?: string | null;
  email_logistics?: string | null;
  custom_field_1_name?: string | null;
  custom_field_1_value?: string | null;
  custom_field_2_name?: string | null;
  custom_field_2_value?: string | null;
}

const DEFAULT_FIELDS = [
  "id",
  "name",
  "sku_prefix",
  "contact_email",
  "portal_url",
  "order_method",
  "internal_notes",
  "address",
  "postal_code",
  "city",
  "phone_main",
  "phone_secondary",
  "sales_rep_name",
  "discount_info",
  "catalog_url",
  "email_invoicing",
  "email_logistics",
  "custom_field_1_name",
  "custom_field_1_value",
  "custom_field_2_name",
  "custom_field_2_value",
].join(",");

export async function listManufacturers(params?: { search?: string; limit?: number; page?: number }) {
  const search = params?.search?.trim() || "";
  const res = await directusRequest<{ data: ManufacturerItem[] }>(
    `/items/${DIRECTUS_MANUFACTURERS_COLLECTION}${qs({
      limit: params?.limit ?? 200,
      page: params?.page ?? 1,
      sort: "name",
      fields: DEFAULT_FIELDS,
      ...(search ? { search } : {}),
    })}`
  );
  return res.data || [];
}

export async function getManufacturerById(id: string) {
  const res = await directusRequest<{ data: ManufacturerItem }>(
    `/items/${DIRECTUS_MANUFACTURERS_COLLECTION}/${encodeURIComponent(id)}${qs({
      fields: DEFAULT_FIELDS,
    })}`
  );
  return res.data || null;
}

export async function createManufacturer(payload: Partial<ManufacturerItem>) {
  const res = await directusRequest<{ data: ManufacturerItem }>(`/items/${DIRECTUS_MANUFACTURERS_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function patchManufacturer(id: string, patch: Partial<ManufacturerItem>) {
  const res = await directusRequest<{ data: ManufacturerItem }>(
    `/items/${DIRECTUS_MANUFACTURERS_COLLECTION}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    }
  );
  return res.data;
}

export async function deleteManufacturer(id: string) {
  await directusRequest(`/items/${DIRECTUS_MANUFACTURERS_COLLECTION}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

