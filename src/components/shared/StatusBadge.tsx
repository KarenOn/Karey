import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export default function StatusBadge({ active, activeLabel = "Activo", inactiveLabel = "Inactivo" }: StatusBadgeProps) {
  return <Badge variant="outline" className={active ? "border-success/20 bg-success/10 text-success dark:text-emerald-300" : "border-border bg-muted text-muted-foreground"}>{active ? activeLabel : inactiveLabel}</Badge>;
}
