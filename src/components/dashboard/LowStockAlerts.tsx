"use client";

import React from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { DashboardLowStockProductDTO } from "@/types/common";

type Props = {
  products: DashboardLowStockProductDTO[];
};

export default function LowStockAlerts({ products }: Props) {
  const lowStockProducts = products
    .filter((p) => p.stockOnHand <= (p.minStock ?? 5))
    .sort((a, b) => a.stockOnHand - b.stockOnHand);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="app-panel-strong overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 p-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-(--brand-gold)" />
          <h3 className="font-display text-2xl font-semibold text-foreground">Stock Bajo</h3>
        </div>

        <Link href="/inventory" className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1">
          Ver inventario <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-border/60">
        {lowStockProducts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p>Todo el inventario está bien</p>
          </div>
        ) : (
          lowStockProducts.slice(0, 4).map((product, index) => {
            const isCritical = product.stockOnHand === 0;

            return (
              <motion.div key={product.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index }} className={`p-4 ${isCritical ? "bg-red-500/8" : "hover:bg-secondary/55"} transition-colors`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-3xl ${isCritical ? "bg-red-500/15" : "bg-[rgba(216,162,87,0.16)]"}`}>
                    <Package className={`w-5 h-5 ${isCritical ? "text-red-500" : "text-(--brand-gold)"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category ?? "—"}</p>
                  </div>

                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${isCritical ? "text-red-500" : "text-(--brand-gold)"}`}>
                      {isCritical && <AlertTriangle className="w-4 h-4" />}
                      <span className="text-lg font-bold">{product.stockOnHand}</span>
                    </div>

                    <p className="text-xs text-muted-foreground">Min: {product.minStock ?? 5}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
