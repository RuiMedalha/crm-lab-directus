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
import { toast } from "@/hooks/use-toast";

export default function ContactosDirectus() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const query = useQuery({
    queryKey: ["contacts-directus", searchTerm],
    queryFn: async () => {
      return await listContacts({ search: searchTerm, limit: 500, page: 1 });
    },
  });

  const contacts = query.data || [];
  const isLoading = query.isLoading;

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

        <div className="border rounded-lg overflow-hidden">
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
                  <TableRow key={String(c.id)}>
                    <TableCell className="font-medium">
                      {c.company_name || c.contact_name || c.email || c.phone || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{c.nif || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{c.phone || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{c.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {c.phone && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`tel:${c.phone}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {c.email && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`mailto:${c.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {c.whatsapp_number && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a
                              href={`https://wa.me/${String(c.whatsapp_number).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/dashboard360/${encodeURIComponent(String(c.id))}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
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

