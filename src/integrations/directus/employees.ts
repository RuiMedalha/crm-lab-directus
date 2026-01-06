import { directusRequest } from "@/integrations/directus/client";
import { qs } from "@/integrations/directus/utils";

export const DIRECTUS_EMPLOYEES_COLLECTION =
  import.meta.env.VITE_DIRECTUS_EMPLOYEES_COLLECTION || "employees";

export type EmployeeRole = "admin" | "gestor" | "vendedor" | "visualizador" | string;

export interface EmployeeItem {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: EmployeeRole | null;
  is_active?: boolean | null;
  phone?: string | null;
  notes?: string | null;
}

const FIELDS = ["id", "full_name", "email", "role", "is_active", "phone", "notes"].join(",");

export async function listEmployees(params?: { search?: string; limit?: number; page?: number }) {
  const search = params?.search?.trim() || "";
  const res = await directusRequest<{ data: EmployeeItem[] }>(
    `/items/${DIRECTUS_EMPLOYEES_COLLECTION}${qs({
      limit: params?.limit ?? 200,
      page: params?.page ?? 1,
      sort: "full_name",
      fields: FIELDS,
      ...(search ? { search } : {}),
    })}`
  );
  return res.data || [];
}

export async function createEmployee(payload: Partial<EmployeeItem>) {
  const res = await directusRequest<{ data: EmployeeItem }>(`/items/${DIRECTUS_EMPLOYEES_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function patchEmployee(id: string, patch: Partial<EmployeeItem>) {
  const res = await directusRequest<{ data: EmployeeItem }>(`/items/${DIRECTUS_EMPLOYEES_COLLECTION}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.data;
}

export async function deleteEmployee(id: string) {
  await directusRequest(`/items/${DIRECTUS_EMPLOYEES_COLLECTION}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

