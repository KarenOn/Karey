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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-800">Stock Bajo</h3>
        </div>

        <Link
          href={"/inventory"}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          Ver inventario <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-slate-50">
        {lowStockProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Todo el inventario está bien</p>
          </div>
        ) : (
          lowStockProducts.slice(0, 4).map((product, index) => {
            const isCritical = product.stockOnHand === 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`p-4 ${
                  isCritical ? "bg-red-50/50" : "hover:bg-slate-50"
                } transition-colors`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCritical ? "bg-red-100" : "bg-orange-100"
                    }`}
                  >
                    <Package
                      className={`w-5 h-5 ${
                        isCritical ? "text-red-600" : "text-orange-600"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {product.category ?? "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`flex items-center gap-1 ${
                        isCritical ? "text-red-600" : "text-orange-600"
                      }`}
                    >
                      {isCritical && <AlertTriangle className="w-4 h-4" />}
                      <span className="text-lg font-bold">
                        {product.stockOnHand}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Min: {product.minStock ?? 5}
                    </p>
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
