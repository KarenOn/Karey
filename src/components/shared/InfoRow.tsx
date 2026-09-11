import { cn } from "@/lib/utils";

type InfoRowProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
};

export default function InfoRow({ label, value, className }: InfoRowProps) {
  return <div className={cn("grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4 border-b border-border/60 py-3 text-sm last:border-b-0", className)}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium text-foreground">{value || "—"}</dd></div>;
}
