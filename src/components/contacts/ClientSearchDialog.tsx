import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Loader2 } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectClient: (client: { id: string | number; name: string }) => void;
}

export function ClientSearchDialog({ open, onOpenChange, onSelectClient }: ClientSearchDialogProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const { data: contacts, isLoading } = useContacts(searchTerm);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Selecionar Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar por nome, NIF..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <ScrollArea className="h-[300px]">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : contacts && contacts.length > 0 ? (
                            <div className="space-y-1">
                                {contacts.map((contact) => (
                                    <Button
                                        key={contact.id}
                                        variant="ghost"
                                        className="w-full justify-start h-auto py-3 px-2"
                                        onClick={() => onSelectClient({ id: contact.id, name: contact.company_name })}
                                    >
                                        <div className="flex items-center gap-3 w-full text-left">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{contact.company_name}</div>
                                                {contact.nif && (
                                                    <div className="text-xs text-muted-foreground">NIF: {contact.nif}</div>
                                                )}
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        ) : searchTerm ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum cliente encontrado.
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Comece a digitar para pesquisar.
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
