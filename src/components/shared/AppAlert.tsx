"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";

export type AppAlertVariant = "success" | "info" | "warning" | "destructive";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  variant?: AppAlertVariant;
  title: string;
  description?: React.ReactNode;

  /** tiempo en ms para cerrarse solo */
  autoCloseMs?: number;

  /** si quieres permitir cerrarlo manualmente */
  dismissible?: boolean;

  /** estilos extra */
  className?: string;

  /** para no mostrar icono */
  hideIcon?: boolean;
};

const iconByVariant: Record<AppAlertVariant, React.ElementType> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  destructive: XCircle,
};

export function AppAlert({
  open,
  onOpenChange,
  variant = "info",
  title,
  description,
  autoCloseMs = 3500,
  dismissible = true,
  className,
  hideIcon = false,
}: Props) {
  const Icon = iconByVariant[variant];

  // tonos para variants que shadcn no trae por defecto
  const tone =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950 [&_*]:text-emerald-950"
      : variant === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950 [&_*]:text-amber-950"
      : variant === "info"
      ? "border-sky-200 bg-sky-50 text-sky-950 [&_*]:text-sky-950"
      : "";

  React.useEffect(() => {
    if (!open) return;

    const t = window.setTimeout(() => {
      onOpenChange(false);
    }, autoCloseMs);

    return () => window.clearTimeout(t);
  }, [open, autoCloseMs, onOpenChange]);

  if (!open) return null;

  return (
    <Alert
      variant={variant === "destructive" ? "destructive" : "default"}
      className={cn("relative", tone, className)}
      role="status"
      aria-live="polite"
    >
      {!hideIcon && <Icon className="h-4 w-4" />}

      <div className="min-w-0">
        <AlertTitle className="truncate">{title}</AlertTitle>
        {description ? (
          <AlertDescription className="mt-1">{description}</AlertDescription>
        ) : null}
      </div>

      {dismissible ? (
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-md p-1 opacity-70 hover:opacity-100"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </Alert>
  );
}
