import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useCreateInteraction, useInteractions } from "@/hooks/useInteractions";
import { useFollowUps, usePatchFollowUp } from "@/hooks/useFollowUps";
import { CalendarClock, Check, MessageSquareText, Phone, Mail, MessageCircle, FileText } from "lucide-react";
import { userColorStyle } from "@/lib/userColor";

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-PT");
  } catch {
    return String(d);
  }
}

function iconForType(t: string) {
  if (t === "call") return <Phone className="h-4 w-4" />;
  if (t === "email") return <Mail className="h-4 w-4" />;
  if (t === "whatsapp") return <MessageCircle className="h-4 w-4" />;
  if (t === "quotation") return <FileText className="h-4 w-4" />;
  return <MessageSquareText className="h-4 w-4" />;
}

export function CustomerTimeline({ contactId }: { contactId: string }) {
  const [note, setNote] = useState("");
  const interactions = useInteractions({ contactId, limit: 200, page: 1 });
  const followUpsOpen = useFollowUps({ contactId, status: "open", limit: 200, page: 1 });
  const followUpsDone = useFollowUps({ contactId, status: "done", limit: 50, page: 1 });
  const patchFollowUp = usePatchFollowUp();
  const createInteraction = useCreateInteraction();

  const items = useMemo(() => {
    const fu = [...(followUpsOpen.data || []), ...(followUpsDone.data || [])].map((x: any) => ({
      kind: "follow_up",
      id: String(x.id),
      at: x.due_at || x.date_created || null,
      raw: x,
    }));
    const it = (interactions.data || []).map((x: any) => ({
      kind: "interaction",
      id: String(x.id),
      at: x.occurred_at || x.date_created || null,
      raw: x,
    }));
    return [...fu, ...it].sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return tb - ta;
    });
  }, [followUpsOpen.data, followUpsDone.data, interactions.data]);

  const isLoading = followUpsOpen.isLoading || followUpsDone.isLoading || interactions.isLoading;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareText className="h-4 w-4" />
            Nota rápida (fica no histórico)
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ex: Chamada feita, pediu orçamento X, enviar hoje…"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setNote("")}
              disabled={!note.trim() || createInteraction.isPending}
            >
              Limpar
            </Button>
            <Button
              onClick={async () => {
                const text = note.trim();
                if (!text) return;
                try {
                  await createInteraction.mutateAsync({
                    type: "note",
                    direction: "out",
                    status: "done",
                    source: "crm",
                    occurred_at: new Date().toISOString(),
                    contact_id: contactId,
                    summary: text.slice(0, 240),
                    payload: { text },
                  } as any);
                  setNote("");
                  toast({ title: "Nota adicionada" });
                } catch (e: any) {
                  toast({ title: "Erro ao guardar nota", description: String(e?.message || e), variant: "destructive" });
                }
              }}
              disabled={!note.trim() || createInteraction.isPending}
            >
              Guardar nota
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/20">
          Sem histórico ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 150).map((x) => {
            if (x.kind === "follow_up") {
              const fu: any = x.raw;
              const overdue = fu.due_at ? new Date(fu.due_at).getTime() < Date.now() : false;
              const assigned = fu.assigned_employee_id?.full_name || fu.assigned_employee_id?.id || null;
              return (
                <Card key={`fu-${x.id}`} className={overdue ? "border-destructive/40" : "border"}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        <div className="font-medium truncate">{fu.title || "Follow-up"}</div>
                        <Badge variant={fu.status === "done" ? "secondary" : overdue ? "destructive" : "outline"}>
                          {fu.status || "open"}
                        </Badge>
                        {assigned ? (
                          <Badge variant="outline" style={userColorStyle(String(assigned))}>
                            {String(assigned).slice(0, 18)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                        <span>{fmt(fu.due_at)}</span>
                        {fu.type ? <span>Tipo: {String(fu.type)}</span> : null}
                        {fu.quotation_id?.quotation_number ? <span>Orçamento: {String(fu.quotation_id.quotation_number)}</span> : null}
                      </div>
                      {fu.notes ? <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{String(fu.notes)}</div> : null}
                    </div>
                    {fu.status !== "done" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await patchFollowUp.mutateAsync({
                              id: String(fu.id),
                              patch: { status: "done", completed_at: new Date().toISOString() } as any,
                            });
                            toast({ title: "Follow-up concluído" });
                          } catch (e: any) {
                            toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" });
                          }
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Feito
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            }

            const it: any = x.raw;
            const t = String(it.type || "note");
            return (
              <Card key={`it-${x.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {iconForType(t)}
                        <div className="font-medium truncate">{String(it.summary || t)}</div>
                        {it.source ? <Badge variant="outline">{String(it.source)}</Badge> : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                        <span>{fmt(it.occurred_at || it.date_created)}</span>
                        {it.direction ? <span>Dir: {String(it.direction)}</span> : null}
                        {it.status ? <span>Status: {String(it.status)}</span> : null}
                      </div>
                      {it.payload?.text ? (
                        <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{String(it.payload.text)}</div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

