import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DealDialog } from "@/components/deals/DealDialog";

export function QuickActions() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showDealDialog, setShowDealDialog] = useState(false);

  const actions = [
    {
      icon: UserPlus,
      label: "Novo Cliente",
      onClick: () => {
        navigate("/contactos/novo");
        setIsOpen(false);
      },
      color: "bg-success hover:bg-success/90",
    },
    {
      icon: Briefcase,
      label: "Novo Negócio",
      onClick: () => {
        setShowDealDialog(true);
        setIsOpen(false);
      },
      color: "bg-primary hover:bg-primary/90",
    },
  ];

  return (
    <>
      {/* FAB Menu */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col-reverse items-end gap-2">
        {/* Action buttons */}
        {isOpen && (
          <div className="flex flex-col-reverse gap-2 mb-2 animate-fade-in">
            {actions.map((action) => (
              <Button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "shadow-lg text-primary-foreground",
                  action.color
                )}
                size="sm"
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Main FAB button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-200",
            isOpen
              ? "bg-destructive hover:bg-destructive/90 rotate-45"
              : "bg-primary hover:bg-primary/90"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* New Deal Dialog */}
      <DealDialog
        dealId={null}
        open={showDealDialog}
        onOpenChange={setShowDealDialog}
      />
    </>
  );
}
