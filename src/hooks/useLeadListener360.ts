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
  const incomingIdRef = useRef<string | null>(null);

  // Configurável via env (Vite) — default 15s para evitar spam de requests
  const pollMs = (() => {
    const raw = (import.meta as any)?.env?.VITE_LEADS_INCOMING_POLL_MS;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 3000 ? n : 15000;
  })();

  const pushLead = useCallback((lead: LeadItem) => {
    if (!lead?.id) return;
    if (dismissedRef.current.has(lead.id)) return;
    if (incomingIdRef.current === lead.id) return;
    incomingIdRef.current = lead.id;
    setIncomingLead(lead);
    setIsVisible(true);
  }, []);

  const dismissLead = useCallback((leadId?: string) => {
    const id = leadId || incomingIdRef.current || undefined;
    if (id) dismissedRef.current.add(id);
    setIsVisible(false);
    setTimeout(() => setIncomingLead(null), 250);
  }, []);

  useEffect(() => {
    let active = true;
    let interval: any = null;

    const isPageVisible = () => {
      // document pode não existir em SSR, mas aqui é SPA
      try {
        return typeof document !== "undefined" ? document.visibilityState === "visible" : true;
      } catch {
        return true;
      }
    };

    const tick = async () => {
      try {
        const lead = await fetchLatestIncomingLead();
        if (!active) return;
        if (!lead) return;
        if (dismissedRef.current.has(lead.id)) return;
        if (incomingIdRef.current === lead.id) return;

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

    const schedule = () => {
      if (interval) clearInterval(interval);
      interval = null;
      if (!active) return;
      if (!isPageVisible()) return; // pausa quando o tab não está visível
      tick();
      interval = setInterval(tick, pollMs);
    };

    const onVisibility = () => schedule();
    const onFocus = () => schedule();

    schedule();
    window.addEventListener("visibilitychange", onVisibility as any);
    window.addEventListener("focus", onFocus as any);

    return () => {
      active = false;
      if (interval) clearInterval(interval);
      window.removeEventListener("visibilitychange", onVisibility as any);
      window.removeEventListener("focus", onFocus as any);
    };
  }, [pollMs, pushLead]);

  return { incomingLead, isVisible, dismissLead, pushLead };
}

