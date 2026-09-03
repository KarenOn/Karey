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
  backHref?: string;
  breadcrumb?: React.ReactNode;
};

export default function AppPageHero({
  badgeIcon,
  badgeLabel,
  title,
  description,
  actions,
  stats = [],
  className,
  back = false,
  backHref = "/invoices",
  breadcrumb
}: AppPageHeroProps) {
  const statGridClassName =
    stats.length >= 4
      ? "xl:grid-cols-4"
      : stats.length === 3
        ? "xl:grid-cols-3"
        : stats.length === 2
          ? "xl:grid-cols-2"
          : "xl:grid-cols-1";

  return (
    <section className={cn("space-y-4", className)}>
      <div className="app-page-hero">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              {back ? (
                <Link href={backHref}>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
              {breadcrumb ? <p className="text-xs font-medium text-muted-foreground">{breadcrumb}</p> : null}
              {badgeLabel ? (
                <Badge className="app-kicker border-0">
                  {badgeIcon}
                  {badgeLabel}
                </Badge>
              ) : null}
            </div>

            <h2 className="app-heading mt-3 text-[2.15rem] text-foreground sm:text-[2.45rem]">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
      </div>

      {stats.length > 0 ? (
        <div
          className={cn(
            "grid grid-cols-1 gap-3 sm:grid-cols-2",
            statGridClassName
          )}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="app-stat-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground sm:text-[2rem]">
                {stat.value}
              </p>
              {stat.hint ? (
                <p className="mt-2 text-sm text-muted-foreground">{stat.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
