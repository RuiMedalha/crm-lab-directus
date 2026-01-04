import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProfiles, useUpdateProfile } from "@/hooks/useProfiles";
import {
  useUserRoles,
  useAddUserRole,
  useRemoveUserRole,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type AppRole,
} from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Shield, Users, UserCog, Eye, ShoppingBag, Plus, UserPlus, Mail, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ROLE_ICONS: Record<AppRole, typeof Shield> = {
  admin: Shield,
  gestor: UserCog,
  vendedor: ShoppingBag,
  visualizador: Eye,
};

const ALL_ROLES: AppRole[] = ["admin", "gestor", "vendedor", "visualizador"];

export default function Utilizadores() {
  const { data: profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useProfiles();
  const { data: allRoles, isLoading: rolesLoading } = useUserRoles();
  const updateProfile = useUpdateProfile();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<AppRole[]>([]);
  
  // New user registration state
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    full_name: "",
    selectedRoles: [] as AppRole[],
  });
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const isLoading = profilesLoading || rolesLoading;

  const getUserRoles = (userId: string): AppRole[] => {
    return allRoles?.filter((r) => r.user_id === userId).map((r) => r.role as AppRole) || [];
  };

  const filteredProfiles = profiles?.filter((p) =>
    (p.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (p.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const handleEditRoles = (userId: string) => {
    setSelectedUser(userId);
    setEditingRoles(getUserRoles(userId));
  };

  const handleToggleRole = (role: AppRole) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleToggleNewUserRole = (role: AppRole) => {
    setNewUserData((prev) => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter((r) => r !== role)
        : [...prev.selectedRoles, role],
    }));
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    try {
      const currentRoles = getUserRoles(selectedUser);
      const rolesToAdd = editingRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !editingRoles.includes(r));

      // Add new roles
      for (const role of rolesToAdd) {
        await addRole.mutateAsync({ user_id: selectedUser, role });
      }

      // Remove old roles
      for (const role of rolesToRemove) {
        const roleRecord = allRoles?.find(
          (r) => r.user_id === selectedUser && r.role === role
        );
        if (roleRecord) {
          await removeRole.mutateAsync(roleRecord.id);
        }
      }

      toast({ title: "Permissões atualizadas com sucesso" });
      setSelectedUser(null);
    } catch (error) {
      toast({ title: "Erro ao atualizar permissões", variant: "destructive" });
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await updateProfile.mutateAsync({ id: userId, is_active: isActive });
      toast({ title: isActive ? "Utilizador ativado" : "Utilizador desativado" });
    } catch (error) {
      toast({ title: "Erro ao atualizar utilizador", variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    setRegistrationError(null);
    
    // Validation
    if (!newUserData.email.trim()) {
      setRegistrationError("O email é obrigatório");
      return;
    }
    if (!newUserData.password || newUserData.password.length < 6) {
      setRegistrationError("A password deve ter pelo menos 6 caracteres");
      return;
    }
    if (!newUserData.full_name.trim()) {
      setRegistrationError("O nome é obrigatório");
      return;
    }

    setIsCreating(true);
    try {
      // Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: newUserData.email.trim(),
        password: newUserData.password,
        options: {
          data: {
            full_name: newUserData.full_name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setRegistrationError("Este email já está registado");
        } else {
          setRegistrationError(error.message);
        }
        return;
      }

      if (data.user) {
        // Add roles to the new user
        for (const role of newUserData.selectedRoles) {
          try {
            await addRole.mutateAsync({ user_id: data.user.id, role });
          } catch (roleError) {
            console.error("Error adding role:", roleError);
          }
        }

        toast({ 
          title: "Utilizador criado com sucesso",
          description: "Um email de confirmação foi enviado ao utilizador."
        });
        
        setShowNewUserDialog(false);
        setNewUserData({
          email: "",
          password: "",
          full_name: "",
          selectedRoles: [],
        });
        
        // Refresh profiles list
        setTimeout(() => {
          refetchProfiles();
        }, 1000);
      }
    } catch (error: any) {
      setRegistrationError(error.message || "Erro ao criar utilizador");
    } finally {
      setIsCreating(false);
    }
  };

  const resetNewUserDialog = () => {
    setShowNewUserDialog(false);
    setNewUserData({
      email: "",
      password: "",
      full_name: "",
      selectedRoles: [],
    });
    setRegistrationError(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Utilizadores</h1>
            <p className="text-muted-foreground">Gestão de utilizadores e permissões</p>
          </div>
          <Button onClick={() => setShowNewUserDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Utilizador
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Gestão de Utilizadores</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie novos utilizadores ou gira as permissões dos existentes. 
                Os novos utilizadores receberão um email de confirmação.
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProfiles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum utilizador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles?.map((profile) => {
                  const roles = getUserRoles(profile.id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.full_name || "Sem nome"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sem permissões</span>
                          ) : (
                            roles.map((role) => {
                              const Icon = ROLE_ICONS[role];
                              return (
                                <Badge key={role} variant="secondary" className="text-[10px]">
                                  <Icon className="h-3 w-3 mr-1" />
                                  {ROLE_LABELS[role]}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Switch
                          checked={profile.is_active}
                          onCheckedChange={(checked) => handleToggleActive(profile.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRoles(profile.id)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Permissões
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Roles Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerir Permissões</DialogTitle>
            <DialogDescription>Selecione as permissões para este utilizador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {ALL_ROLES.map((role) => {
              const Icon = ROLE_ICONS[role];
              return (
                <div
                  key={role}
                  className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => handleToggleRole(role)}
                >
                  <Checkbox
                    checked={editingRoles.includes(role)}
                    onCheckedChange={() => handleToggleRole(role)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <Label className="font-medium cursor-pointer">
                        {ROLE_LABELS[role]}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={addRole.isPending || removeRole.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={resetNewUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Utilizador</DialogTitle>
            <DialogDescription>
              Crie uma nova conta de utilizador. Um email de confirmação será enviado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {registrationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{registrationError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new_full_name">Nome Completo *</Label>
              <Input
                id="new_full_name"
                value={newUserData.full_name}
                onChange={(e) => setNewUserData((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nome do utilizador"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new_email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_password">Password *</Label>
              <Input
                id="new_password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-3">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map((role) => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <div
                      key={role}
                      className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => handleToggleNewUserRole(role)}
                    >
                      <Checkbox
                        checked={newUserData.selectedRoles.includes(role)}
                        onCheckedChange={() => handleToggleNewUserRole(role)}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{ROLE_LABELS[role]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetNewUserDialog}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              <UserPlus className="h-4 w-4 mr-2" />
              {isCreating ? "A criar..." : "Criar Utilizador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
