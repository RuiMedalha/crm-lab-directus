import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useContacts, useDeleteContact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, Eye, Trash2, Phone, Mail, MessageCircle, Download, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
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

export default function Contactos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: contacts, isLoading } = useContacts(searchTerm);
  const deleteContact = useDeleteContact();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!deleteId) return;
    const contactToDelete = contacts?.find(c => c.id === deleteId);

    try {
      await deleteContact.mutateAsync(deleteId);
      toast.success("Contacto eliminado", {
        description: contactToDelete?.company_name,
      });
      setDeleteId(null);
    } catch (error) {
      toast.error("Erro ao eliminar", {
        description: "Não foi possível eliminar o contacto.",
      });
    }
  };

  const handleExportCSV = () => {
    if (!contacts?.length) {
      toast.warning("Sem contactos para exportar");
      return;
    }

    const headers = ['Empresa', 'Contacto', 'NIF', 'Telefone', 'Email', 'WhatsApp', 'Morada', 'Cidade', 'Código Postal'];
    const rows = contacts.map(c => [
      c.company_name || '',
      c.contact_name || '',
      c.nif || '',
      c.phone || '',
      c.email || '',
      c.whatsapp_number || '',
      c.address || '',
      c.city || '',
      c.postal_code || ''
    ].map(field => `"${field.replace(/"/g, '""')}"`));

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contactos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${contacts.length} contactos exportados`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contactos</h1>
            <p className="text-muted-foreground">Gerir clientes e empresas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => navigate("/contactos/novo")}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Contacto
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, NIF ou Moloni ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                <TableHead className="hidden lg:table-cell">NIF</TableHead>
                <TableHead className="hidden sm:table-cell">Telemóvel</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={5} columns={6} />
              ) : contacts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-0">
                    <EmptyState
                      icon={Users}
                      title={searchTerm ? "Nenhum contacto encontrado" : "Ainda não tens contactos"}
                      description={
                        searchTerm
                          ? "Tenta ajustar os termos de pesquisa para encontrar o que procuras."
                          : "Começa a adicionar contactos para gerir os teus clientes e empresas."
                      }
                      action={
                        !searchTerm
                          ? {
                            label: "Criar Primeiro Contacto",
                            onClick: () => navigate("/contactos/novo"),
                          }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                contacts?.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.company_name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {contact.contact_name || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {contact.nif || "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {contact.phone || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {contact.email || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {contact.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a href={`tel:${contact.phone}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {contact.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a href={`mailto:${contact.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {contact.whatsapp_number && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={`https://wa.me/${contact.whatsapp_number.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link to={`/contactos/${contact.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O contacto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
