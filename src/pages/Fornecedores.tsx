import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useManufacturers,
  useCreateManufacturer,
  useUpdateManufacturer,
  useDeleteManufacturer,
} from "@/hooks/useManufacturers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Mail, 
  Building2, 
  Phone, 
  Link2, 
  Percent, 
  FileText,
  BookOpen
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card as UICard, CardContent as UICardContent } from "@/components/ui/card";

const ORDER_METHODS = [
  { value: "email", label: "Email" },
  { value: "portal", label: "Portal" },
  { value: "phone", label: "Telefone" },
  { value: "api", label: "API" },
];

interface ManufacturerFormData {
  name: string;
  sku_prefix: string;
  contact_email: string;
  portal_url: string;
  order_method: string;
  internal_notes: string;
  // New fields
  address: string;
  postal_code: string;
  city: string;
  phone_main: string;
  phone_secondary: string;
  sales_rep_name: string;
  discount_info: string;
  catalog_url: string;
  email_invoicing: string;
  email_logistics: string;
  custom_field_1_name: string;
  custom_field_1_value: string;
  custom_field_2_name: string;
  custom_field_2_value: string;
}

const emptyFormData: ManufacturerFormData = {
  name: "",
  sku_prefix: "",
  contact_email: "",
  portal_url: "",
  order_method: "email",
  internal_notes: "",
  address: "",
  postal_code: "",
  city: "",
  phone_main: "",
  phone_secondary: "",
  sales_rep_name: "",
  discount_info: "",
  catalog_url: "",
  email_invoicing: "",
  email_logistics: "",
  custom_field_1_name: "",
  custom_field_1_value: "",
  custom_field_2_name: "",
  custom_field_2_value: "",
};

export default function Fornecedores() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: manufacturers, isLoading } = useManufacturers(searchTerm);
  const createManufacturer = useCreateManufacturer();
  const updateManufacturer = useUpdateManufacturer();
  const deleteManufacturer = useDeleteManufacturer();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ManufacturerFormData>(emptyFormData);

  const handleOpenDialog = (manufacturer?: any) => {
    if (manufacturer) {
      setEditingId(manufacturer.id);
      setFormData({
        name: manufacturer.name || "",
        sku_prefix: manufacturer.sku_prefix || "",
        contact_email: manufacturer.contact_email || "",
        portal_url: manufacturer.portal_url || "",
        order_method: manufacturer.order_method || "email",
        internal_notes: manufacturer.internal_notes || "",
        address: manufacturer.address || "",
        postal_code: manufacturer.postal_code || "",
        city: manufacturer.city || "",
        phone_main: manufacturer.phone_main || "",
        phone_secondary: manufacturer.phone_secondary || "",
        sales_rep_name: manufacturer.sales_rep_name || "",
        discount_info: manufacturer.discount_info || "",
        catalog_url: manufacturer.catalog_url || "",
        email_invoicing: manufacturer.email_invoicing || "",
        email_logistics: manufacturer.email_logistics || "",
        custom_field_1_name: manufacturer.custom_field_1_name || "",
        custom_field_1_value: manufacturer.custom_field_1_value || "",
        custom_field_2_name: manufacturer.custom_field_2_name || "",
        custom_field_2_value: manufacturer.custom_field_2_value || "",
      });
    } else {
      setEditingId(null);
      setFormData(emptyFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "O nome é obrigatório", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        await updateManufacturer.mutateAsync({ id: editingId, ...formData });
        toast({ title: "Fornecedor atualizado com sucesso" });
      } else {
        await createManufacturer.mutateAsync(formData);
        toast({ title: "Fornecedor criado com sucesso" });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao guardar fornecedor", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteManufacturer.mutateAsync(deleteId);
      toast({ title: "Fornecedor eliminado com sucesso" });
      setDeleteId(null);
    } catch (error) {
      toast({ title: "Erro ao eliminar fornecedor", variant: "destructive" });
    }
  };

  const updateField = (field: keyof ManufacturerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
            <p className="text-muted-foreground">Gestão de fabricantes e fornecedores</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou prefixo SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile: cards */}
        <div className="grid gap-3 md:hidden">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : manufacturers?.length === 0 ? (
            <UICard>
              <UICardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum fornecedor encontrado
              </UICardContent>
            </UICard>
          ) : (
            manufacturers?.map((m: any) => (
              <UICard key={m.id}>
                <UICardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        {m.sku_prefix && (
                          <div>
                            <Badge variant="secondary">{m.sku_prefix}</Badge>
                          </div>
                        )}
                        {m.sales_rep_name && <div>Vendedor: {m.sales_rep_name}</div>}
                        {m.phone_main && <div className="font-mono">{m.phone_main}</div>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog(m)}>
                      Editar
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {m.catalog_url && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-28" asChild>
                        <a href={m.catalog_url} target="_blank" rel="noopener noreferrer">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Catálogo
                        </a>
                      </Button>
                    )}
                    {m.portal_url && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-28" asChild>
                        <a href={m.portal_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Portal
                        </a>
                      </Button>
                    )}
                    {m.contact_email && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-28" asChild>
                        <a href={`mailto:${m.contact_email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </UICardContent>
              </UICard>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Prefixo SKU</TableHead>
                <TableHead className="hidden md:table-cell">Método</TableHead>
                <TableHead className="hidden lg:table-cell">Vendedor</TableHead>
                <TableHead className="hidden xl:table-cell">Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : manufacturers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum fornecedor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                manufacturers?.map((manufacturer: any) => (
                  <TableRow key={manufacturer.id}>
                    <TableCell className="font-medium">{manufacturer.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {manufacturer.sku_prefix ? (
                        <Badge variant="secondary">{manufacturer.sku_prefix}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ORDER_METHODS.find((m) => m.value === manufacturer.order_method)?.label ||
                        manufacturer.order_method || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {manufacturer.sales_rep_name || "-"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {manufacturer.phone_main || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {manufacturer.catalog_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={manufacturer.catalog_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Catálogo"
                            >
                              <BookOpen className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {manufacturer.portal_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={manufacturer.portal_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Portal"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {manufacturer.contact_email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a href={`mailto:${manufacturer.contact_email}`} title="Email">
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(manufacturer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(manufacturer.id)}
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

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>Preencha os dados do fornecedor</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="geral" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="contactos" className="text-xs">
                <Phone className="h-3 w-3 mr-1" />
                Contactos
              </TabsTrigger>
              <TabsTrigger value="morada" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                Morada
              </TabsTrigger>
              <TabsTrigger value="comercial" className="text-xs">
                <Percent className="h-3 w-3 mr-1" />
                Comercial
              </TabsTrigger>
              <TabsTrigger value="notas" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Notas
              </TabsTrigger>
            </TabsList>

            {/* Tab: Geral */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku_prefix">Prefixo SKU</Label>
                  <Input
                    id="sku_prefix"
                    value={formData.sku_prefix}
                    onChange={(e) => updateField("sku_prefix", e.target.value)}
                    placeholder="Ex: BRB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order_method">Método de Encomenda</Label>
                  <Select
                    value={formData.order_method}
                    onValueChange={(value) => updateField("order_method", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portal_url">URL do Portal</Label>
                  <Input
                    id="portal_url"
                    value={formData.portal_url}
                    onChange={(e) => updateField("portal_url", e.target.value)}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="catalog_url">URL do Catálogo</Label>
                  <Input
                    id="catalog_url"
                    value={formData.catalog_url}
                    onChange={(e) => updateField("catalog_url", e.target.value)}
                    placeholder="https://catalogo.exemplo.com"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Contactos */}
            <TabsContent value="contactos" className="space-y-4 mt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_main">Telefone Principal</Label>
                  <Input
                    id="phone_main"
                    value={formData.phone_main}
                    onChange={(e) => updateField("phone_main", e.target.value)}
                    placeholder="+351 XXX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_secondary">Telefone Secundário</Label>
                  <Input
                    id="phone_secondary"
                    value={formData.phone_secondary}
                    onChange={(e) => updateField("phone_secondary", e.target.value)}
                    placeholder="+351 XXX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales_rep_name">Nome do Vendedor</Label>
                  <Input
                    id="sales_rep_name"
                    value={formData.sales_rep_name}
                    onChange={(e) => updateField("sales_rep_name", e.target.value)}
                    placeholder="Nome do representante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email Geral</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => updateField("contact_email", e.target.value)}
                    placeholder="geral@fornecedor.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_invoicing">Email Faturação</Label>
                  <Input
                    id="email_invoicing"
                    type="email"
                    value={formData.email_invoicing}
                    onChange={(e) => updateField("email_invoicing", e.target.value)}
                    placeholder="faturacao@fornecedor.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_logistics">Email Logística</Label>
                  <Input
                    id="email_logistics"
                    type="email"
                    value={formData.email_logistics}
                    onChange={(e) => updateField("email_logistics", e.target.value)}
                    placeholder="logistica@fornecedor.com"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Morada */}
            <TabsContent value="morada" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Morada</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Rua, número..."
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => updateField("postal_code", e.target.value)}
                      placeholder="0000-000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Localidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Comercial */}
            <TabsContent value="comercial" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_info">Informação de Descontos</Label>
                  <Textarea
                    id="discount_info"
                    value={formData.discount_info}
                    onChange={(e) => updateField("discount_info", e.target.value)}
                    placeholder="Ex: 15% em compras acima de 500€, 20% para pagamento antecipado..."
                    rows={3}
                  />
                </div>
                
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium">Campo Personalizado 1</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="custom_field_1_name">Nome do Campo</Label>
                      <Input
                        id="custom_field_1_name"
                        value={formData.custom_field_1_name}
                        onChange={(e) => updateField("custom_field_1_name", e.target.value)}
                        placeholder="Ex: Código Cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom_field_1_value">Valor</Label>
                      <Input
                        id="custom_field_1_value"
                        value={formData.custom_field_1_value}
                        onChange={(e) => updateField("custom_field_1_value", e.target.value)}
                        placeholder="Ex: CLI-12345"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium">Campo Personalizado 2</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="custom_field_2_name">Nome do Campo</Label>
                      <Input
                        id="custom_field_2_name"
                        value={formData.custom_field_2_name}
                        onChange={(e) => updateField("custom_field_2_name", e.target.value)}
                        placeholder="Ex: Prazo de Entrega"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom_field_2_value">Valor</Label>
                      <Input
                        id="custom_field_2_value"
                        value={formData.custom_field_2_value}
                        onChange={(e) => updateField("custom_field_2_value", e.target.value)}
                        placeholder="Ex: 5-7 dias úteis"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Notas */}
            <TabsContent value="notas" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="internal_notes">Notas Internas</Label>
                <Textarea
                  id="internal_notes"
                  value={formData.internal_notes}
                  onChange={(e) => updateField("internal_notes", e.target.value)}
                  placeholder="Notas e observações internas sobre este fornecedor..."
                  rows={8}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createManufacturer.isPending || updateManufacturer.isPending}
            >
              {editingId ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O fornecedor será eliminado permanentemente.
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
