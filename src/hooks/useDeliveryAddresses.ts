import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DeliveryAddress = Tables<"delivery_addresses">;

export function useDeliveryAddresses(contactId: string | undefined) {
  return useQuery({
    queryKey: ["delivery-addresses", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("delivery_addresses")
        .select("*")
        .eq("contact_id", contactId)
        .order("is_main_address", { ascending: false });
      if (error) throw error;
      return data as DeliveryAddress[];
    },
    enabled: !!contactId,
  });
}
