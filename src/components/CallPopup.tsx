import { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, X, User, Building2, PhoneIncoming, UserPlus, FileText, Save, Loader2, Search, Minimize2, PhoneOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface CallPopupProps {
  call: {
    id: string;
    phone_number: string | null;
    customer_name: string | null;
    status: string | null;
    matchedContact?: {
      id: string;
      company_name: string;
      contact_name: string | null;
      contact_person: string | null;
      nif: string | null;
      matchedField?: 'phone' | 'whatsapp' | 'contact_phone';
    } | null;
  };
  isVisible: boolean;
  onDismiss: (markAsProcessed?: boolean) => void;
}

const TIMER_DURATION = 18; // 18 segundos

export const CallPopup = ({ call, isVisible, onDismiss }: CallPopupProps) => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [nifSearch, setNifSearch] = useState('');
  const [searchingNif, setSearchingNif] = useState(false);
  const [matchedContact, setMatchedContact] = useState(call.matchedContact);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isAnswering, setIsAnswering] = useState(false);
  const [callStatus, setCallStatus] = useState(call.status);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [contactForm, setContactForm] = useState({
    company_name: '',
    contact_name: '',
    phone: call.phone_number || '',
    email: '',
    notes: notes,
  });

  useEffect(() => {
    setMatchedContact(call.matchedContact);
  }, [call.matchedContact]);

  // Timer de 18 segundos
  useEffect(() => {
    if (!isVisible || isMinimized || callStatus === 'ongoing' || callStatus === 'rejected' || callStatus === 'spam') {
      return;
    }

    setTimeLeft(TIMER_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Tempo esgotado - marcar como missed
          handleMissedCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isVisible, isMinimized, callStatus]);

  // Real-time listener para lock de chamada
  useEffect(() => {
    const channel = supabase
      .channel(`call-${call.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${call.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          console.log('📞 Chamada atualizada:', newStatus);
          
          // Se outro vendedor atendeu, fechar popup
          if (newStatus === 'ongoing' && !isAnswering) {
            toast({ title: 'Chamada atendida por outro vendedor' });
            onDismiss(false);
          }
          
          setCallStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [call.id, isAnswering, onDismiss]);

  const handleMissedCall = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      // Verificar se já existe uma chamada recente com este número
      const phoneNormalized = call.phone_number?.replace(/\D/g, '').slice(-9);
      
      if (phoneNormalized) {
        const { data: existingCalls } = await supabase
          .from('calls')
          .select('id, attempt_count')
          .neq('id', call.id)
          .eq('phone_number', call.phone_number)
          .eq('status', 'missed')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (existingCalls && existingCalls.length > 0) {
          // Incrementar attempt_count na chamada existente
          await supabase
            .from('calls')
            .update({ 
              attempt_count: (existingCalls[0].attempt_count || 1) + 1,
              last_attempt: new Date().toISOString()
            } as any)
            .eq('id', existingCalls[0].id);
          
          // Apagar a chamada atual (duplicada)
          await supabase
            .from('calls')
            .delete()
            .eq('id', call.id);
        } else {
          // Marcar esta chamada como missed
          await supabase
            .from('calls')
            .update({ 
              status: 'missed',
              last_attempt: new Date().toISOString()
            } as any)
            .eq('id', call.id);
        }
      } else {
        await supabase
          .from('calls')
          .update({ status: 'missed' } as any)
          .eq('id', call.id);
      }
      
      toast({ 
        title: 'Chamada não atendida',
        description: 'A chamada foi registada como perdida',
        variant: 'destructive'
      });
      onDismiss(false);
    } catch (error) {
      console.error('Erro ao registar chamada perdida:', error);
    }
  };

  const handleAnswer = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsAnswering(true);
    try {
      const { error } = await supabase
        .from('calls')
        .update({ status: 'ongoing' } as any)
        .eq('id', call.id);
      
      if (error) throw error;
      
      setCallStatus('ongoing');
      toast({ title: 'Chamada atendida' });
    } catch (error) {
      console.error('Erro ao atender chamada:', error);
      toast({ title: 'Erro ao atender chamada', variant: 'destructive' });
    } finally {
      setIsAnswering(false);
    }
  };

  const handleReject = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      await supabase
        .from('calls')
        .update({ status: 'rejected' } as any)
        .eq('id', call.id);
      
      toast({ title: 'Chamada rejeitada' });
      onDismiss(false);
    } catch (error) {
      console.error('Erro ao rejeitar chamada:', error);
    }
  };

  const handleSpam = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      await supabase
        .from('calls')
        .update({ 
          status: 'spam',
          is_processed: true,
          processed_action: 'marked_spam'
        } as any)
        .eq('id', call.id);
      
      toast({ title: 'Marcada como spam', variant: 'destructive' });
      onDismiss(true);
    } catch (error) {
      console.error('Erro ao marcar como spam:', error);
    }
  };

  const autoSaveNotes = useCallback(async (notesText: string) => {
    if (!notesText.trim()) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('calls')
        .update({ notes: notesText.trim() } as any)
        .eq('id', call.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao auto-guardar notas:', error);
    } finally {
      setSavingNotes(false);
    }
  }, [call.id]);

  useEffect(() => {
    if (!notes.trim() || callStatus !== 'ongoing') return;
    
    const timer = setTimeout(() => {
      autoSaveNotes(notes);
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes, autoSaveNotes, callStatus]);

  const handleNifSearch = async () => {
    if (!nifSearch.trim()) {
      toast({ title: 'Digite um NIF para pesquisar', variant: 'destructive' });
      return;
    }
    
    setSearchingNif(true);
    try {
      const { data: contact, error } = await supabase
        .from('contacts')
        .select('id, company_name, contact_name, contact_person, nif')
        .eq('nif', nifSearch.trim())
        .maybeSingle();

      if (error) throw error;

      if (contact) {
        await supabase
          .from('calls')
          .update({ customer_name: contact.company_name } as any)
          .eq('id', call.id);

        setMatchedContact({
          id: contact.id,
          company_name: contact.company_name,
          contact_name: contact.contact_name,
          contact_person: contact.contact_person,
          nif: contact.nif,
        });

        toast({ title: `Contacto encontrado: ${contact.company_name}` });
        setNifSearch('');
      } else {
        toast({ title: 'Nenhum contacto com este NIF', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Erro ao pesquisar NIF:', error);
      toast({ title: 'Erro ao pesquisar', variant: 'destructive' });
    } finally {
      setSearchingNif(false);
    }
  };
  
  const handleViewContact = () => {
    if (matchedContact) {
      navigate(`/contactos/${matchedContact.id}`);
      onDismiss(true);
    }
  };

  const handleCreateClient = () => {
    setContactForm({
      company_name: call.customer_name || '',
      contact_name: '',
      phone: call.phone_number || '',
      email: '',
      notes: notes,
    });
    setShowContactForm(true);
  };

  const handleSubmitContact = async () => {
    if (!contactForm.company_name?.trim() && !contactForm.contact_name?.trim()) {
      toast({
        title: 'Preencha pelo menos o nome da empresa ou nome do contacto',
        variant: 'destructive'
      });
      return;
    }

    if (!contactForm.phone?.trim() && !contactForm.email?.trim()) {
      toast({
        title: 'Preencha pelo menos o telefone ou email',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([{
          ...contactForm,
          source: 'lead',
          source_call_id: call.id,
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('calls')
        .update({ 
          is_processed: true,
          contact_id: data.id,
          processed_action: 'contact_created'
        })
        .eq('id', call.id);

      toast({ title: 'Contacto criado com sucesso!' });
      setShowContactForm(false);
      onDismiss(true);
      navigate(`/contactos/${data.id}`);
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Erro ao criar contacto',
        variant: 'destructive'
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('calls')
        .update({ notes: notes.trim() } as any)
        .eq('id', call.id);
      
      if (error) throw error;
      toast({ title: 'Notas guardadas' });
    } catch (error) {
      toast({ title: 'Erro ao guardar notas', variant: 'destructive' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEndCall = async () => {
    try {
      await supabase
        .from('calls')
        .update({ 
          status: 'answered',
          is_processed: true,
          processed_action: 'call_ended'
        } as any)
        .eq('id', call.id);
      
      toast({ title: 'Chamada terminada' });
      onDismiss(true);
    } catch (error) {
      toast({ title: 'Erro ao terminar chamada', variant: 'destructive' });
    }
  };

  const displayName = matchedContact?.company_name || call.customer_name || 'Número Desconhecido';
  const contactPerson = matchedContact?.contact_name || matchedContact?.contact_person;
  const nif = matchedContact?.nif;
  const isKnownContact = !!matchedContact;

  const timerProgress = (timeLeft / TIMER_DURATION) * 100;
  const isRinging = callStatus !== 'ongoing' && callStatus !== 'answered';

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <Card className="w-64 border-primary/50 bg-card shadow-xl hover:shadow-2xl transition-shadow">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneIncoming className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium truncate">{displayName}</span>
            </div>
            <Badge variant="destructive" className="text-xs">{timeLeft}s</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'fixed top-4 right-4 z-50 transition-all duration-300 ease-out',
          isVisible 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0'
        )}
      >
        <Card className={cn(
          "w-80 shadow-2xl",
          isRinging ? "border-destructive/50 bg-card shadow-destructive/20" : "border-success/50 bg-card shadow-success/20"
        )}>
          <CardContent className="p-4">
            {/* Timer Progress Bar */}
            {isRinging && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Tempo para atender</span>
                  <span className={cn(
                    "text-sm font-bold",
                    timeLeft <= 5 ? "text-destructive animate-pulse" : "text-foreground"
                  )}>
                    {timeLeft}s
                  </span>
                </div>
                <Progress 
                  value={timerProgress} 
                  className={cn(
                    "h-2",
                    timeLeft <= 5 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"
                  )} 
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={cn(
                  "p-3 rounded-full",
                  isRinging ? "bg-destructive/20" : "bg-success/20"
                )}>
                  <PhoneIncoming className={cn(
                    "h-5 w-5",
                    isRinging ? "text-destructive animate-bounce" : "text-success"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {isRinging ? 'Chamada a Entrar' : 'Em Chamada'}
                  </p>
                  <p className="font-semibold text-foreground truncate">
                    {displayName}
                  </p>
                  {contactPerson && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {contactPerson}
                    </p>
                  )}
                  {nif && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      NIF: {nif}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground font-mono">
                    {call.phone_number || 'Sem número'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setIsMinimized(true)}
                  title="Minimizar"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 3 botões de ação para chamadas a tocar */}
            {isRinging && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Button
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  size="sm"
                  onClick={handleAnswer}
                  disabled={isAnswering}
                >
                  {isAnswering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-1" />
                      Atender
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                >
                  <PhoneOff className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSpam}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Spam
                </Button>
              </div>
            )}

            {/* Conteúdo quando em chamada */}
            {callStatus === 'ongoing' && (
              <>
                {!isKnownContact && (
                  <div className="p-2 rounded-lg bg-muted/50 space-y-2 mb-3">
                    <p className="text-[10px] text-muted-foreground">Pesquisar cliente por NIF:</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: 123456789"
                        value={nifSearch}
                        onChange={(e) => setNifSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNifSearch()}
                        className="h-8 text-sm"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleNifSearch} 
                        disabled={searchingNif}
                        className="h-8 px-3"
                      >
                        {searchingNif ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 mb-3">
                  <Textarea
                    placeholder="Notas rápidas da chamada..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {savingNotes ? 'A guardar...' : notes.trim() ? 'Auto-guardado em 2s' : ''}
                    </span>
                    {notes.trim() && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="h-7"
                      >
                        {savingNotes ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Guardar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {isKnownContact ? (
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={handleViewContact}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Ver Ficha
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      size="sm"
                      onClick={handleCreateClient}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar Cliente
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEndCall}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Terminar Chamada
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente para esta chamada
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={contactForm.company_name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Empresa Lda."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome do Contacto</Label>
                <Input
                  id="contact_name"
                  value={contactForm.contact_name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="João Silva"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+351 XXX XXX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@empresa.pt"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form_notes">Notas</Label>
              <Textarea
                id="form_notes"
                value={contactForm.notes}
                onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas sobre o contacto..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowContactForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitContact}>
              <Save className="h-4 w-4 mr-2" />
              Criar Contacto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};