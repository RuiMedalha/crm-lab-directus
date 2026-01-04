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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  useCreateDeliveryAddress,
  useUpdateDeliveryAddress,
  type DeliveryAddressInsert,
} from "@/hooks/useDeliveryAddressMutations";
import type { DeliveryAddress } from "@/hooks/useDeliveryAddresses";

interface DeliveryAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  address?: DeliveryAddress | null;
}

export function DeliveryAddressDialog({
  open,
  onOpenChange,
  contactId,
  address,
}: DeliveryAddressDialogProps) {
  const createAddress = useCreateDeliveryAddress();
  const updateAddress = useUpdateDeliveryAddress();
  const isEditing = !!address;

  const [formData, setFormData] = useState<DeliveryAddressInsert>({
    contact_id: contactId,
    address_name: "",
    address: "",
    postal_code: "",
    city: "",
    contact_person: "",
    phone: "",
    delivery_notes: "",
    is_main_address: false,
  });

  useEffect(() => {
    if (address) {
      setFormData({
        contact_id: contactId,
        address_name: address.address_name || "",
        address: address.address || "",
        postal_code: address.postal_code || "",
        city: address.city || "",
        contact_person: address.contact_person || "",
        phone: (address as any).phone || "",
        delivery_notes: (address as any).delivery_notes || "",
        is_main_address: address.is_main_address || false,
      });
    } else {
      setFormData({
        contact_id: contactId,
        address_name: "",
        address: "",
        postal_code: "",
        city: "",
        contact_person: "",
        phone: "",
        delivery_notes: "",
        is_main_address: false,
      });
    }
  }, [address, contactId]);

  const handleSave = async () => {
    if (!formData.address.trim()) {
      toast({ title: "A morada é obrigatória", variant: "destructive" });
      return;
    }

    try {
      if (isEditing && address) {
        await updateAddress.mutateAsync({ id: address.id, ...formData });
        toast({ title: "Morada atualizada com sucesso" });
      } else {
        await createAddress.mutateAsync(formData);
        toast({ title: "Morada criada com sucesso" });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao guardar morada", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Morada de Entrega" : "Nova Morada de Entrega"}
          </DialogTitle>
          <DialogDescription>Preencha os dados da morada de entrega</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address_name">Nome/Espaço</Label>
              <Input
                id="address_name"
                value={formData.address_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address_name: e.target.value }))
                }
                placeholder="Ex: Armazém Principal, Loja Centro"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Morada Completa *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Rua, número, andar..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, postal_code: e.target.value }))
                }
                placeholder="0000-000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Localidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, city: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Pessoa de Contacto</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contact_person: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery_notes">Informações para Transportadora</Label>
            <Textarea
              id="delivery_notes"
              value={formData.delivery_notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, delivery_notes: e.target.value }))
              }
              placeholder="Instruções especiais, horários, etc."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Morada Principal</p>
              <p className="text-xs text-muted-foreground">
                Usar como morada de entrega padrão
              </p>
            </div>
            <Switch
              checked={formData.is_main_address}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_main_address: checked }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={createAddress.isPending || updateAddress.isPending}
          >
            {isEditing ? "Guardar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
