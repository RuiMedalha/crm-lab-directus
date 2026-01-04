import { supabase } from "@/integrations/supabase/client";
import { TagSelector } from "@/components/contacts/TagSelector";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCreateContact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Instagram, Facebook, Linkedin, Mail, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ContactoNovo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createContact = useCreateContact();
  
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    nif: "",
    moloni_client_id: "",
    phone: "",
    email: "",
    whatsapp_number: "",
    website: "",
    address: "",
    postal_code: "",
    city: "",
    country_id: "",
    contact_person: "",
    contact_phone: "",
    contact_email: "",
    instagram_url: "",
    facebook_url: "",
    linkedin_url: "",
    tags: [] as string[],
    notes: "",
    accept_newsletter: false,
    accept_whatsapp_marketing: false,
  });

  // Pre-fill from query params (from CallPopup or Inbox)
  useEffect(() => {
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');
    
    if (phone || name) {
      setFormData(prev => ({
        ...prev,
        phone: phone || prev.phone,
        whatsapp_number: phone || prev.whatsapp_number,
        company_name: name || prev.company_name,
      }));
    }
  }, [searchParams]);

const handleChange = (field: string, value: string | boolean) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validação: Pelo menos nome da empresa OU nome do contacto
  if (!formData.company_name?.trim() && !formData.contact_name?.trim()) {
    toast({
      title: "Preencha pelo menos o nome da empresa ou nome do contacto",
      variant: "destructive"
    });
    return;
  }

  // Validação: Pelo menos telefone OU email
  if (!formData.phone?.trim() && !formData.email?.trim()) {
    toast({
      title: "Preencha pelo menos o telefone ou email",
      variant: "destructive"
    });
    return;
  }

  // Continua com a criação do contacto...
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert([formData])
      .select()
      .single();

    if (error) throw error;

    toast({ title: "Contacto criado com sucesso!" });
    navigate(`/contactos/${data.id}`);
  } catch (error) {
    console.error('Error creating contact:', error);
    toast({
      title: "Erro ao criar contacto",
      variant: "destructive"
    });
  }
};

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/contactos")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Novo Contacto</h1>
            <p className="text-muted-foreground">Adicionar cliente ou empresa</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome do Contacto</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nif">Contribuinte (NIF)</Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={(e) => handleChange("nif", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moloni_client_id">Moloni ID</Label>
                <Input
                  id="moloni_client_id"
                  value={formData.moloni_client_id}
                  onChange={(e) => handleChange("moloni_client_id", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telemóvel</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label>Tags de Categorização</Label>
                <TagSelector
                  selectedTags={formData.tags}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                />
             </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp</Label>
                <Input
                  id="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                />
              </div>
              {/* NOTAS - NOVO! */}
<div className="space-y-2 sm:col-span-2">
  <Label htmlFor="notes">Notas</Label>
  <textarea
    id="notes"
    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    value={formData.notes || ''}
    onChange={(e) => handleChange("notes", e.target.value)}
    placeholder="Notas sobre o contacto..."
    rows={3}
  />
</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Morada</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Localidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="country_id">País</Label>
                <Input
                  id="country_id"
                  value={formData.country_id}
                  onChange={(e) => handleChange("country_id", e.target.value)}
                  placeholder="Portugal"
                />
              </div>
            </div>

            <Separator />

            {/* Secondary Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Contacto Secundário</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Nome</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => handleChange("contact_person", e.target.value)}
                    placeholder="Nome do contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telemóvel</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleChange("contact_phone", e.target.value)}
                    placeholder="+351..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    placeholder="email@empresa.pt"
                  />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Redes Sociais</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram_url" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram_url"
                    value={formData.instagram_url}
                    onChange={(e) => handleChange("instagram_url", e.target.value)}
                    placeholder="@utilizador"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook_url" className="flex items-center gap-2">
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook_url"
                    value={formData.facebook_url}
                    onChange={(e) => handleChange("facebook_url", e.target.value)}
                    placeholder="URL do perfil"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange("linkedin_url", e.target.value)}
                    placeholder="URL do perfil"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Marketing/RGPD */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Marketing / RGPD</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Aceita Newsletter</p>
                      <p className="text-xs text-muted-foreground">Receber novidades por email</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.accept_newsletter}
                    onCheckedChange={(checked) => handleChange("accept_newsletter", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Permite WhatsApp Marketing</p>
                      <p className="text-xs text-muted-foreground">Receber promoções por WhatsApp</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.accept_whatsapp_marketing}
                    onCheckedChange={(checked) => handleChange("accept_whatsapp_marketing", checked)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createContact.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Criar Contacto
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}
