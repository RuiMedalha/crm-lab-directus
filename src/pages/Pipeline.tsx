import { useState, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDeals, useUpdateDeal, DEAL_STATUSES } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useManufacturers } from "@/hooks/useManufacturers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Euro, ChevronLeft, ChevronRight, Filter, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DealDialog } from "@/components/deals/DealDialog";
import { DealCard } from "@/components/deals/DealCard";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "@/hooks/use-toast";

export default function Pipeline() {
  const { data: deals, isLoading } = useDeals();
  const { data: contacts } = useContacts();
  const { data: manufacturers } = useManufacturers();
  const updateDeal = useUpdateDeal();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    search: "",
    customerId: "",
    manufacturerId: "",
    minValue: "",
    maxValue: "",
  });

  // Aplicar filtros
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    
    return deals.filter(deal => {
      // Filtro de pesquisa
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = deal.title?.toLowerCase().includes(searchLower);
        const matchesCustomer = (deal as any).customer?.company_name?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesCustomer) return false;
      }
      
      // Filtro de cliente
      if (filters.customerId && deal.customer_id !== filters.customerId) {
        return false;
      }
      
      // Filtro de fornecedor
      if (filters.manufacturerId && deal.manufacturer_id !== filters.manufacturerId) {
        return false;
      }
      
      // Filtro de valor mínimo
      if (filters.minValue) {
        const min = parseFloat(filters.minValue);
        if (!isNaN(min) && (deal.total_amount || 0) < min) return false;
      }
      
      // Filtro de valor máximo
      if (filters.maxValue) {
        const max = parseFloat(filters.maxValue);
        if (!isNaN(max) && (deal.total_amount || 0) > max) return false;
      }
      
      return true;
    });
  }, [deals, filters]);

  const hasActiveFilters = filters.search || filters.customerId || filters.manufacturerId || filters.minValue || filters.maxValue;

  const clearFilters = () => {
    setFilters({
      search: "",
      customerId: "",
      manufacturerId: "",
      minValue: "",
      maxValue: "",
    });
  };

  const getDealsByStatus = (status: string) => {
    return filteredDeals.filter((deal) => deal.status === status);
  };

  const getColumnTotal = (status: string) => {
    return getDealsByStatus(status).reduce((sum, deal) => sum + (deal.total_amount || 0), 0);
  };

  const toggleColumn = (status: string) => {
    setCollapsedColumns(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    const deal = deals?.find((d) => d.id === draggableId);

    if (deal && deal.status !== newStatus) {
      try {
        await updateDeal.mutateAsync({ id: draggableId, status: newStatus });
        const statusLabel = DEAL_STATUSES.find((s) => s.value === newStatus)?.label || newStatus;
        toast({ title: `Movido para ${statusLabel}` });
      } catch (error) {
        toast({ title: "Erro ao mover negócio", variant: "destructive" });
      }
    }
  }, [deals, updateDeal]);

  const statusColors: Record<string, string> = {
    lead: "bg-muted",
    qualificacao: "bg-blue-500/10 border-blue-500/20",
    proposta: "bg-amber-500/10 border-amber-500/20",
    negociacao: "bg-purple-500/10 border-purple-500/20",
    ganho: "bg-green-500/10 border-green-500/20",
    perdido: "bg-red-500/10 border-red-500/20",
  };

  // Totais gerais
  const totalDeals = filteredDeals.length;
  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.total_amount || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-4 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
            <p className="text-muted-foreground">
              {totalDeals} negócios • {totalValue.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={showFilters ? "secondary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-[10px]">
                  !
                </Badge>
              )}
            </Button>
            <Button onClick={() => setIsNewDealOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Negócio
            </Button>
          </div>
        </div>

        {/* Painel de Filtros */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Filtros Avançados</CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Pesquisa */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pesquisa</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Título ou cliente..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cliente</Label>
                    <Select
                      value={filters.customerId}
                      onValueChange={(value) => setFilters(f => ({ ...f, customerId: value === "all" ? "" : value }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {contacts?.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fornecedor */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fornecedor</Label>
                    <Select
                      value={filters.manufacturerId}
                      onValueChange={(value) => setFilters(f => ({ ...f, manufacturerId: value === "all" ? "" : value }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {manufacturers?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor Mínimo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Mínimo (€)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minValue}
                      onChange={(e) => setFilters(f => ({ ...f, minValue: e.target.value }))}
                      className="h-9"
                    />
                  </div>

                  {/* Valor Máximo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Máximo (€)</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.maxValue}
                      onChange={(e) => setFilters(f => ({ ...f, maxValue: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Kanban Board with DnD */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
            {DEAL_STATUSES.map((status) => {
              const columnDeals = getDealsByStatus(status.value);
              const columnTotal = getColumnTotal(status.value);
              const isCollapsed = collapsedColumns.includes(status.value);

              if (isCollapsed) {
                return (
                  <div 
                    key={status.value} 
                    className="flex-shrink-0 w-12"
                  >
                    <Card 
                      className={cn("h-full cursor-pointer hover:opacity-80 transition-opacity", statusColors[status.value])}
                      onClick={() => toggleColumn(status.value)}
                    >
                      <CardContent className="p-2 flex flex-col items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {columnDeals.length}
                        </Badge>
                        <div className="writing-mode-vertical text-xs font-medium text-muted-foreground" style={{ writingMode: 'vertical-rl' }}>
                          {status.label}
                        </div>
                        <div className="text-xs font-medium text-primary mt-auto">
                          {(columnTotal / 1000).toFixed(0)}k
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              }

              return (
                <div key={status.value} className="flex-shrink-0 w-52 lg:w-60">
                  <Card className={cn("h-full", statusColors[status.value])}>
                    <CardHeader className="pb-2 px-3 pt-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                          {status.label}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {columnDeals.length}
                          </Badge>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleColumn(status.value)}
                          title="Colapsar coluna"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Euro className="h-3 w-3" />
                        {columnTotal.toLocaleString("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    </CardHeader>
                    
                    <Droppable droppableId={status.value}>
                      {(provided, snapshot) => (
                        <CardContent
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "space-y-2 max-h-[calc(100vh-320px)] min-h-[100px] overflow-y-auto scrollbar-thin px-2 pb-2 transition-colors",
                            snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset rounded-lg"
                          )}
                        >
                          {isLoading ? (
                            [...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-20 w-full" />
                            ))
                          ) : columnDeals.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="text-center py-6 text-muted-foreground text-xs">
                              Sem negócios
                            </div>
                          ) : (
                            columnDeals.map((deal, index) => (
                              <Draggable
                                key={deal.id}
                                draggableId={deal.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                  >
                                    <DealCard
                                      deal={deal}
                                      onClick={() => setSelectedDealId(deal.id)}
                                      isDragging={snapshot.isDragging}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </CardContent>
                      )}
                    </Droppable>
                  </Card>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Deal Dialog */}
      <DealDialog
        dealId={selectedDealId}
        open={!!selectedDealId || isNewDealOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDealId(null);
            setIsNewDealOpen(false);
          }
        }}
      />
    </AppLayout>
  );
}