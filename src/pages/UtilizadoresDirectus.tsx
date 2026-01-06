import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  patchEmployee,
  type EmployeeItem,
  type EmployeeRole,
} from "@/integrations/directus/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Mail, Phone, Plus, Search, Shield, Trash2, UserCog, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  gestor: "Gestor",
  vendedor: "Vendedor",
  visualizador: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  gestor: "bg-blue-600 text-white",
  vendedor: "bg-amber-600 text-white",
  visualizador: "bg-muted text-foreground",
};

const ALL_ROLES: EmployeeRole[] = ["admin", "gestor", "vendedor", "visualizador"];

function roleLabel(role?: string | null) {
  if (!role) return "—";
  return ROLE_LABELS[role] || role;
}

function roleClass(role?: string | null) {
  if (!role) return "bg-muted text-foreground";
  return ROLE_COLORS[role] || "bg-muted text-foreground";
}

export default function UtilizadoresDirectus() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["employees", search],
    queryFn: async () => await listEmployees({ search, limit: 500, page: 1 }),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<EmployeeItem> & { id?: string }) => {
      if (payload.id) {
        const { id, ...patch } = payload;
        return await patchEmployee(id, patch);
      }
      return await createEmployee(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteEmployee(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const [form, setForm] = useState<Partial<EmployeeItem>>({
    full_name: "",
    email: "",
    phone: "",
    role: "vendedor",
    is_active: true,
    notes: "",
  });

  const items = query.data || [];
  const isLoading = query.isLoading;

  const count = useMemo(() => items.length, [items.length]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      full_name: "",
      email: "",
      phone: "",
      role: "vendedor",
      is_active: true,
      notes: "",
    });
    setOpen(true);
  };

  const openEdit = (emp: EmployeeItem) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      role: emp.role || "vendedor",
      is_active: emp.is_active ?? true,
      notes: emp.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (!form.full_name?.toString().trim()) {
        toast({ title: "Nome é obrigatório", variant: "destructive" });
        return;
      }
      await saveMutation.mutateAsync({ id: editing?.id, ...form });
      toast({ title: editing ? "Utilizador atualizado" : "Utilizador criado" });
      setOpen(false);
    } catch (e) {
      toast({ title: "Erro ao guardar", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Utilizador eliminado" });
      setDeleteId(null);
    } catch (e) {
      toast({ title: "Erro ao eliminar", variant: "destructive" });
    }
  };

  const toggleActive = async (emp: EmployeeItem, active: boolean) => {
    try {
      await patchEmployee(emp.id, { is_active: active });
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch {
      toast({ title: "Erro ao atualizar estado", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Utilizadores</h1>
            <p className="text-muted-foreground">Funcionários e roles (Directus)</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-base px-3 py-1">
              {count} funcionários
            </Badge>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile: cards */}
        <div className="grid gap-3 md:hidden">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Sem utilizadores
              </CardContent>
            </Card>
          ) : (
            items.map((emp) => (
              <Card key={emp.id} className="p-0">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{emp.full_name || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        {emp.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{emp.email}</span>
                          </div>
                        )}
                        {emp.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <span className="font-mono">{emp.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={roleClass(emp.role)}>{roleLabel(emp.role)}</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Ativo</span>
                    </div>
                    <Switch checked={!!emp.is_active} onCheckedChange={(v) => toggleActive(emp, v)} />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => openEdit(emp)}>
                      <UserCog className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(emp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden xl:table-cell">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Sem utilizadores
                  </TableCell>
                </TableRow>
              ) : (
                items.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name || "Sem nome"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{emp.email || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-muted-foreground">{emp.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={roleClass(emp.role)}>{roleLabel(emp.role)}</Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <Switch checked={!!emp.is_active} onCheckedChange={(v) => toggleActive(emp, v)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(emp)}>
                          <Users className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(emp.id)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar utilizador" : "Novo utilizador"}</DialogTitle>
            <DialogDescription>
              Define o role da pessoa no CRM (usado para permissões e vistas).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={String(form.full_name || "")} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={String(form.email || "")}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={String(form.phone || "")} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={String(form.role || "vendedor")}
                  onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {roleLabel(String(r))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ativo</Label>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm text-muted-foreground">Permitir acesso</span>
                  <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar utilizador?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto apaga o registo do funcionário no Directus (não apaga contas externas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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

