import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PhoneMissed, FileText, Clock, Phone, ArrowRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface MissedCall {
  id: string;
  phone_number: string | null;
  customer_name: string | null;
  attempt_count: number | null;
  last_attempt: string | null;
  created_at: string | null;
}

interface RecentQuotation {
  id: string;
  quotation_number: string;
  total_amount: number | null;
  status: string;
  created_at: string;
  customer: { company_name: string } | null;
}

export function DashboardActionCenter() {
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar chamadas perdidas (não processadas)
      const { data: calls } = await supabase
        .from("calls")
        .select("id, phone_number, customer_name, attempt_count, last_attempt, created_at")
        .eq("status", "missed")
        .eq("is_processed", false)
        .order("last_attempt", { ascending: false })
        .limit(5);

      setMissedCalls((calls as MissedCall[]) || []);

      // Buscar orçamentos recentes
      const { data: quotations } = await supabase
        .from("quotations")
        .select("id, quotation_number, total_amount, status, created_at, customer:contacts(company_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentQuotations((quotations as RecentQuotation[]) || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time listener para chamadas
    const channel = supabase
      .channel("dashboard-calls")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotations" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Rascunho</Badge>;
      case "sent":
        return <Badge className="bg-blue-500">Enviado</Badge>;
      case "accepted":
        return <Badge className="bg-success">Aceite</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Chamadas Perdidas */}
      <Card className="border-orange-200 dark:border-orange-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <PhoneMissed className="h-5 w-5 text-orange-500" />
              Chamadas Não Atendidas
              {missedCalls.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {missedCalls.length}
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {missedCalls.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sem chamadas perdidas</p>
            </div>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {missedCalls.map((call) => (
                  <Link
                    key={call.id}
                    to="/inbox"
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-500/20">
                        <PhoneMissed className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {call.customer_name || call.phone_number || "Desconhecido"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(call.last_attempt || call.created_at || ""), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                          {(call.attempt_count || 1) > 1 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-orange-100">
                              {call.attempt_count}x
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </ScrollArea>
          )}
          {missedCalls.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/inbox">
                  Ver todas na Inbox
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orçamentos Recentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Últimos Orçamentos
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentQuotations.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sem orçamentos recentes</p>
            </div>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {recentQuotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-medium text-sm">
                            {quotation.quotation_number}
                          </p>
                          {getStatusBadge(quotation.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {quotation.customer?.company_name || "Sem cliente"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {(quotation.total_amount || 0).toLocaleString("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(quotation.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          {recentQuotations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/pipeline">
                  Ver Pipeline
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
