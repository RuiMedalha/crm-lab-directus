import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Phone, Mail, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listContacts } from "@/integrations/directus/contacts";
import { listNewsletterSubscriptions } from "@/integrations/directus/newsletter-subscriptions";
import { listActiveDealsByCustomerIds } from "@/integrations/directus/deals";
import { listActiveQuotationsByCustomerIds } from "@/integrations/directus/quotations";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactosDirectus() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  const renderTags = (raw: any) => {
    const list: string[] = Array.isArray(raw)
      ? raw.map((x) => String(x)).filter(Boolean)
      : typeof raw === "string"
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    return list.slice(0, 3);
  };

  const query = useQuery({
    queryKey: ["contacts-directus", searchTerm],
    queryFn: async () => {
      return await listContacts({ search: searchTerm, limit: 500, page: 1 });
    },
  });

  const subsQuery = useQuery({
    queryKey: ["newsletter-subscriptions", "search", searchTerm],
    enabled: !!searchTerm.trim(),
    queryFn: async () => {
      return await listNewsletterSubscriptions({ search: searchTerm, limit: 50, page: 1 });
    },
  });

  const contacts = query.data || [];
  const isLoading = query.isLoading;
  const subs = subsQuery.data || [];

  const activeSummary = useQuery({
    queryKey: ["contacts-directus", "active-summary", contacts.map((c: any) => String(c?.id || "")).join(",")],
    enabled: contacts.length > 0,
    queryFn: async () => {
      const ids = contacts.map((c: any) => String(c.id));
      const [deals, quotations] = await Promise.all([
        listActiveDealsByCustomerIds(ids).catch(() => []),
        listActiveQuotationsByCustomerIds(ids).catch(() => []),
      ]);

      const dealsByCustomer: Record<string, { count: number; total: number }> = {};
      for (const d of deals as any[]) {
        const cid = d?.customer_id?.id ? String(d.customer_id.id) : d?.customer_id ? String(d.customer_id) : "";
        if (!cid) continue;
        const prev = dealsByCustomer[cid] || { count: 0, total: 0 };
        dealsByCustomer[cid] = { count: prev.count + 1, total: prev.total + Number(d.total_amount || 0) };
      }

      const quotationsByCustomer: Record<string, { count: number; total: number }> = {};
      for (const q of quotations as any[]) {
        const cid = q?.customer_id?.id ? String(q.customer_id.id) : q?.customer_id ? String(q.customer_id) : "";
        if (!cid) continue;
        const prev = quotationsByCustomer[cid] || { count: 0, total: 0 };
        quotationsByCustomer[cid] = { count: prev.count + 1, total: prev.total + Number(q.total_amount || 0) };
      }

      return { dealsByCustomer, quotationsByCustomer };
    },
  });

  const enrichedContacts = useMemo(() => {
    const dealsByCustomer = (activeSummary.data as any)?.dealsByCustomer || {};
    const quotationsByCustomer = (activeSummary.data as any)?.quotationsByCustomer || {};
    const withMeta = contacts.map((c: any) => {
      const id = String(c?.id || "");
      const d = dealsByCustomer[id] || { count: 0, total: 0 };
      const q = quotationsByCustomer[id] || { count: 0, total: 0 };
      const hasActive = (d.count || 0) > 0 || (q.count || 0) > 0;
      const activeScore = (d.total || 0) + (q.total || 0);
      return { ...c, __activeDeals: d, __activeQuotations: q, __hasActive: hasActive, __activeScore: activeScore };
    });
    // Prioridade: quem tem em curso aparece primeiro; depois por valor total em curso; depois por nome
    return withMeta.sort((a: any, b: any) => {
      if (!!a.__hasActive !== !!b.__hasActive) return a.__hasActive ? -1 : 1;
      if ((b.__activeScore || 0) !== (a.__activeScore || 0)) return (b.__activeScore || 0) - (a.__activeScore || 0);
      return String(a.company_name || a.contact_name || "").localeCompare(String(b.company_name || b.contact_name || ""), "pt");
    });
  }, [contacts, activeSummary.data]);

  const count = useMemo(() => contacts.length, [contacts.length]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contactos</h1>
            <p className="text-muted-foreground">Base Directus (contactos)</p>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="text-base px-3 py-1">
              {count} contactos
            </Badge>
            <Button
              onClick={() => navigate("/contactos/novo")}
              title="Abrir Card 360 (novo)"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, NIF, telefone ou email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {query.isError && (
          <div className="text-sm text-destructive">
            Erro a carregar contactos:{" "}
            <button
              className="underline"
              onClick={() => {
                toast({ title: "A recarregar…" });
                query.refetch();
              }}
            >
              tentar novamente
            </button>
          </div>
        )}

        {/* Mobile: cards */}
        <div className="grid gap-3 md:hidden">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum contacto encontrado
              </CardContent>
            </Card>
          ) : (
            enrichedContacts.map((c: any) => (
              <Card
                key={String(c.id)}
                className={[
                  "cursor-pointer hover:bg-muted/30 transition-colors",
                  c.__hasActive ? "border-amber-500/40 bg-amber-500/5" : "",
                ].join(" ")}
                onClick={() => navigate(`/dashboard360/${encodeURIComponent(String(c.id))}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.company_name || c.contact_name || c.email || c.phone || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        {c.nif && <div>NIF: {c.nif}</div>}
                        {c.phone && <div className="font-mono">{c.phone}</div>}
                        {c.email && <div className="truncate">{c.email}</div>}
                        {c.city && <div className="truncate">{c.city}</div>}
                      </div>
                      {renderTags(c.tags).length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {renderTags(c.tags).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {c.__hasActive ? (
                        <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-700">
                          Em curso
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Contacto</Badge>
                      )}
                      {(c.__activeDeals?.count || 0) > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          Negócios: {c.__activeDeals.count}
                        </Badge>
                      ) : null}
                      {(c.__activeQuotations?.count || 0) > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          Orçamentos: {c.__activeQuotations.count}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {c.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-28"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={`tel:${c.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Ligar
                        </a>
                      </Button>
                    )}
                    {c.whatsapp_number && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-28"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`https://wa.me/${String(c.whatsapp_number).replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    {c.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-28"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={`mailto:${c.email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Newsletter-only matches (when searching) */}
        {searchTerm.trim() && subs.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Resultados na Newsletter (ainda não são contactos)
            </div>
            <div className="grid gap-3">
              {subs.map((s: any) => {
                const label = s.full_name || s.email || s.phone || String(s.id);
                const to = `/newsletter/${encodeURIComponent(String(s.id))}`;
                return (
                  <Card
                    key={String(s.id)}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(to)}
                  >
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{label}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                          {s.email ? <span>{String(s.email)}</span> : null}
                          {s.phone ? <span className="font-mono">{String(s.phone)}</span> : null}
                          {s.coupon_code ? <span>Cupão: {String(s.coupon_code)}</span> : <span>Sem cupão</span>}
                          {s.status ? <span>Estado: {String(s.status)}</span> : null}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">Newsletter</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Desktop: table */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden lg:table-cell">NIF</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum contacto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                enrichedContacts.map((c: any) => (
                  <TableRow
                    key={String(c.id)}
                    className={[
                      "cursor-pointer hover:bg-muted/30",
                      c.__hasActive ? "bg-amber-500/5" : "",
                    ].join(" ")}
                    onClick={() => navigate(`/dashboard360/${encodeURIComponent(String(c.id))}`)}
                  >
                    <TableCell className="font-medium">
                      {c.company_name || c.contact_name || c.email || c.phone || "-"}
                      {c.__hasActive ? (
                        <span className="ml-2 align-middle">
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-700">
                            Em curso • N:{c.__activeDeals?.count || 0} • O:{c.__activeQuotations?.count || 0}
                          </Badge>
                        </span>
                      ) : null}
                      {c.city ? (
                        <div className="text-xs text-muted-foreground mt-1 truncate">{String(c.city)}</div>
                      ) : null}
                      {renderTags(c.tags).length ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {renderTags(c.tags).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{c.nif || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{c.phone || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {c.phone && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${c.phone}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {c.email && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={`mailto:${c.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {c.whatsapp_number && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`https://wa.me/${String(c.whatsapp_number).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Badge variant="secondary" className="mr-1">Contacto</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}

