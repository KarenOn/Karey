"use client";

import React from "react";
import { motion } from "framer-motion";

type Trend = "up" | "down";
type Color = "teal" | "pink" | "purple" | "orange" | "blue" | "green";

type Props = {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color?: Color;
  trend?: Trend;
  trendValue?: string;
  delay?: number;
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = "teal",
  trend,
  trendValue,
  delay = 0,
}: Props) {
  const colorClasses: Record<Color, string> = {
    teal: "from-[#0d9488] to-[#4bc5ba]",
    pink: "from-[#d8a257] to-[#f0c28c]",
    purple: "from-[#2d3a66] to-[#6f7fb4]",
    orange: "from-[#cf8552] to-[#d8a257]",
    blue: "from-[#2d3a66] to-[#4d67b0]",
    green: "from-[#0d9488] to-[#8bd4a3]",
  };

  const gradient = colorClasses[color] ?? colorClasses.teal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="app-stat-card group relative p-6"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.28),transparent_62%)]" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">{value}</p>

          {trend && (
            <p
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${
                trend === "up"
                  ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
                  : "bg-rose-500/12 text-rose-600 dark:text-rose-300"
              }`}
            >
              {trend === "up" ? "↑" : "↓"} {trendValue ?? ""}
            </p>
          )}
        </div>

        <div
          className={`flex size-14 items-center justify-center rounded-[1.35rem] bg-linear-to-br ${gradient}`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Lectura rapida</span>
        <span className="font-semibold text-foreground">Actualizado hoy</span>
      </div>
    </motion.div>
  );
}
