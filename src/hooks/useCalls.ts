import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Call = Tables<"calls">;

export function useCalls() {
  return useQuery({
    queryKey: ["calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Call[];
    },
  });
}

export function usePendingLeads() {
  return useQuery({
    queryKey: ["pending-leads"],
    queryFn: async () => {
      const { data: calls, error } = await supabase
        .from("calls")
        .select(`
          *,
          contact:contact_id(id, company_name),
          deal:deal_id(id, title)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return calls || [];
    },
  });
}

export function useConvertLeadToContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ callId, companyName }: { callId: string; companyName: string }) => {
      // Get the call
      const { data: call, error: callError } = await supabase
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();
      
      if (callError) throw callError;

      // Create contact
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          company_name: companyName,
          phone: call.phone_number,
          contact_name: call.customer_name,
          source: 'lead',
          source_call_id: callId,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Update call with contact_id and mark as processed
      const { error: updateError } = await supabase
        .from("calls")
        .update({ 
          is_processed: true,
          contact_id: contact.id,
          processed_action: 'contact_created'
        })
        .eq("id", callId);

      if (updateError) throw updateError;

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-leads"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useConvertLeadToDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      callId, 
      companyName,
      dealTitle,
    }: { 
      callId: string; 
      companyName: string;
      dealTitle?: string;
    }) => {
      // Get the call
      const { data: call, error: callError } = await supabase
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();
      
      if (callError) throw callError;

      // Create contact first (SEMPRE cria contacto)
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          company_name: companyName,
          phone: call.phone_number,
          contact_name: call.customer_name,
          source: 'lead',
          source_call_id: callId,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Create deal
      const { data: deal, error: dealError } = await supabase
        .from("deals")
        .insert({
          title: dealTitle || `Negócio - ${companyName}`,
          customer_id: contact.id,
          status: "lead",
          source: call.source || "phone",
        })
        .select()
        .single();

      if (dealError) throw dealError;

      // Update call with contact_id, deal_id and mark as processed
      const { error: updateError } = await supabase
        .from("calls")
        .update({ 
          is_processed: true,
          contact_id: contact.id,
          deal_id: deal.id,
          processed_action: 'deal_created'
        })
        .eq("id", callId);

      if (updateError) throw updateError;

      return { contact, deal };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-leads"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useMarkLeadProcessed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase
        .from("calls")
        .update({ 
          is_processed: true,
          processed_action: 'marked_treated'
        })
        .eq("id", callId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-leads"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}