import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createManufacturer,
  deleteManufacturer,
  getManufacturerById,
  listManufacturers,
  patchManufacturer,
  type ManufacturerItem,
} from "@/integrations/directus/manufacturers";

export type Manufacturer = ManufacturerItem;
export type ManufacturerInsert = Partial<ManufacturerItem>;
export type ManufacturerUpdate = Partial<ManufacturerItem>;

export function useManufacturers(searchTerm?: string) {
  return useQuery({
    queryKey: ["manufacturers", searchTerm],
    queryFn: async () => {
      return await listManufacturers({ search: searchTerm || "", limit: 500, page: 1 });
    },
  });
}

export function useManufacturer(id: string | undefined) {
  return useQuery({
    queryKey: ["manufacturer", id],
    queryFn: async () => {
      if (!id) return null;
      return await getManufacturerById(id);
    },
    enabled: !!id,
  });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (manufacturer: ManufacturerInsert) => {
      return await createManufacturer(manufacturer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
    },
  });
}

export function useUpdateManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...manufacturer }: ManufacturerUpdate & { id: string }) => {
      return await patchManufacturer(id, manufacturer);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      queryClient.invalidateQueries({ queryKey: ["manufacturer", data.id] });
    },
  });
}

export function useDeleteManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteManufacturer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
    },
  });
}
