import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Manufacturer = Tables<"manufacturers">;
export type ManufacturerInsert = TablesInsert<"manufacturers">;
export type ManufacturerUpdate = TablesUpdate<"manufacturers">;

export function useManufacturers(searchTerm?: string) {
  return useQuery({
    queryKey: ["manufacturers", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("manufacturers")
        .select("*")
        .order("name", { ascending: true });

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,sku_prefix.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Manufacturer[];
    },
  });
}

export function useManufacturer(id: string | undefined) {
  return useQuery({
    queryKey: ["manufacturer", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("manufacturers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Manufacturer | null;
    },
    enabled: !!id,
  });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (manufacturer: ManufacturerInsert) => {
      const { data, error } = await supabase
        .from("manufacturers")
        .insert(manufacturer)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from("manufacturers")
        .update(manufacturer)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from("manufacturers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
    },
  });
}
