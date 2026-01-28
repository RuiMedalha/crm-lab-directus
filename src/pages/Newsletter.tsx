import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Search, Mail, Calendar, Ticket, Eye } from "lucide-react";
import { listNewsletterSubscriptions, type NewsletterSubscription } from "@/integrations/directus/newsletter-subscriptions";

export default function Newsletter() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["newsletter_subscriptions", "all", search],
    queryFn: async () => await listNewsletterSubscriptions({ search, limit: 200, page: 1 }),
  });

  const items = (query.data || []) as NewsletterSubscription[];
  const isLoading = query.isLoading;
  const count = useMemo(() => items.length, [items.length]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Newsletter</h1>
            <p className="text-muted-foreground">Subscrições (ledger) — ainda não são contactos</p>
          </div>
          <Badge variant="outline" className="text-base px-3 py-1">
            {count} registos
          </Badge>
        </div>

        <div className="max-w-md space-y-2">
          <Label className="sr-only">Pesquisar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por email, telefone ou cupão…"
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
                Sem registos
              </CardContent>
            </Card>
          ) : (
            items.map((s) => {
              const label = s.full_name || s.email || s.phone || String(s.id);
              return (
                <Card
                  key={String(s.id)}
                  className="border cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/newsletter/${encodeURIComponent(String(s.id))}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div className="font-medium truncate">{label}</div>
                          {s.status ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {String(s.status)}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                          {s.created_at ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(String(s.created_at)).toLocaleDateString("pt-PT")}
                            </span>
                          ) : null}
                          <span className="truncate">{s.email ? String(s.email) : s.phone ? String(s.phone) : "—"}</span>
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" />
                            {s.coupon_code ? String(s.coupon_code) : "Sem cupão"}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/newsletter/${encodeURIComponent(String(s.id))}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Abrir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}

