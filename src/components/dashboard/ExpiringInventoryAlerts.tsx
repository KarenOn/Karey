import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DashboardExpiringProductDTO } from "@/types/common";

export default function ExpiringInventoryAlerts({ products }: { products: DashboardExpiringProductDTO[] }) {
  return <section className="rounded-xl border border-border bg-card">
    <div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-amber-600" /><div><div className="flex items-center gap-2"><h2 className="font-semibold text-foreground">Próximos a vencer</h2><Badge variant="secondary">{products.length}</Badge></div><p className="text-xs text-muted-foreground">Productos dentro del umbral configurado</p></div></div><Link href="/inventory" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Ver inventario <ChevronRight className="h-4 w-4" /></Link></div>
    {products.length ? <div className="divide-y divide-border/70">{products.slice(0, 4).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="truncate text-sm font-medium text-foreground">{product.name}</span><Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-amber-700">{product.daysUntilExpiration === 0 ? "Hoy" : `En ${product.daysUntilExpiration} días`}</Badge></div>)}</div> : <p className="px-5 py-6 text-sm text-muted-foreground">No hay productos próximos a vencer.</p>}
  </section>;
}
