"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

type Item = {
  value: string;
  label: React.ReactNode;
  count?: number;
  disabled?: boolean;
};

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  items: Item[];
  className?: string;
};

export function ServiceCategoryTabs({ value, onValueChange, items, className }: Props) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="flex items-center gap-2 pb-1">
        {items.map((it) => {
          const active = value === it.value;

          return (
            <Button
              key={it.value}
              type="button"
              onClick={() => onValueChange(it.value)}
              disabled={it.disabled}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                active
                  ? "bg-teal-600 text-background shadow-lg shadow-black/15"
                  : "bg-background border border-border text-muted-foreground hover:bg-muted/40",
                it.disabled && "opacity-50 cursor-not-allowed",
              )}
              aria-pressed={active}
            >
              <span className="flex items-center gap-2">
                {it.label}
              </span>

              {typeof it.count === "number" ? (
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/15 text-white" : "bg-muted text-foreground"
                  )}
                >
                  {it.count}
                </span>
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
