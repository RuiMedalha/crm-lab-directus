import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Call = Tables<'calls'>;

interface MatchedContact {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_person: string | null;
  nif: string | null;
  matchedField: 'phone' | 'whatsapp' | 'contact_phone';
}

interface IncomingCall extends Call {
  matchedContact?: MatchedContact | null;
}

export const useCallListener = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const dismissedCallsRef = useRef<Set<string>>(new Set()); // Track chamadas fechadas (X)

  const dismissCall = useCallback(async (markAsProcessed: boolean = false) => {
    if (incomingCall) {
      if (markAsProcessed) {
        // Marca como processada quando criar contacto/negócio
        try {
          await supabase
            .from('calls')
            .update({ is_processed: true })
            .eq('id', incomingCall.id);
          
          console.log('✅ Chamada marcada como processada:', incomingCall.id);
          dismissedCallsRef.current.delete(incomingCall.id);
        } catch (error) {
          console.error('❌ Erro ao marcar chamada:', error);
        }
      } else {
        // Fechar (X) - NÃO marca como processada mas não reabre
        dismissedCallsRef.current.add(incomingCall.id);
        console.log('⏸️ Chamada adiada (fechada com X):', incomingCall.id);
      }
    }
    
    setIsVisible(false);
    setTimeout(() => setIncomingCall(null), 300);
  }, [incomingCall]);

  const findContactByPhone = useCallback(async (phoneNumber: string | null): Promise<MatchedContact | null> => {
    if (!phoneNumber) return null;
    
    const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-9);
    
    if (normalizedPhone.length < 6) return null;
    
    console.log('🔍 A procurar contacto para:', normalizedPhone);
    
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, company_name, contact_name, contact_person, phone, whatsapp_number, contact_phone, nif');
    
    if (!contacts || contacts.length === 0) {
      console.log('❌ Nenhum contacto encontrado');
      return null;
    }

    for (const contact of contacts) {
      if (contact.phone) {
        const contactPhone = contact.phone.replace(/\D/g, '').slice(-9);
        if (contactPhone === normalizedPhone) {
          console.log('✅ Encontrado por telefone principal:', contact.company_name);
          return {
            id: contact.id,
            company_name: contact.company_name,
            contact_name: contact.contact_name,
            contact_person: contact.contact_person,
            nif: contact.nif,
            matchedField: 'phone',
          };
        }
      }
      
      if (contact.whatsapp_number) {
        const whatsappPhone = contact.whatsapp_number.replace(/\D/g, '').slice(-9);
        if (whatsappPhone === normalizedPhone) {
          console.log('✅ Encontrado por WhatsApp:', contact.company_name);
          return {
            id: contact.id,
            company_name: contact.company_name,
            contact_name: contact.contact_name,
            contact_person: contact.contact_person,
            nif: contact.nif,
            matchedField: 'whatsapp',
          };
        }
      }
      
      if (contact.contact_phone) {
        const secondaryPhone = contact.contact_phone.replace(/\D/g, '').slice(-9);
        if (secondaryPhone === normalizedPhone) {
          console.log('✅ Encontrado por telemóvel secundário:', contact.company_name);
          return {
            id: contact.id,
            company_name: contact.company_name,
            contact_name: contact.contact_name,
            contact_person: contact.contact_person,
            nif: contact.nif,
            matchedField: 'contact_phone',
          };
        }
      }
    }
    
    console.log('❌ Nenhum contacto correspondente encontrado');
    return null;
  }, []);

  useEffect(() => {
    console.log('🔊 A iniciar listener de chamadas...');
    
    const fetchUnprocessedCalls = async () => {
      try {
        const { data: calls, error } = await supabase
          .from('calls')
          .select('id, phone_number, customer_name, status, is_processed, created_at')
          .eq('is_processed', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Erro ao buscar chamadas:', error);
          return;
        }

        if (calls && calls.length > 0 && !incomingCall) {
          const call = calls[0] as Call;
          
          // Verificar se foi fechada com X (dismissed)
          if (dismissedCallsRef.current.has(call.id)) {
            console.log('⏭️ Chamada foi fechada com X, não reabre:', call.id);
            return;
          }
          
          console.log('📞 Nova chamada encontrada:', call.id);
          
          const matchedContact = await findContactByPhone(call.phone_number);
          
          setIncomingCall({ ...call, matchedContact });
          setIsVisible(true);
        }
      } catch (error) {
        console.error('❌ Erro no polling:', error);
      }
    };

    fetchUnprocessedCalls();
    const pollingInterval = setInterval(fetchUnprocessedCalls, 5000);
    console.log('⏰ Polling ativado (a cada 5 segundos)');
    
    const channel = supabase
      .channel('calls-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
        },
        async (payload) => {
          console.log('📞 Nova chamada recebida (realtime):', payload);
          const newCall = payload.new as Call;
          
          if (dismissedCallsRef.current.has(newCall.id)) {
            return;
          }
          
          const matchedContact = await findContactByPhone(newCall.phone_number);
          
          setIncomingCall({ ...newCall, matchedContact });
          setIsVisible(true);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado da subscrição realtime:', status);
      });

    return () => {
      console.log('🔇 A remover listener de chamadas...');
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [findContactByPhone, incomingCall]);

  return {
    incomingCall,
    isVisible,
    dismissCall,
  };
};