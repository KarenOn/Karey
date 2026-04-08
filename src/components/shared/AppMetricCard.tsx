"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AppMetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  badge?: string;
  className?: string;
  iconClassName?: string;
};

export default function AppMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  badge,
  className,
  iconClassName,
}: AppMetricCardProps) {
  return (
    <div className={cn("app-stat-card", className)}>
      <div className="relative flex items-start justify-between gap-3">
        <div className={cn("app-stat-icon", iconClassName)}>
          <Icon className="size-5" />
        </div>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>

      <p className="relative mt-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="relative mt-2 text-3xl font-extrabold tracking-[-0.03em] text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="relative mt-2 text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
