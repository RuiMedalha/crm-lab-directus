import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLatestIncomingLead, type LeadItem } from "@/integrations/directus/leads";

/**
 * Polling-based listener for Directus `leads` collection.
 * - Shows popup once per lead id (even if user closes it).
 * - Backend should insert leads with status="incoming".
 */
export function useLeadListener360() {
  const [incomingLead, setIncomingLead] = useState<LeadItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());

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

        setIncomingLead(lead);
        setIsVisible(true);
      } catch {
        // silent: Directus may not be available in dev
      }
    };

    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [incomingLead?.id]);

  return { incomingLead, isVisible, dismissLead };
}

