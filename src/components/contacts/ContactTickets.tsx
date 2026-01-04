import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, Truck, Mail, MessageCircle, Clock, CheckCircle, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface ContactTicketsProps {
  contactId: string;
  companyName: string;
  email?: string | null;
  whatsappNumber?: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  task_type: string | null;
  created_at: string | null;
  priority: string | null;
}

export function ContactTickets({ contactId, companyName, email, whatsappNumber }: ContactTicketsProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState<'tecnico' | 'logistica' | null>(null);

  // Fetch tickets for this contact
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['contact-tickets', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('contact_id', contactId)
        .in('task_type', ['tecnico', 'logistica'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
  });

  const createTicket = async (type: 'tecnico' | 'logistica') => {
    setIsCreating(type);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const title = type === 'tecnico' 
        ? `Ticket Técnico - ${companyName}`
        : `Ticket Logística - ${companyName}`;

      const { error } = await supabase
        .from('tasks')
        .insert({
          title,
          contact_id: contactId,
          task_type: type,
          status: 'pending',
          priority: 'medium',
          assigned_to: user?.id,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['contact-tickets', contactId] });
      toast({ title: `Ticket ${type === 'tecnico' ? 'Técnico' : 'Logística'} criado` });
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast({ title: "Erro ao criar ticket", variant: "destructive" });
    } finally {
      setIsCreating(null);
    }
  };

  const handleSendEmail = (ticket: Task) => {
    if (!email) {
      toast({ title: "Contacto sem email", variant: "destructive" });
      return;
    }
    const subject = encodeURIComponent(ticket.title);
    const body = encodeURIComponent(`Olá,\n\nReferente ao ticket: ${ticket.title}\n\n`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSendWhatsApp = (ticket: Task) => {
    if (!whatsappNumber) {
      toast({ title: "Contacto sem WhatsApp", variant: "destructive" });
      return;
    }
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const text = encodeURIComponent(`Olá! Contacto referente: ${ticket.title}`);
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-[10px]">Concluído</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 text-[10px]">Em Progresso</Badge>;
      default:
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 text-[10px]">Pendente</Badge>;
    }
  };

  const getTypeIcon = (type: string | null) => {
    return type === 'tecnico' 
      ? <Wrench className="h-3 w-3 text-orange-500" />
      : <Truck className="h-3 w-3 text-purple-500" />;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: pt });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Tickets</h3>

      {/* Create Ticket Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => createTicket('tecnico')}
          disabled={isCreating !== null}
          className="h-9 text-xs bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30"
        >
          {isCreating === 'tecnico' ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Wrench className="h-3 w-3 mr-1 text-orange-500" />
          )}
          Técnico
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => createTicket('logistica')}
          disabled={isCreating !== null}
          className="h-9 text-xs bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30"
        >
          {isCreating === 'logistica' ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Truck className="h-3 w-3 mr-1 text-purple-500" />
          )}
          Logística
        </Button>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tickets?.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Sem tickets. Crie um ticket técnico ou de logística acima.
        </p>
      ) : (
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {tickets?.map((ticket) => (
              <div
                key={ticket.id}
                className="p-2 rounded-lg border bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getTypeIcon(ticket.task_type)}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{ticket.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(ticket.created_at)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => handleSendEmail(ticket)}
                    disabled={!email}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => handleSendWhatsApp(ticket)}
                    disabled={!whatsappNumber}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
