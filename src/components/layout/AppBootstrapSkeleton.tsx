import { LoadingSkeleton as Skeleton } from "@/components/shared/LoadingSkeleton";

export default function AppBootstrapSkeleton() {
  return (
    <div className="app-shell-bg min-h-screen" role="status" aria-live="polite" aria-label="Preparando tu espacio de trabajo">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar p-4 lg:block">
          <Skeleton className="mb-8 h-12 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="space-y-2"><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-64" /></div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-3"><Skeleton className="h-10 w-56" /><Skeleton className="h-4 w-80" /></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </main>
      </div>
      <p className="fixed bottom-6 left-1/2 -translate-x-1/2 text-sm text-muted-foreground">Preparando tu espacio de trabajo...</p>
    </div>
  );
}