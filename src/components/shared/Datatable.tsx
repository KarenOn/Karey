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
import SearchInput from "@/components/shared/SearchInput";
import DataTablePagination from "@/components/shared/DataTablePagination";

export type DataTableRow = Record<string, unknown> & {
  id?: string | number;
};

export type DataTableColumn<T extends DataTableRow = DataTableRow> = {
  header: string;
  accessorKey?: keyof T & string;
  cell?: (row: T) => React.ReactNode;
};

type DataTableProps<T extends DataTableRow> = {
  columns: DataTableColumn<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: keyof T & string;
  searchKeys?: Array<keyof T & string>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPredicate?: (item: T, query: string) => boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function DataTable<T extends DataTableRow>({
  columns,
  data,
  searchPlaceholder = "Buscar...",
  searchKey,
  searchKeys,
  searchValue,
  onSearchChange,
  searchPredicate,
  onRowClick,
  emptyMessage = "No hay datos disponibles",
  title = "Registros",
  description,
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const activeSearch = searchValue ?? search;
  const searchableKeys = searchKeys ?? (searchKey ? [searchKey] : []);

  const filteredData = searchPredicate
    ? data.filter((item) => searchPredicate(item, activeSearch.trim().toLowerCase()))
    : searchableKeys.length > 0
      ? data.filter((item) => searchableKeys.some((key) => String(item[key] || "").toLowerCase().includes(activeSearch.toLowerCase())))
      : data;

  React.useEffect(() => {
    setPage(0);
  }, [data, pageSize, activeSearch]);

  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
  const resultsDescription =
    description ??
    `${filteredData.length} ${
      filteredData.length === 1 ? "registro encontrado" : "registros encontrados"
    }`;

  const actionsArray = React.Children.toArray(actions);
  const firstAction = actionsArray[0] || null;
  const remainingActions = actionsArray.slice(1);
  const hasMultipleActions = remainingActions.length > 0;

  return (
    // <div className="app-panel-strong min-w-0 overflow-hidden">
    //   <div className="border-b border-border/70 px-4 py-4 sm:px-5">
    //       <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    //       <div className="min-w-0">
    //         <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    //         <p className="mt-1 text-sm text-muted-foreground">
    //           {resultsDescription}
    //           {filteredData.length !== data.length ? ` de ${data.length}` : ""}
    //         </p>
    //       </div>

    //       <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-xl">
    //         {searchableKeys.length > 0 || searchPredicate ? (
    //           <SearchInput
    //             className="sm:max-w-sm"
    //             placeholder={searchPlaceholder}
    //             value={activeSearch}
    //             onChange={(event) => {
    //               if (onSearchChange) onSearchChange(event.target.value);
    //               else setSearch(event.target.value);
    //               setPage(0);
    //             }}
    //             onClear={() => {
    //               if (onSearchChange) onSearchChange("");
    //               else setSearch("");
    //               setPage(0);
    //             }}
    //           />
    //         ) : null}
    //         <div className="flex min-w-0 max-w-full flex-wrap gap-3">{actions}</div>
    //       </div>
    //     </div>
    //   </div>

   
  <div className="app-panel-strong min-w-0 overflow-hidden">
    <div className="border-b border-border/70 px-4 py-4 sm:px-5">
      {/* 1. Contenedor principal en columna para asegurar las dos filas */}
      <div className="flex flex-col gap-4 w-full">
        
        {/* FILA SUPERIOR: Título + Buscador */}
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Título y registros */}
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {resultsDescription}
              {filteredData.length !== data.length ? ` de ${data.length}` : ""}
            </p>
          </div>

          {/* Buscador */}
          {searchableKeys.length > 0 || searchPredicate ? (
            <div className="w-full sm:max-w-xl lg:max-w-2xl flex-1 shrink-0">
              <SearchInput
                className="w-full"
                placeholder={searchPlaceholder}
                value={activeSearch}
                onChange={(event) => {
                  if (onSearchChange) onSearchChange(event.target.value);
                  else setSearch(event.target.value);
                  setPage(0);
                }}
                onClear={() => {
                  if (onSearchChange) onSearchChange("");
                  else setSearch("");
                  setPage(0);
                }}
              />
            </div>
          ) : null}
        </div>

        {/* FILA INFERIOR (La línea amarilla de extremo a extremo) */}
        {/* 🛠️ SOLUCIÓN: Buscamos todos los elementos selectores internos de actions y los obligamos a alinearse en una fila flex completa abajo */}
        {actions && (
          <div className="w-full border-t border-border/50 pt-3 mt-1 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-3 w-full justify-start 
              [&_select]:w-full sm:[&_select]:w-44
              [&_button]:w-full sm:[&_button]:w-auto
              [&>div]:w-full sm:[&>div]:w-44 
              [&>div>button]:w-full
              [&_input]:w-full sm:[&_input]:w-44"
            >
              {actions}
            </div>
          </div>
        )}

      </div>
    </div>

    {/* Resto de la tabla (Table, TableBody, etc) continúa igual... */}


      <div className="px-4 py-4 sm:px-5">
          <div className="max-w-full overflow-x-auto rounded-xl border border-border/70 bg-background">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-muted/55 hover:bg-muted/55">
                {columns.map((col, index) => (
                  <TableHead key={index} className={col.header.toLowerCase() === "acciones" ? "w-px min-w-[9rem] whitespace-normal" : undefined}>{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10">
                    <div className="app-empty text-center text-sm">{emptyMessage}</div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <TableRow
                    key={row.id || rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? "cursor-pointer" : undefined}
                  >
                    {columns.map((col, colIndex) => (
                      <TableCell key={colIndex} className={`py-4 ${col.header.toLowerCase() === "acciones" ? "w-px min-w-[9rem] whitespace-normal" : ""}`}>
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                            ? (row[col.accessorKey] as React.ReactNode)
                            : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredData.length > 0 ? <DataTablePagination page={page} pageSize={pageSize} total={filteredData.length} onPageChange={setPage} pageSizeOptions={[10, 20, 50]} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(0); }} /> : null}
    </div>
  );
}
