import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactTag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  category?: string;
}

export function useContactTags() {
  return useQuery({
    queryKey: ["contact-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_tags")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as ContactTag[];
    },
  });
}