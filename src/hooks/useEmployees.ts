import { useQuery } from "@tanstack/react-query";
import { listEmployees, type EmployeeItem } from "@/integrations/directus/employees";

export function useEmployees(search?: string) {
  const q = (search || "").trim();
  return useQuery({
    queryKey: ["employees", "list", q],
    queryFn: async () => await listEmployees({ search: q, limit: 500, page: 1 }),
  });
}

export type { EmployeeItem };

