"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
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
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  default: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "default",
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader className="border-b border-border/70 pb-4">
          <DialogTitle className="text-xl font-bold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{children}</div>
        {footer ? <DialogFooter className="border-t border-border/70 pt-4">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
