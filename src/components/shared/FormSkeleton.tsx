export default function FormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando formulario">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-panel-strong h-80 animate-pulse" />
        <div className="space-y-6">
          <div className="app-panel-strong h-56 animate-pulse" />
          <div className="app-panel-strong h-40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
