import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

export default function ClientDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando cliente">
      <div className="app-panel-strong p-5 sm:p-6"><div className="flex items-center gap-4"><LoadingSkeleton className="h-10 w-10" /><div className="space-y-2"><LoadingSkeleton className="h-8 w-64" /><LoadingSkeleton className="h-4 w-40" /></div></div></div>
      <div className="grid gap-6 lg:grid-cols-3"><LoadingSkeleton className="h-80" /><LoadingSkeleton className="h-80 lg:col-span-2" /></div>
    </div>
  );
}
