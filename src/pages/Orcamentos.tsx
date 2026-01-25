import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QUOTATION_STATUSES, useQuotations } from "@/hooks/useQuotations";
import { FileText, Search, Plus, Calendar, Euro, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientSearchDialog } from "@/components/contacts/ClientSearchDialog";
import { QuotationCreator } from "@/components/quotations/QuotationCreator";

export default function Orcamentos() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showClientSearch, setShowClientSearch] = useState(false);
    const [showQuotationCreator, setShowQuotationCreator] = useState(false);
    const [selectedClient, setSelectedClient] = useState<{ id: string | number; name: string } | null>(null);
    // We can add filters like status here later
    const { data: quotations, isLoading, refetch, isRefetching } = useQuotations({
        search: searchTerm,
    });

    const handleNewQuotation = () => {
        setSelectedClient(null);
        setShowClientSearch(true);
    };

    const handleClientSelected = (client: { id: string | number; name: string }) => {
        setSelectedClient(client);
        setShowClientSearch(false);
        setShowQuotationCreator(true);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = QUOTATION_STATUSES.find((s) => s.value === status);
        // Find variant for shadcn Badge
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            draft: "secondary",
            sent: "default",
            viewed: "default",
            accepted: "default", // or success if available in custom
            rejected: "destructive",
            expired: "outline",
            converted: "default"
        };

        return (
            <Badge variant={variants[status] || "secondary"} className={statusConfig?.color ? "" : ""}>
                {statusConfig?.label || status}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <FileText className="h-6 w-6" />
                            Orçamentos
                        </h1>
                        <p className="text-muted-foreground">
                            Gere e acompanhe todas as propostas comerciais
                        </p>
                    </div>
                    <Button onClick={handleNewQuotation}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Orçamento
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Pesquisar orçamentos..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching}>
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="border rounded-lg bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableSkeleton rows={5} columns={6} />
                            ) : quotations && quotations.length > 0 ? (
                                quotations.map((quotation) => (
                                    <TableRow key={quotation.id}>
                                        <TableCell className="font-mono font-medium">
                                            {quotation.quotation_number}
                                        </TableCell>
                                        <TableCell>
                                            {quotation.contact ? (
                                                <Link to={`/contactos/${quotation.contact.id}`} className="hover:underline text-primary">
                                                    {quotation.contact.company_name || "Sem nome"}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(quotation.created_at || quotation.date_created).toLocaleDateString("pt-PT")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {quotation.total_amount?.toLocaleString("pt-PT", {
                                                style: "currency",
                                                currency: "EUR",
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            {/* Actions placeholder - can add view/edit/delete */}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-96 text-center">
                                        <EmptyState
                                            icon={FileText}
                                            title="Sem orçamentos"
                                            description="Não foram encontrados orçamentos com os critérios atuais."
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="text-xs text-muted-foreground">
                    * Para criar um novo orçamento, aceda à ficha de um cliente ou a um negócio no pipeline.
                </div>
            </div>

            <ClientSearchDialog
                open={showClientSearch}
                onOpenChange={setShowClientSearch}
                onSelectClient={handleClientSelected}
            />

            {selectedClient && (
                <QuotationCreator
                    open={showQuotationCreator}
                    onOpenChange={setShowQuotationCreator}
                    contactId={String(selectedClient.id)}
                    contactName={selectedClient.name}
                    onComplete={() => {
                        refetch();
                        setSelectedClient(null);
                    }}
                />
            )}
        </AppLayout>
    );
}
