"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";

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

const iconByVariant: Record<AppAlertVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  destructive: <XCircle className="h-4 w-4" />,
};

const toneByVariant: Record<AppAlertVariant, string> = {
  success:
    "!border-emerald-200 !bg-emerald-50 !text-emerald-950 [&_*]:!text-emerald-950",
  info: "!border-sky-200 !bg-sky-50 !text-sky-950 [&_*]:!text-sky-950",
  warning:
    "!border-amber-200 !bg-amber-50 !text-amber-950 [&_*]:!text-amber-950",
  destructive:
    "!border-rose-200 !bg-rose-50 !text-rose-950 [&_*]:!text-rose-950",
};

export function AppAlert({
  open,
  onOpenChange,
  variant = "info",
  title,
  description,
  autoCloseMs = 3500,
  dismissible = false,
  className,
  hideIcon = false,
}: Props) {
  const toastIdRef = React.useRef<string | number | null>(null);
  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    // Solo disparar toast cuando cambia de false -> true
    if (open && !prevOpenRef.current) {
      const icon = hideIcon ? null : iconByVariant[variant];

      const baseOptions = {
        description,
        duration: autoCloseMs,
        dismissible,
        closeButton: dismissible,
        icon,
        className: cn("border shadow-lg", toneByVariant[variant], className),
      };

      // Mapear tu variant al tipo de sonner
      if (variant === "success") toastIdRef.current = toast.success(title, baseOptions);
      else if (variant === "warning") toastIdRef.current = toast.warning(title, baseOptions);
      else if (variant === "destructive") toastIdRef.current = toast.error(title, baseOptions);
      else toastIdRef.current = toast.info(title, baseOptions);

      // Mantener tu comportamiento original: auto-cerrar controlado
      const t = window.setTimeout(() => {
        onOpenChange(false);
      }, autoCloseMs);

      return () => window.clearTimeout(t);
    }

    // Si el parent lo cierra manualmente, cerramos el toast también
    if (!open && prevOpenRef.current) {
      if (toastIdRef.current != null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }

    prevOpenRef.current = open;
  }, [
    open,
    variant,
    title,
    description,
    autoCloseMs,
    dismissible,
    className,
    hideIcon,
    onOpenChange,
  ]);

  // Sonner no necesita renderizar nada aquí
  return null;
}
