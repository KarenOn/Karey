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
    teal: "from-teal-500 to-teal-600",
    pink: "from-pink-500 to-pink-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
  };

  const gradient = colorClasses[color] ?? colorClasses.teal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>

            {trend && (
              <p
                className={`text-sm font-medium ${
                  trend === "up" ? "text-green-500" : "text-red-500"
                }`}
              >
                {trend === "up" ? "↑" : "↓"} {trendValue ?? ""}
              </p>
            )}
          </div>

          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg transform group-hover:scale-110 transition-transform`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className={`h-1 bg-gradient-to-r ${gradient}`} />
    </motion.div>
  );
}
