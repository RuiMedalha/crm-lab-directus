import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLatestIncomingLead, type LeadItem } from "@/integrations/directus/leads";
import { toast } from "@/hooks/use-toast";

/**
 * Polling-based listener for Directus `leads` collection.
 * - Shows popup once per lead id (even if user closes it).
 * - Backend should insert leads with status="incoming".
 */
export function useLeadListener360() {
  const [incomingLead, setIncomingLead] = useState<LeadItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());
  const warnedRef = useRef(false);

  const pushLead = useCallback((lead: LeadItem) => {
    if (!lead?.id) return;
    if (dismissedRef.current.has(lead.id)) return;
    if (incomingLead?.id === lead.id) return;
    setIncomingLead(lead);
    setIsVisible(true);
  }, [incomingLead?.id]);

  const dismissLead = useCallback((leadId?: string) => {
    const id = leadId || incomingLead?.id;
    if (id) dismissedRef.current.add(id);
    setIsVisible(false);
    setTimeout(() => setIncomingLead(null), 250);
  }, [incomingLead?.id]);

  useEffect(() => {
    let active = true;

    const tick = async () => {
      try {
        const lead = await fetchLatestIncomingLead();
        if (!active) return;
        if (!lead) return;
        if (dismissedRef.current.has(lead.id)) return;
        if (incomingLead?.id === lead.id) return;

        pushLead(lead);
      } catch (e) {
        // Don't fail silently: a missing token or wrong URL looks like “popup stopped working”.
        if (!warnedRef.current) {
          warnedRef.current = true;
          const msg = e instanceof Error ? e.message : "Erro ao ligar ao Directus";
          toast({
            title: "Directus indisponível (popup 360)",
            description: msg,
            variant: "destructive",
          });
        }
      }
    };

    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [incomingLead?.id, pushLead]);

  return { incomingLead, isVisible, dismissLead, pushLead };
}

