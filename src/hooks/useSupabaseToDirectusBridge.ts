import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { computeDedupeKey, createLead, type LeadSource } from "@/integrations/directus/leads";
import type { Database } from "@/integrations/supabase/types";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];

function mapCallSourceToLeadSource(src: string | null): LeadSource {
  const s = (src || "").toLowerCase();
  if (s.includes("whatsapp")) return "whatsapp";
  if (s.includes("typebot")) return "typebot";
  if (s.includes("chatwoot") || s.includes("chat")) return "chatwoot";
  if (s.includes("email")) return "email";
  if (s.includes("central")) return "central";
  return "phone";
}

/**
 * Transitional bridge:
 * - Polls Supabase `calls` for unprocessed entries (the legacy n8n target)
 * - Inserts a Directus `leads` record with status="incoming"
 * - Marks the Supabase call as processed to avoid reprocessing
 *
 * This keeps the UI popup working with real data while you migrate n8n to Directus.
 * Turn off by env when migration is done.
 */
export function useSupabaseToDirectusBridge(params?: {
  enabled?: boolean;
  /**
   * Callback called with the created Directus lead (so the app can open the popup immediately).
   */
  onLeadCreated?: (lead: { id: string }) => void;
}) {
  const enabled = params?.enabled ?? false;
  const busyRef = useRef(false);
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const tick = async () => {
      if (!active) return;
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const { data: calls, error } = await supabase
          .from("calls")
          .select("id, phone_number, customer_name, notes, source, status, is_processed, created_at")
          .eq("is_processed", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;
        const call = (calls?.[0] || null) as CallRow | null;
        if (!call?.id) return;

        // Only bridge “new/incoming-like” calls. If status is already final, ignore.
        const status = String(call.status || "").toLowerCase();
        if (["answered", "rejected", "spam"].includes(status)) {
          await supabase.from("calls").update({ is_processed: true, processed_action: "bridge_skipped_final" }).eq("id", call.id);
          return;
        }

        const phone = call.phone_number || null;
        const display_name = call.customer_name || phone || "Lead";
        const source = mapCallSourceToLeadSource(call.source);

        const lead = await createLead({
          status: "incoming",
          source,
          source_event_id: call.id,
          phone,
          display_name,
          notes: call.notes || null,
          dedupe_key: computeDedupeKey({ phone, email: null }),
        });

        await supabase
          .from("calls")
          .update({ is_processed: true, processed_action: "bridged_to_directus" })
          .eq("id", call.id);

        params?.onLeadCreated?.(lead);
      } catch (e) {
        if (!warnedRef.current) {
          warnedRef.current = true;
          const msg = e instanceof Error ? e.message : "Erro na ponte Supabase → Directus";
          toast({
            title: "Ponte Supabase → Directus falhou",
            description: msg,
            variant: "destructive",
          });
        }
      } finally {
        busyRef.current = false;
      }
    };

    tick();
    const i = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(i);
    };
  }, [enabled, params]);
}

