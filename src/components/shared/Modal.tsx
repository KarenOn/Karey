"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ModalSize = "sm" | "default" | "lg" | "xl" | "full";

type ModalProps = {
  open: boolean;
  onClose: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  description?: React.ReactNode;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-lg",
  default: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
  full: "sm:max-w-[calc(100vw-3rem)]",
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "default",
  description,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="app-heading text-3xl font-bold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="py-4">{children}</div>
        {footer ? <DialogFooter className="border-t border-border/70 pt-4">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
