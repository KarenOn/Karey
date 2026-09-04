import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CenteredLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-60 items-center justify-center", className)} aria-busy="true">
      <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-label="Cargando" role="status" />
    </div>
  );
}
