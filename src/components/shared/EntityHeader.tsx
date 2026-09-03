import Link from "next/link";
import { ArrowLeft, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EntityHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  avatar?: React.ReactNode;
  className?: string;
};

export default function EntityHeader({ title, subtitle, meta, badges, actions, backHref, avatar, className }: EntityHeaderProps) {
  return (
    <section className={cn("app-panel-strong p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {backHref ? <Button asChild size="icon" type="button" variant="outline"><Link href={backHref} aria-label="Volver"><ArrowLeft className="h-4 w-4" /></Link></Button> : null}
          <div className="app-stat-icon h-14 w-14 shrink-0">{avatar ?? <PawPrint className="h-6 w-6" />}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="app-heading text-3xl text-foreground">{title}</h1>
              {badges}
            </div>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            {meta ? <div className="mt-3 text-sm text-muted-foreground">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
