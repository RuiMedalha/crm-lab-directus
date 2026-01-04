import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePendingLeads, useConvertLeadToContact, useConvertLeadToDeal, useMarkLeadProcessed } from "@/hooks/useCalls";
import { useDeals } from "@/hooks/useDeals";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, Clock, UserPlus, Building2, MessageCircle, Mail, Globe, Briefcase, 
  Plus, ArrowRight, CheckCircle, Trash2, ChevronDown, ChevronRight, ArrowLeft, ExternalLink 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NewLeadDialog } from "@/components/inbox/NewLeadDialog";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const sourceIcons: Record<string, { icon: typeof Phone; color: string; label: string }> = {
  phone: { icon: Phone, color: "text-primary", label: "Chamada" },
  whatsapp: { icon: MessageCircle, color: "text-success", label: "WhatsApp" },
  email: { icon: Mail, color: "text-warning", label: "Email" },
  web: { icon: Globe, color: "text-muted-foreground", label: "Website" },
  typebot: { icon: MessageCircle, color: "text-info", label: "Typebot" },
  n8n: { icon: Globe, color: "text-purple-500", label: "n8n" },
  chatwoot: { icon: MessageCircle, color: "text-orange-500", label: "Chatwoot" },
};

export default function Inbox() {
  const navigate = useNavigate();
  const { data: allLeads, isLoading, refetch } = usePendingLeads();
  const { data: deals } = useDeals();
  const convertLead = useConvertLeadToContact();
  const convertLeadToDeal = useConvertLeadToDeal();
  const markProcessed = useMarkLeadProcessed();
  
  const [companyName, setCompanyName] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [selectedDealId, setSelectedDealId] = useState("");
  const [leadForDeal, setLeadForDeal] = useState<any>(null);
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [showCreateDealDialog, setShowCreateDealDialog] = useState(false);
  const [createDealTab, setCreateDealTab] = useState<"new" | "existing">("new");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  const pendingLeads = allLeads?.filter((l: any) => !l.is_processed) || [];
  const processedLeads = allLeads?.filter((l: any) => l.is_processed) || [];

  useState(() => {
    if (pendingLeads.length > 0 && expandedLeads.size === 0) {
      setExpandedLeads(new Set(pendingLeads.map((l: any) => l.id)));
    }
  });

  const toggleLead = (id: string) => {
    setExpandedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleConvertWithForm = (lead: any) => {
    const params = new URLSearchParams();
    if (lead.phone_number) params.set('phone', lead.phone_number);
    if (lead.customer_name) params.set('name', lead.customer_name);
    navigate(`/contactos/novo?${params.toString()}`);
  };

  const handleOpenCreateDeal = (lead: any) => {
    setLeadForDeal(lead);
    setCompanyName(lead.customer_name || "");
    setDealTitle(`Negócio - ${lead.customer_name || "Novo Lead"}`);
    setShowCreateDealDialog(true);
    setCreateDealTab("new");
  };

  const handleCreateDeal = async () => {
    if (!leadForDeal || !companyName.trim()) {
      toast({
        title: "O nome da empresa é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await convertLeadToDeal.mutateAsync({
        callId: leadForDeal.id,
        companyName: companyName.trim(),
        dealTitle: dealTitle.trim() || undefined,
      });
      toast({ title: "Contacto e negócio criados com sucesso!" });
      setShowCreateDealDialog(false);
      setCompanyName("");
      setDealTitle("");
      setLeadForDeal(null);
      refetch();
      navigate(`/pipeline?deal=${result.deal.id}`);
    } catch (error) {
      toast({ title: "Erro ao criar negócio", variant: "destructive" });
    }
  };

  const handleAssociateExistingDeal = async () => {
    if (!leadForDeal || !selectedDealId) {
      toast({
        title: "Selecione um negócio",
        variant: "destructive",
      });
      return;
    }

    try {
      await markProcessed.mutateAsync(leadForDeal.id);
      toast({ title: "Lead associado ao negócio" });
      setShowCreateDealDialog(false);
      setSelectedDealId("");
      setLeadForDeal(null);
      refetch();
      navigate(`/pipeline?deal=${selectedDealId}`);
    } catch (error) {
      toast({ title: "Erro ao associar lead", variant: "destructive" });
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calls')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Lead apagado com sucesso' });
      setDeleteLeadId(null);
      refetch();
    } catch (error) {
      toast({ title: 'Erro ao apagar lead', variant: 'destructive' });
    }
  };

  const handleReopenLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ is_processed: false, processed_action: null })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Lead reaberto e marcado como pendente!' });
      refetch();
    } catch (error) {
      toast({ title: 'Erro ao reabrir lead', variant: 'destructive' });
    }
  };

  const handleMarkAsTreated = async (id: string) => {
    try {
      await markProcessed.mutateAsync(id);
      toast({ title: 'Lead marcado como a tratar' });
      refetch();
    } catch (error) {
      toast({ title: 'Erro ao marcar lead', variant: 'destructive' });
    }
  };

  const getSourceInfo = (source: string | null) => {
    return sourceIcons[source || 'phone'] || sourceIcons.phone;
  };

  const getProcessedActionLabel = (lead: any) => {
    if (lead.processed_action === 'contact_created' && lead.contact) {
      return (
        <div className="flex items-center gap-2 text-sm bg-success/10 p-2 rounded">
          <UserPlus className="h-4 w-4 text-success" />
          <span>Contacto criado:</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-success hover:text-success/80"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/contactos/${lead.contact.id}`);
            }}
          >
            {lead.contact.company_name}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      );
    }
    
    if (lead.processed_action === 'deal_created' && lead.contact && lead.deal) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm bg-success/10 p-2 rounded">
            <UserPlus className="h-4 w-4 text-success" />
            <span>Contacto:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-success hover:text-success/80"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/contactos/${lead.contact.id}`);
              }}
            >
              {lead.contact.company_name}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm bg-primary/10 p-2 rounded">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>Negócio:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary hover:text-primary/80"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/pipeline?deal=${lead.deal.id}`);
              }}
            >
              {lead.deal.title}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      );
    }
    
    if (lead.processed_action === 'marked_treated') {
      return (
        <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Marcado para tratar - Aguarda criação de contacto</span>
        </div>
      );
    }
    
    return null;
  };

  const LeadCard = ({ lead, isProcessed }: { lead: any; isProcessed: boolean }) => {
    const sourceInfo = getSourceInfo(lead.source);
    const SourceIcon = sourceInfo.icon;
    const isExpanded = expandedLeads.has(lead.id);
    const Icon = isExpanded ? ChevronDown : ChevronRight;
    const isMissedCall = lead.status === 'missed';
    const attemptCount = lead.attempt_count || 1;

    return (
      <Collapsible
        open={isExpanded}
        onOpenChange={() => toggleLead(lead.id)}
      >
        <Card className={`transition-all ${
          isProcessed 
            ? 'border-success/30' 
            : isMissedCall
              ? 'border-4 border-orange-500 bg-orange-500/5 shadow-lg'
              : 'border-4 border-destructive bg-destructive/5 shadow-lg'
        }`}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className={`pb-3 ${isProcessed ? '' : isMissedCall ? 'bg-orange-500/5' : 'bg-destructive/5'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Icon className="h-5 w-5 shrink-0" />
                  <SourceIcon className={`h-4 w-4 ${sourceInfo.color}`} />
                  <CardTitle className={`${isProcessed ? 'text-base' : 'text-lg'} font-medium text-left`}>
                    {lead.customer_name || "Desconhecido"}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isMissedCall && attemptCount > 1 && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                      📞 {attemptCount}x
                    </Badge>
                  )}
                  <Badge
                    variant={isProcessed ? "secondary" : isMissedCall ? "outline" : "destructive"}
                    className={isMissedCall && !isProcessed ? "bg-orange-500 text-white" : ""}
                  >
                    {isProcessed ? "✅ Tratado" : isMissedCall ? "📵 Não Atendida" : "🔴 Pendente"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{lead.phone_number || "Sem número"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(lead.last_attempt || lead.created_at || ""), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
                {isMissedCall && attemptCount > 1 && (
                  <span className="text-orange-600 font-medium">
                    • {attemptCount} tentativas
                  </span>
                )}
              </div>
              {lead.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
                  {lead.notes}
                </p>
              )}
              
              {/* Mostrar ação realizada em tratados */}
              {isProcessed && getProcessedActionLabel(lead)}
              
              <div className="flex flex-wrap gap-2 pt-2">
                {!isProcessed && (
                  <>
                    <Button
                      className="flex-1"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvertWithForm(lead);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Contacto
                    </Button>
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateDeal(lead);
                      }}
                    >
                      <Briefcase className="h-4 w-4 mr-1" />
                      Negócio
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsTreated(lead.id);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      A Tratar
                    </Button>
                  </>
                )}
                
                {isProcessed && (
                  <>
                    <Button
                      className="flex-1"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvertWithForm(lead);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Contacto
                    </Button>
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateDeal(lead);
                      }}
                    >
                      <Briefcase className="h-4 w-4 mr-1" />
                      Negócio
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReopenLead(lead.id);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Reabrir
                    </Button>
                  </>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteLeadId(lead.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">📋 Leads e Chamadas</h1>
            <p className="text-muted-foreground">
              Chamadas e mensagens para triagem
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="destructive" className="text-lg px-4 py-2">
              🔴 Pendentes: {pendingLeads.length}
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              ✅ Tratados: {processedLeads.length}
            </Badge>
            <Button onClick={() => setShowNewLeadDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {pendingLeads.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-destructive flex items-center gap-2">
                  🔴 NÃO TRATADOS - URGENTE
                </h2>
                <div className="grid gap-4">
                  {pendingLeads.map((lead: any) => (
                    <LeadCard key={lead.id} lead={lead} isProcessed={false} />
                  ))}
                </div>
              </div>
            )}

            {processedLeads.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-success flex items-center gap-2">
                  ✅ TRATADOS
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {processedLeads.map((lead: any) => (
                    <LeadCard key={lead.id} lead={lead} isProcessed={true} />
                  ))}
                </div>
              </div>
            )}

            {pendingLeads.length === 0 && processedLeads.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Sem leads pendentes</p>
                  <p className="text-muted-foreground text-sm">
                    Todas as chamadas têm cliente associado
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowNewLeadDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Lead Manual
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={showCreateDealDialog} onOpenChange={setShowCreateDealDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Converter Lead em Negócio</DialogTitle>
            <DialogDescription>
              Cria contacto + negócio automaticamente
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{leadForDeal?.customer_name || "Desconhecido"}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-sm">{leadForDeal?.phone_number}</span>
          </div>

          <Tabs value={createDealTab} onValueChange={(v) => setCreateDealTab(v as "new" | "existing")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Novo Negócio</TabsTrigger>
              <TabsTrigger value="existing">Negócio Existente</TabsTrigger>
            </TabsList>
            
            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Nome da Empresa *
                </Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal_title">
                  <Briefcase className="h-4 w-4 inline mr-2" />
                  Título do Negócio
                </Label>
                <Input
                  id="deal_title"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="Título do negócio"
                />
              </div>
              <Button 
                onClick={handleCreateDeal} 
                disabled={convertLeadToDeal.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Contacto + Negócio
              </Button>
            </TabsContent>
            
            <TabsContent value="existing" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Selecionar Negócio</Label>
                <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um negócio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deals?.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title || `Negócio #${deal.id.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAssociateExistingDeal}
                disabled={!selectedDealId || markProcessed.isPending}
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Associar e Ver Negócio
              </Button>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowCreateDealDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLeadId && handleDeleteLead(deleteLeadId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewLeadDialog 
        open={showNewLeadDialog} 
        onOpenChange={setShowNewLeadDialog} 
      />
    </AppLayout>
  );
}