import { Loader2 } from "lucide-react";

interface LoadingStateProps {
    message?: string;
    size?: "sm" | "md" | "lg";
}

export const LoadingState = ({
    message = "A carregar...",
    size = "md"
}: LoadingStateProps) => {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-4`} />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
};
