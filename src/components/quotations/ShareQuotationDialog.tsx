import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ShareQuotationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quotationNumber: string;
    customerEmail?: string;
    customerPhone?: string;
    quotationBlob?: Blob | null; // PDF Blob if available
}

export function ShareQuotationDialog({
    open,
    onOpenChange,
    quotationNumber,
    customerEmail,
    customerPhone,
    quotationBlob
}: ShareQuotationDialogProps) {
    const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
    const [recipient, setRecipient] = useState(customerEmail || '');
    const [sending, setSending] = useState(false);

    // Update recipient when channel changes
    const handleChannelChange = (val: 'email' | 'whatsapp') => {
        setChannel(val);
        if (val === 'email') setRecipient(customerEmail || '');
        if (val === 'whatsapp') setRecipient(customerPhone || '');
    };

    const handleSend = async () => {
        if (!recipient) {
            toast({ title: 'Preencha o destinatário', variant: 'destructive' });
            return;
        }

        if (!quotationBlob) {
            toast({ title: 'PDF não gerado', description: 'Aguarde a geração do PDF.', variant: 'destructive' });
            return;
        }

        setSending(true);
        try {
            const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

            if (!webhookUrl) {
                throw new Error('Webhook URL não configurado (VITE_N8N_WEBHOOK_URL)');
            }

            const formData = new FormData();
            formData.append('file', quotationBlob, `Orcamento_${quotationNumber}.pdf`);
            formData.append('channel', channel);
            formData.append('recipient', recipient);
            formData.append('quotation_number', quotationNumber);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                body: formData, // Browser sets Content-Type to multipart/form-data automatically
            });

            if (!response.ok) throw new Error('Falha no envio');

            toast({
                title: 'Enviado com sucesso!',
                description: `Orçamento enviado via ${channel === 'email' ? 'Email' : 'WhatsApp'}.`
            });

            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Erro ao enviar',
                description: 'Verifique a configuração do N8N ou tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Enviar Orçamento</DialogTitle>
                    <DialogDescription>
                        Escolha o canal para enviar o orçamento {quotationNumber}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <RadioGroup value={channel} onValueChange={(v) => handleChannelChange(v as any)} className="grid grid-cols-2 gap-4">
                        <div>
                            <RadioGroupItem value="email" id="email" className="peer sr-only" />
                            <Label
                                htmlFor="email"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <Mail className="mb-3 h-6 w-6" />
                                Email
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="whatsapp" id="whatsapp" className="peer sr-only" />
                            <Label
                                htmlFor="whatsapp"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <MessageSquare className="mb-3 h-6 w-6" />
                                WhatsApp
                            </Label>
                        </div>
                    </RadioGroup>

                    <div className="grid gap-2">
                        <Label htmlFor="recipient">
                            {channel === 'email' ? 'Endereço de Email' : 'Número de Telefone'}
                        </Label>
                        <Input
                            id="recipient"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder={channel === 'email' ? 'cliente@exemplo.com' : '+351 912 345 678'}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSend} disabled={sending}>
                        {sending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
