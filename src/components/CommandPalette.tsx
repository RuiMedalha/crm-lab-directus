import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
    Users,
    TrendingUp,
    FileText,
    Settings,
    MessageSquare,
    Building2,
    Plus,
    Search,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const CommandPalette = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="overflow-hidden p-0 shadow-lg max-w-2xl">
                <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Command.Input
                            placeholder="Procurar ou executar comando..."
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden">
                        <Command.Empty className="py-6 text-center text-sm">
                            Nenhum resultado encontrado.
                        </Command.Empty>

                        <Command.Group heading="Ações Rápidas">
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/contactos/novo"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Novo Contacto</span>
                                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    <span className="text-xs">N</span>
                                </kbd>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/pipeline"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Novo Deal</span>
                                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    <span className="text-xs">D</span>
                                </kbd>
                            </Command.Item>
                            <Command.Item
                                onSelect={() =>
                                    runCommand(() => {
                                        // TODO: Implement when tasks are available
                                        console.log("Create task");
                                    })
                                }
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Nova Tarefa</span>
                                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    <span className="text-xs">T</span>
                                </kbd>
                            </Command.Item>
                        </Command.Group>

                        <Command.Separator />

                        <Command.Group heading="Navegação">
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <TrendingUp className="h-4 w-4" />
                                <span>Dashboard</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/contactos"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Users className="h-4 w-4" />
                                <span>Contactos</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/pipeline"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <TrendingUp className="h-4 w-4" />
                                <span>Pipeline</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/inbox"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span>Inbox</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/fornecedores"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Building2 className="h-4 w-4" />
                                <span>Fornecedores</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate("/definicoes"))}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Settings className="h-4 w-4" />
                                <span>Definições</span>
                            </Command.Item>
                        </Command.Group>
                    </Command.List>
                    <div className="border-t p-2 text-xs text-muted-foreground">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            ⌘K
                        </kbd>{" "}
                        para abrir comando
                    </div>
                </Command>
            </DialogContent>
        </Dialog>
    );
};
