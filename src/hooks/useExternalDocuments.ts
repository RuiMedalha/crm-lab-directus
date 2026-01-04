import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ExternalDocument = Tables<"external_documents">;

export function useExternalDocuments(customerId: string | undefined) {
  return useQuery({
    queryKey: ["external-documents", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("external_documents")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ExternalDocument[];
    },
    enabled: !!customerId,
  });
}
