import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  active?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  status?: "success" | "info" | "warning" | "destructive" | "neutral";
  label?: string;
};

export default function StatusBadge({ active, activeLabel = "Activo", inactiveLabel = "Inactivo", status, label }: StatusBadgeProps) {
  if (status) {
    const statusClasses = {
      success: "border-success/20 bg-success/10 text-success dark:text-emerald-300",
      info: "border-info/20 bg-info/10 text-info dark:text-blue-300",
      warning: "border-warning/20 bg-warning/10 text-warning dark:text-amber-300",
      destructive: "border-destructive/20 bg-destructive/10 text-destructive dark:text-rose-300",
      neutral: "border-border bg-muted text-muted-foreground",
    };
    return <Badge variant="outline" className={statusClasses[status]}>{label}</Badge>;
  }

  return <Badge variant="outline" className={active ? "border-success/20 bg-success/10 text-success dark:text-emerald-300" : "border-border bg-muted text-muted-foreground"}>{active ? activeLabel : inactiveLabel}</Badge>;
}
