import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, Calendar, Euro, Eye, Plus } from "lucide-react";
import { listQuotations } from "@/integrations/directus/quotations";
import { QuotationPreview } from "@/components/quotations/QuotationPreview";
import { QuotationCreator } from "@/components/quotations/QuotationCreator";
import { useContacts } from "@/hooks/useContacts";
import type { ContactItem } from "@/integrations/directus/contacts";

export default function Orcamentos() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openCreateChooser, setOpenCreateChooser] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [createFor, setCreateFor] = useState<{ id: string; name: string } | null>(null);

  const query = useQuery({
    queryKey: ["quotations", "all", search],
    queryFn: async () => await listQuotations({ search, limit: 500, page: 1 }),
  });

  const contactsQuery = useContacts(openCreateChooser ? contactSearch : "");
  const contacts = (contactsQuery.data || []) as ContactItem[];

  const items = query.data || [];
  const isLoading = query.isLoading;

  const count = useMemo(() => items.length, [items.length]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-muted-foreground">Lista global (Directus)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setOpenCreateChooser(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
            <Badge variant="outline" className="text-base px-3 py-1">
              {count} orçamentos
            </Badge>
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <Label className="sr-only">Pesquisar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por número, cliente, estado…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-3">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sem orçamentos
              </CardContent>
            </Card>
          ) : (
            items.map((q: any) => (
              <Card key={q.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="font-mono text-sm font-medium truncate">
                          {q.quotation_number || q.id}
                        </div>
                        {q.status && (
                          <Badge variant="secondary" className="text-[10px]">
                            {String(q.status)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {q.date_created ? new Date(q.date_created).toLocaleDateString("pt-PT") : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          {(Number(q.total_amount || 0) || 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                        </span>
                        <span className="truncate">
                          {(q.customer_id && q.customer_id.company_name) ? String(q.customer_id.company_name) : "Sem cliente"}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setOpenId(String(q.id))}>
                      <Eye className="h-4 w-4 mr-2" />
                      Abrir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
          {openId ? (
            <QuotationPreview open={true} onOpenChange={(open) => !open && setOpenId(null)} quotationId={openId} />
          ) : (
            <div className="p-6">
              <Skeleton className="h-64 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Choose contact to create quotation */}
      <Dialog open={openCreateChooser} onOpenChange={setOpenCreateChooser}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por empresa, NIF, telefone, email…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[50vh] pr-2">
              <div className="space-y-2">
                {contactsQuery.isLoading ? (
                  [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : contacts.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Sem resultados
                    </CardContent>
                  </Card>
                ) : (
                  contacts.slice(0, 100).map((c) => {
                    const name = String(c.company_name || c.contact_name || c.id);
                    return (
                      <Card key={String(c.id)} className="border">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{name}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                              {c.nif ? <span>NIF: {String(c.nif)}</span> : null}
                              {c.phone ? <span>Tel: {String(c.phone)}</span> : null}
                              {c.email ? <span className="truncate">{String(c.email)}</span> : null}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setOpenCreateChooser(false);
                              setCreateFor({ id: String(c.id), name });
                            }}
                          >
                            Criar
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actual quotation creator */}
      {createFor ? (
        <QuotationCreator
          open={!!createFor}
          onOpenChange={(open) => {
            if (!open) setCreateFor(null);
          }}
          contactId={createFor.id}
          contactName={createFor.name}
          onComplete={() => {
            setCreateFor(null);
            query.refetch().catch(() => undefined);
          }}
        />
      ) : null}
    </AppLayout>
  );
}

