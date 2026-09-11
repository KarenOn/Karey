export default function DataTableSkeleton() {
  return (
    <div className="app-panel-strong overflow-hidden" aria-busy="true" aria-label="Cargando tabla">
      <div className="space-y-3 border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted sm:w-80 sm:ml-auto" />
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />)}
      </div>
      <div className="h-12 animate-pulse border-t border-border/70 bg-muted/40" />
    </div>
  );
}
