"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type DataTableRow = Record<string, unknown> & {
  id?: string | number;
};

type DataTableColumn = {
  header: string;
  accessorKey?: string;
  cell?: (row: DataTableRow) => React.ReactNode;
};

type DataTableProps = {
  columns: DataTableColumn[];
  data: DataTableRow[];
  searchPlaceholder?: string;
  searchKey?: string;
  onRowClick?: (row: DataTableRow) => void;
  emptyMessage?: string;
};

export default function DataTable({ 
  columns, 
  data, 
  searchPlaceholder = "Buscar...",
  searchKey,
  onRowClick,
  emptyMessage = "No hay datos disponibles"
}: DataTableProps) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const pageSize = 10;

  const filteredData = searchKey
    ? data.filter((item) => 
        String(item[searchKey] || '').toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <div className="space-y-5">
      <div className="app-panel-strong overflow-hidden p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Vista estructurada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredData.length} registros encontrados {filteredData.length !== data.length ? `de ${data.length}` : ""}
            </p>
          </div>

          {searchKey && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-11"
              />
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-background/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/65 hover:bg-secondary/65">
                {columns.map((col, i) => (
                  <TableHead key={i} className="font-semibold text-muted-foreground">
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-16 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <motion.tr
                    key={row.id || rowIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rowIndex * 0.03 }}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-border/60 ${onRowClick ? 'cursor-pointer hover:bg-secondary/55' : ''} transition-colors`}
                  >
                    {columns.map((col, colIndex) => (
                      <TableCell key={colIndex} className="py-4">
                        {col.cell ? col.cell(row) : row[col.accessorKey!]}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredData.length)} de {filteredData.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
