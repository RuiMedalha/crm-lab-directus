import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Euro, Building2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DealCardProps {
  deal: {
    id: string;
    title: string | null;
    total_amount: number | null;
    customer?: { company_name: string } | null;
    quotations?: { id: string; pdf_link: string | null; status: string }[] | null;
  };
  onClick: () => void;
  isDragging: boolean;
}

export function DealCard({ deal, onClick, isDragging }: DealCardProps) {
  const pdfQuotation = deal.quotations?.find(q => q.pdf_link);
  
  const handlePdfClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pdfQuotation?.pdf_link) {
      window.open(pdfQuotation.pdf_link, '_blank');
    }
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all bg-card select-none",
        isDragging 
          ? "shadow-lg ring-2 ring-primary/50 rotate-2 scale-105" 
          : "hover:shadow-md hover:scale-[1.02]"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab active:cursor-grabbing" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="font-medium text-sm truncate flex-1">
                {deal.title || "Sem título"}
              </p>
              {pdfQuotation && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-primary hover:text-primary/80"
                  onClick={handlePdfClick}
                  title="Abrir PDF do orçamento"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">
                {deal.customer?.company_name || "Sem cliente"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium mt-2">
              <Euro className="h-3 w-3 text-primary" />
              {(deal.total_amount || 0).toLocaleString("pt-PT", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}