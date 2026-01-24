import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export const TableSkeleton = ({ rows = 5, columns = 6 }: TableSkeletonProps) => {
    return (
        <>
            {[...Array(rows)].map((_, i) => (
                <TableRow key={i}>
                    {[...Array(columns)].map((_, j) => (
                        <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
};
