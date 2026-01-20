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
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactosDirectus() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

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
            contacts.map((c: any) => (
              <Card
                key={String(c.id)}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
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
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">Contacto</Badge>
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
                contacts.map((c: any) => (
                  <TableRow
                    key={String(c.id)}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(`/dashboard360/${encodeURIComponent(String(c.id))}`)}
                  >
                    <TableCell className="font-medium">
                      {c.company_name || c.contact_name || c.email || c.phone || "-"}
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

