import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MessageCircle, Mail, Globe, Plus, Search, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCES = [
  { value: "phone", label: "Chamada", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "web", label: "Website", icon: Globe },
];

interface ExistingContact {
  id: string;
  company_name: string;
  phone: string | null;
  nif: string | null;
}

export function NewLeadDialog({ open, onOpenChange }: NewLeadDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: "",
    customer_name: "",
    nif: "",
    source: "phone",
    notes: "",
  });

  // Duplicate check state
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [existingContact, setExistingContact] = useState<ExistingContact | null>(null);
  const [duplicateField, setDuplicateField] = useState<'phone' | 'nif' | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setExistingContact(null);
      setDuplicateField(null);
    }
  }, [open]);

  // Debounced check for existing contact by phone or NIF
  useEffect(() => {
    const checkDuplicate = async () => {
      const phone = formData.phone_number.trim();
      const nif = formData.nif.trim();

      if (!phone && !nif) {
        setExistingContact(null);
        setDuplicateField(null);
        return;
      }

      setCheckingDuplicate(true);
      try {
        // Check by NIF first (more reliable)
        if (nif && nif.length >= 9) {
          const { data: nifMatch } = await supabase
            .from('contacts')
            .select('id, company_name, phone, nif')
            .eq('nif', nif)
            .maybeSingle();

          if (nifMatch) {
            setExistingContact(nifMatch);
            setDuplicateField('nif');
            setCheckingDuplicate(false);
            return;
          }
        }

        // Then check by phone
        if (phone && phone.length >= 9) {
          const { data: phoneMatch } = await supabase
            .from('contacts')
            .select('id, company_name, phone, nif')
            .or(`phone.eq.${phone},whatsapp_number.eq.${phone},contact_phone.eq.${phone}`)
            .maybeSingle();

          if (phoneMatch) {
            setExistingContact(phoneMatch);
            setDuplicateField('phone');
            setCheckingDuplicate(false);
            return;
          }
        }

        setExistingContact(null);
        setDuplicateField(null);
      } catch (error) {
        console.error('Erro ao verificar duplicados:', error);
      } finally {
        setCheckingDuplicate(false);
      }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [formData.phone_number, formData.nif]);

  const handleSubmit = async () => {
    if (!formData.phone_number.trim()) {
      toast({ title: "O número de telefone é obrigatório", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("calls").insert({
        phone_number: formData.phone_number,
        customer_name: formData.customer_name || null,
        source: formData.source,
        notes: formData.nif ? `NIF: ${formData.nif}\n${formData.notes || ''}`.trim() : formData.notes || null,
        status: "incoming",
        is_processed: false,
      });

      if (error) throw error;

      toast({ title: "Lead criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["pending-leads"] });
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      onOpenChange(false);
      setFormData({
        phone_number: "",
        customer_name: "",
        nif: "",
        source: "phone",
        notes: "",
      });
    } catch (error) {
      toast({ title: "Erro ao criar lead", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToContact = () => {
    if (existingContact) {
      navigate(`/contactos/${existingContact.id}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Adicione um novo lead ao sistema. O NIF e telefone serão verificados para evitar duplicados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone_number">Número de Telefone *</Label>
            <div className="relative">
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone_number: e.target.value }))
                }
                placeholder="+351 912 345 678"
                className={existingContact && duplicateField === 'phone' ? 'border-warning pr-10' : ''}
              />
              {checkingDuplicate && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* NIF Field - NEW */}
          <div className="space-y-2">
            <Label htmlFor="nif">NIF (opcional)</Label>
            <div className="relative">
              <Input
                id="nif"
                value={formData.nif}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nif: e.target.value }))
                }
                placeholder="123456789"
                className={existingContact && duplicateField === 'nif' ? 'border-warning pr-10' : ''}
              />
              {checkingDuplicate && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Existing Contact Warning */}
          {existingContact && (
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning">
                    Contacto já existente!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {duplicateField === 'nif' ? 'NIF' : 'Telefone'} encontrado em:{' '}
                    <span className="font-semibold">{existingContact.company_name}</span>
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGoToContact}
                className="w-full"
              >
                Ver Ficha do Contacto
              </Button>
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nome (opcional)</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customer_name: e.target.value }))
              }
              placeholder="Nome do contacto"
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Origem</Label>
            <Select
              value={formData.source}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, source: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    <div className="flex items-center gap-2">
                      <source.icon className="h-4 w-4" />
                      {source.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Informações adicionais sobre o lead..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
