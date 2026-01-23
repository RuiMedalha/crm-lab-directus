import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, Check, Phone, Mail, MessageCircle, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getEmployeeByEmail } from "@/integrations/directus/employees";
import { useQuery } from "@tanstack/react-query";
import { useCreateFollowUp, useFollowUps, usePatchFollowUp } from "@/hooks/useFollowUps";
import { toast } from "@/hooks/use-toast";

function typeLabel(t: string) {
  if (t === "call") return "Chamada";
  if (t === "email") return "Email";
  if (t === "whatsapp") return "WhatsApp";
  return "Tarefa";
}

function typeIcon(t: string) {
  if (t === "call") return <Phone className="h-4 w-4" />;
  if (t === "email") return <Mail className="h-4 w-4" />;
  if (t === "whatsapp") return <MessageCircle className="h-4 w-4" />;
  return <CalendarClock className="h-4 w-4" />;
}

export default function Agenda() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const employeeQuery = useQuery({
    queryKey: ["me", "employee", user?.email],
    queryFn: async () => (user?.email ? await getEmployeeByEmail(String(user.email)) : null),
    enabled: !!user?.email,
  });
  const meEmp = employeeQuery.data;

  const dueBefore = useMemo(() => {
    // show overdue + next 7 days by default
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  }, []);

  const list = useFollowUps({
    search,
    status: "open",
    assignedEmployeeId: meEmp?.id || undefined,
    dueBefore,
    limit: 500,
    page: 1,
  });

  const create = useCreateFollowUp();
  const patch = usePatchFollowUp();

  const [form, setForm] = useState({
    type: "call",
    title: "",
    due_at: "",
    notes: "",
  });

  const saveFollowUp = async () => {
    if (!meEmp?.id) {
      toast({ title: "Sem funcionário", description: "O teu utilizador tem de existir em `employees` (por email).", variant: "destructive" });
      return;
    }
    if (!form.due_at) {
      toast({ title: "Data/hora em falta", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        status: "open",
        type: form.type,
        title: form.title || null,
        due_at: new Date(form.due_at).toISOString(),
        notes: form.notes || null,
        assigned_employee_id: meEmp.id,
        created_by_employee_id: meEmp.id,
      } as any);
      toast({ title: "Follow-up criado" });
      setOpenCreate(false);
      setForm({ type: "call", title: "", due_at: "", notes: "" });
    } catch (e: any) {
      toast({ title: "Erro ao criar follow-up", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const items = list.data || [];
  const isLoading = list.isLoading || employeeQuery.isLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">
              Follow-ups atribuídos a {meEmp?.full_name || user?.email || "mim"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo follow-up
            </Button>
            <Badge variant="outline" className="text-base px-3 py-1">
              {items.length}
            </Badge>
          </div>
        </div>

        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar…" className="pl-10" />
          </div>
        </div>

        <div className="grid gap-3">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sem follow-ups nos próximos 7 dias.
              </CardContent>
            </Card>
          ) : (
            items.map((fu: any) => {
              const due = fu.due_at ? new Date(fu.due_at) : null;
              const overdue = due ? due.getTime() < Date.now() : false;
              const contactName = fu.contact_id?.company_name || fu.contact_id?.id || null;
              const qNo = fu.quotation_id?.quotation_number || fu.quotation_id?.id || null;
              return (
                <Card key={String(fu.id)} className={overdue ? "border-destructive/40" : "border"}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {typeIcon(String(fu.type || "task"))}
                        <div className="font-medium truncate">
                          {fu.title || typeLabel(String(fu.type || "task"))}
                        </div>
                        {overdue ? <Badge variant="destructive">Atrasado</Badge> : <Badge variant="secondary">Aberto</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                        <span>{due ? due.toLocaleString("pt-PT") : "—"}</span>
                        {contactName ? <span className="truncate">Cliente: {String(contactName)}</span> : null}
                        {qNo ? <span className="truncate">Orçamento: {String(qNo)}</span> : null}
                      </div>
                      {fu.notes ? (
                        <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                          {String(fu.notes).slice(0, 180)}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await patch.mutateAsync({
                            id: String(fu.id),
                            patch: { status: "done", completed_at: new Date().toISOString() } as any,
                          });
                          toast({ title: "Concluído" });
                        } catch (e: any) {
                          toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" });
                        }
                      }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Feito
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo follow-up</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Chamada</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data/Hora</Label>
                <Input
                  type="datetime-local"
                  value={form.due_at}
                  onChange={(e) => setForm((p) => ({ ...p, due_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={5} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
              <Button onClick={saveFollowUp} disabled={create.isPending}>
                {create.isPending ? "A guardar…" : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

