import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};

export default function DataTablePagination({ page, pageSize, total, onPageChange, pageSizeOptions, onPageSizeChange }: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 3) }, (_, index) => {
    if (totalPages <= 3 || page <= 1) return index;
    if (page >= totalPages - 2) return totalPages - 3 + index;
    return page - 1 + index;
  });

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-muted-foreground">Mostrando {start}-{end} de {total}</p>
      <div className="flex flex-wrap items-center gap-2">
        {pageSizeOptions && onPageSizeChange ? <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}><SelectTrigger className="h-9 w-[132px]"><SelectValue /></SelectTrigger><SelectContent>{pageSizeOptions.map((option) => <SelectItem key={option} value={String(option)}>{option} por pagina</SelectItem>)}</SelectContent></Select> : null}
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageNumbers.map((pageNumber) => <Button key={pageNumber} variant={pageNumber === page ? "secondary" : "ghost"} size="icon-sm" onClick={() => onPageChange(pageNumber)} aria-label={`Ir a pagina ${pageNumber + 1}`}>{pageNumber + 1}</Button>)}
        </div>
        <span className="min-w-20 text-center text-xs font-medium text-muted-foreground">Página {page + 1} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
          Siguiente <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
