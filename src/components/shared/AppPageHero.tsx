"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";

type HeroStat = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

type AppPageHeroProps = {
  badgeIcon?: React.ReactNode;
  badgeLabel?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: HeroStat[];
  className?: string;
  back?: boolean;
};

export default function AppPageHero({
  badgeIcon,
  badgeLabel,
  title,
  description,
  actions,
  stats = [],
  className,
  back = false
}: AppPageHeroProps) {
  console.log(stats.length)
  return (
    <section className={cn("app-page-hero", className)}>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="items-center">
            {back && (
              <Link href="/invoices">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            )}

            <Badge className="app-kicker mb-3 border-0">
              {badgeIcon}
              {badgeLabel}
            </Badge>
          </div>
          
          <h2 className="app-heading text-3xl sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <div className={`relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-${stats.length}`}>
          {stats.map((stat) => (
            <div key={stat.label} className="app-panel-muted p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
                {stat.value}
              </p>
              {stat.hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
