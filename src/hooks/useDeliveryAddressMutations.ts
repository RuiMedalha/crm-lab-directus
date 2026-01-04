import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryAddressInsert {
  contact_id: string;
  address_name?: string;
  address: string;
  postal_code?: string;
  city?: string;
  contact_person?: string;
  phone?: string;
  delivery_notes?: string;
  is_main_address?: boolean;
}

export interface DeliveryAddressUpdate extends Partial<DeliveryAddressInsert> {
  id: string;
}

export function useCreateDeliveryAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: DeliveryAddressInsert) => {
      const { data, error } = await supabase
        .from("delivery_addresses")
        .insert(address)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses", variables.contact_id] });
    },
  });
}

export function useUpdateDeliveryAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...address }: DeliveryAddressUpdate) => {
      const { data, error } = await supabase
        .from("delivery_addresses")
        .update(address)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses", data.contact_id] });
    },
  });
}

export function useDeleteDeliveryAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("delivery_addresses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses", contactId] });
    },
  });
}
