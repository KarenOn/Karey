import Link from "next/link";
import { CalendarClock, CalendarX, ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { DashboardExpiringProductDTO } from "@/types/common";

export default function ExpiringInventoryAlerts({
  products,
}: {
  products: DashboardExpiringProductDTO[];
}) {
  console.log('products', products);
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-6">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-amber-600" />
          {/* <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">
                Próximos a vencer
              </h2>
              <Badge variant="secondary">{products.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Productos dentro del umbral configurado
            </p>
          </div> */}
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl font-semibold text-foreground">
              Próximos a vencer
            </h3>
            <Badge variant="secondary">{products.length}</Badge>
          </div>
        </div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Ver inventario <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {products.length ? (
        <div className="divide-y divide-border/70">
          {products.slice(0, 4).map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <span className="truncate text-sm font-medium text-foreground">
                {product.name}
              </span>
              <Badge
                variant="outline"
                className="shrink-0 border-amber-200 bg-amber-50 text-amber-700"
              >
                {product.daysUntilExpiration === 0
                  ? "Hoy"
                  : `En ${product.daysUntilExpiration} días`}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <CalendarClock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p>No hay productos próximos a vencer.</p>
        </div>
      )}
    </section>
  );
}

export function ExpiredInventoryAlerts({
  products,
}: {
  products: Array<{ id: number; name: string; expirationDate: string; daysSinceExpiration: number; category?: string | null }>;
}) {
  console.log('products', products);
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-6">
        <div className="flex items-center gap-3">
          <CalendarX className="h-5 w-5 text-rose-600" />
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl font-semibold text-foreground">Productos vencidos</h3>
            <Badge variant="secondary">{products.length}</Badge>
          </div>
        </div>
        <Link href="/inventory" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Ver inventario <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {products.length ? (
        <div className="divide-y divide-border/70">
          {products.slice(0, 4).map((product, index) => {
            const isCritical = product.daysSinceExpiration > 30;
            return (
            // <div key={product.id} className="flex items-center justify-between gap-3 px-5 py-3">
            //   <span className="truncate text-sm font-medium text-foreground">{product.name}</span>
            //   <Badge variant="outline" className="shrink-0 border-rose-200 bg-rose-50 text-rose-700">
            //     Hace {product.daysSinceExpiration} días
            //   </Badge>
            // </div>

            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`p-4 ${isCritical ? "bg-red-500/8" : "hover:bg-secondary/55"} transition-colors`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-3xl ${isCritical ? "bg-red-500/15" : "bg-[rgba(216,162,87,0.16)]"}`}
                >
                  <Package
                    className={`w-5 h-5 ${isCritical ? "text-red-500" : "text-(--brand-gold)"}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {product.category ?? "—"}
                  </p>
                </div>

                <div className="text-right">
                  <Badge variant="outline" className="shrink-0 border-rose-200 bg-rose-50 text-rose-700">
                    Hace {product.daysSinceExpiration} días
                  </Badge>
                </div>
              </div>
            </motion.div>
          )})}
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <CalendarClock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p>No hay productos vencidos.</p>
        </div>
      )}
    </section>
  );
}
