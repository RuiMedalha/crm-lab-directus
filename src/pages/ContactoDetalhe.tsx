import { TagSelector } from "@/components/contacts/TagSelector";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useContact, useUpdateContact } from "@/hooks/useContacts";
import { useDeliveryAddresses } from "@/hooks/useDeliveryAddresses";
import { useDeleteDeliveryAddress } from "@/hooks/useDeliveryAddressMutations";
import { useExternalDocuments } from "@/hooks/useExternalDocuments";
import { useCompanySettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Save,
  MapPin,
  FileText,
  StickyNote,
  ExternalLink,
  Globe,
  Plus,
  Edit,
  Trash2,
  Building2,
  ShoppingCart,
  Wrench,
  Truck,
  MailCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DeliveryAddressDialog } from "@/components/contacts/DeliveryAddressDialog";
import { ProductSearchTab } from "@/components/contacts/ProductSearchTab";
import { SkuHistorySection } from "@/components/contacts/SkuHistorySection";
import { NotesTimeline } from "@/components/contacts/NotesTimeline";
import { ContactTickets } from "@/components/contacts/ContactTickets";
import { LogisticsTab } from "@/components/contacts/LogisticsTab";
import { QuotationCreator } from "@/components/quotations/QuotationCreator";
import { QuotationSidebar } from "@/components/quotations/QuotationSidebar";
import { QuotationBuilderProvider } from "@/contexts/QuotationBuilderContext";
import { QuickNotesWidget } from "@/components/contacts/QuickNotesWidget";
import { NewsletterBanner } from "@/components/contacts/NewsletterBanner";
import type { DeliveryAddress } from "@/hooks/useDeliveryAddresses";

interface QuickNote {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

export default function ContactoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id);
  const { data: addresses, isLoading: addressesLoading } = useDeliveryAddresses(id);
  const { data: documents, isLoading: documentsLoading } = useExternalDocuments(id);
  const { data: settings } = useCompanySettings();
  const updateContact = useUpdateContact();
  const deleteAddress = useDeleteDeliveryAddress();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [showQuotationCreator, setShowQuotationCreator] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const getValue = (field: string) => {
    return formData[field] ?? contact?.[field as keyof typeof contact] ?? "";
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateContact.mutateAsync({ id, ...formData });
      toast({ title: "Contacto atualizado com sucesso" });
      setHasChanges(false);
    } catch (error) {
      toast({ title: "Erro ao atualizar contacto", variant: "destructive" });
    }
  };

  const handleEditAddress = (address: DeliveryAddress) => {
    setEditingAddress(address);
    setAddressDialogOpen(true);
  };

  const handleNewAddress = () => {
    setEditingAddress(null);
    setAddressDialogOpen(true);
  };

  const handleDeleteAddress = async () => {
    if (!deletingAddressId || !id) return;
    try {
      await deleteAddress.mutateAsync({ id: deletingAddressId, contactId: id });
      toast({ title: "Morada eliminada com sucesso" });
      setDeletingAddressId(null);
    } catch (error) {
      toast({ title: "Erro ao eliminar morada", variant: "destructive" });
    }
  };

  // Quick action handlers
  const handleCreateQuotation = () => {
    if (!id || !contact) return;
    setShowQuotationCreator(true);
  };

  const handleCreateTicket = async (type: 'tecnico' | 'logistica') => {
    if (!id || !contact) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          contact_id: id,
          title: type === 'tecnico' 
            ? `Suporte Técnico - ${contact.company_name}` 
            : `Logística - ${contact.company_name}`,
          task_type: type,
          status: 'pending',
          priority: 'medium'
        });

      if (error) throw error;

      toast({ title: type === 'tecnico' ? "Ticket técnico criado" : "Ticket logística criado" });
    } catch (error) {
      toast({ title: "Erro ao criar ticket", variant: "destructive" });
    }
  };

  const chatwootUrl = (settings as any)?.chatwoot_url;

  // Parse quick_notes from contact
  const quickNotes: QuickNote[] = Array.isArray(contact?.quick_notes) 
    ? (contact.quick_notes as unknown as QuickNote[])
    : [];

  // Parse sku_history from contact
  const skuHistory: string[] = Array.isArray(contact?.sku_history) 
    ? contact.sku_history 
    : [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contacto não encontrado</p>
          <Button variant="link" onClick={() => navigate("/contactos")}>
            Voltar aos contactos
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contactos")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{contact.company_name}</h1>
              <p className="text-muted-foreground">{contact.contact_name || "Sem contacto principal"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Communication buttons */}
            {contact.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${contact.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </a>
              </Button>
            )}
            {contact.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${contact.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </a>
              </Button>
            )}
            {contact.whatsapp_number && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://wa.me/${contact.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            )}
            {chatwootUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={chatwootUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 mr-2" />
                  Chat
                </a>
              </Button>
            )}

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* Quick action buttons */}
            <Button size="sm" onClick={handleCreateQuotation}>
              <FileText className="h-4 w-4 mr-2" />
              Orçamento
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleCreateTicket('tecnico')}>
              <Wrench className="h-4 w-4 mr-2" />
              Técnico
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleCreateTicket('logistica')}>
              <Truck className="h-4 w-4 mr-2" />
              Logística
            </Button>
          </div>
        </div>

        {/* Main Content with Tabs like Fornecedores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Ficha de Cliente
            </CardTitle>
            <CardDescription>
              NIF: {contact.nif || "-"} | Moloni: {contact.moloni_client_id || "-"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-auto">
                <TabsTrigger value="geral" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="contactos" className="text-xs">
                  <Phone className="h-3 w-3 mr-1" />
                  Contactos
                </TabsTrigger>
                <TabsTrigger value="morada" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Morada
                </TabsTrigger>
                <TabsTrigger value="comercial" className="text-xs">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Comercial
                </TabsTrigger>
                <TabsTrigger value="logistica" className="text-xs">
                  <Truck className="h-3 w-3 mr-1" />
                  Logística
                </TabsTrigger>
                <TabsTrigger value="notas" className="text-xs">
                  <StickyNote className="h-3 w-3 mr-1" />
                  Notas
                </TabsTrigger>
              </TabsList>

              {/* Tab: Geral - Layout 2.0 com Quick Notes */}
<TabsContent value="geral" className="space-y-4 mt-4">
  {/* Newsletter Banner */}
  <NewsletterBanner
    contactId={id!}
    contactEmail={contact.email}
    contactPhone={contact.phone}
    acceptNewsletter={contact.accept_newsletter || false}
    newsletterWelcomeSent={(contact as any).newsletter_welcome_sent || false}
    onUpdate={(accept, sent) => {
      handleChange("accept_newsletter", accept);
    }}
  />

  <div className="grid lg:grid-cols-3 gap-4">
    {/* Coluna Principal - Dados Mestres */}
    <div className="lg:col-span-2 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company_name">Nome da Empresa *</Label>
          <Input
            id="company_name"
            value={getValue("company_name")}
            onChange={(e) => handleChange("company_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_name">Nome do Contacto</Label>
          <Input
            id="contact_name"
            value={getValue("contact_name")}
            onChange={(e) => handleChange("contact_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nif">Contribuinte (NIF)</Label>
          <Input
            id="nif"
            value={getValue("nif")}
            onChange={(e) => handleChange("nif", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="moloni_client_id">Moloni ID</Label>
          <Input
            id="moloni_client_id"
            value={getValue("moloni_client_id")}
            onChange={(e) => handleChange("moloni_client_id", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={getValue("website")}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="https://"
          />
        </div>
        
        {/* Tags */}
        <div className="space-y-2 sm:col-span-2">
          <Label>Tags de Categorização</Label>
          <TagSelector
            selectedTags={getValue("tags") || []}
            onChange={(tags) => handleChange("tags", tags)}
            disabled={updateContact.isPending}
          />
        </div>
      </div>
    </div>

    {/* Coluna Lateral - Quick Notes */}
    <div className="lg:col-span-1">
      <QuickNotesWidget
        contactId={id!}
        quickNotes={quickNotes}
        onNoteAdded={(notes) => {
          // Update local state without page reload
          setFormData(prev => ({ ...prev, quick_notes: notes }));
        }}
      />
    </div>
  </div>
</TabsContent>
              {/* Tab: Contactos */}
              <TabsContent value="contactos" className="space-y-4 mt-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone Principal</Label>
                    <Input
                      id="phone"
                      value={getValue("phone")}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+351 XXX XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Principal</Label>
                    <Input
                      id="email"
                      type="email"
                      value={getValue("email")}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_number">WhatsApp</Label>
                    <Input
                      id="whatsapp_number"
                      value={getValue("whatsapp_number")}
                      onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                      placeholder="+351..."
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Contacto Secundário</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Nome</Label>
                      <Input
                        id="contact_person"
                        value={getValue("contact_person")}
                        onChange={(e) => handleChange("contact_person", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Telemóvel</Label>
                      <Input
                        id="contact_phone"
                        value={getValue("contact_phone")}
                        onChange={(e) => handleChange("contact_phone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={getValue("contact_email")}
                        onChange={(e) => handleChange("contact_email", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Morada */}
              <TabsContent value="morada" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Morada Principal</Label>
                  <Input
                    id="address"
                    value={getValue("address")}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input
                      id="postal_code"
                      value={getValue("postal_code")}
                      onChange={(e) => handleChange("postal_code", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Localidade</Label>
                    <Input
                      id="city"
                      value={getValue("city")}
                      onChange={(e) => handleChange("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country_id">País</Label>
                    <Input
                      id="country_id"
                      value={getValue("country_id")}
                      onChange={(e) => handleChange("country_id", e.target.value)}
                      placeholder="Portugal"
                    />
                  </div>
                </div>

                <Separator />

                {/* Delivery Addresses */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Moradas de Entrega</h3>
                    <Button variant="outline" size="sm" onClick={handleNewAddress}>
                      <Plus className="h-3 w-3 mr-1" />
                      Nova Morada
                    </Button>
                  </div>
                  {addressesLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : addresses?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                      Sem moradas de entrega adicionais
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {addresses?.map((addr) => (
                        <div key={addr.id} className="p-3 rounded-lg border bg-muted/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{addr.address_name || "Morada"}</p>
                                {addr.is_main_address && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{addr.address}</p>
                              <p className="text-xs text-muted-foreground">{addr.postal_code} {addr.city}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditAddress(addr)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingAddressId(addr.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Comercial */}
              <TabsContent value="comercial" className="space-y-6 mt-4">
                <QuotationBuilderProvider>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - 2/3 */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* SKU History */}
                      <SkuHistorySection contactId={id!} skuHistory={skuHistory} />

                      <Separator />

                      {/* Product Search with Add to Quotation */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Pesquisar Produtos</h3>
                        <ProductSearchTab clientPhone={contact.phone} showAddToQuotation={true} />
                      </div>
                    </div>

                    {/* Sidebar - 1/3 */}
                    <div className="lg:col-span-1">
                      <QuotationSidebar 
                        contactId={id!} 
                        contactName={contact.company_name}
                      />
                    </div>

                    {/* Documentos e Tickets fora do grid da sidebar */}
                  </div>
                </QuotationBuilderProvider>

                <Separator />

                {/* External Documents */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Documentos</h3>
                  {documentsLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : documents?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                      Sem documentos associados
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {documents?.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.doc_number}</p>
                              <p className="text-xs text-muted-foreground">{doc.doc_type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.total_amount && (
                              <Badge variant="secondary">{doc.total_amount.toFixed(2)}€</Badge>
                            )}
                            {doc.pdf_link && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                <a href={doc.pdf_link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tickets Section */}
                <Separator />
                <ContactTickets 
                  contactId={id!} 
                  companyName={contact.company_name}
                  email={contact.email}
                  whatsappNumber={contact.whatsapp_number}
                />
              </TabsContent>

              {/* Tab: Logística */}
              <TabsContent value="logistica" className="space-y-4 mt-4">
                <LogisticsTab contactId={id!} />
              </TabsContent>

              {/* Tab: Notas */}
              <TabsContent value="notas" className="space-y-4 mt-4">
                <NotesTimeline contactId={id!} quickNotes={quickNotes} />
              </TabsContent>
            </Tabs>

            {/* Newsletter Badge */}
            {contact.accept_newsletter && (
              <div className="mt-4 p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm">Subscrito à Newsletter</span>
                </div>
                {(contact as any).newsletter_welcome_sent && (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    <MailCheck className="h-3 w-3 mr-1" />
                    Email de Boas-Vindas Enviado
                  </Badge>
                )}
              </div>
            )}

            {/* Save Button */}
            {hasChanges && (
              <div className="flex justify-end pt-4 mt-4 border-t">
                <Button onClick={handleSave} disabled={updateContact.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Alterações
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <DeliveryAddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        contactId={id!}
        address={editingAddress}
      />

      <QuotationCreator
        open={showQuotationCreator}
        onOpenChange={setShowQuotationCreator}
        contactId={id!}
        contactName={contact.company_name}
      />

      <AlertDialog open={!!deletingAddressId} onOpenChange={() => setDeletingAddressId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar morada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A morada será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAddress} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
