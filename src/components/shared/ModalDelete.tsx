"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type ModalDeleteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  dangerText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
};

export default function ModalDelete({
  open,
  onOpenChange,
  title = "Eliminar",
  description,
  itemName,
  dangerText = "Eliminar",
  cancelText = "Cancelar",
  loading = false,
  disabled = false,
  onConfirm,
}: ModalDeleteProps) {
  const finalDescription =
    description ??
    `¿Seguro que deseas eliminar${
      itemName ? ` "${itemName}"` : " este elemento"
    }? Esta acción no se puede deshacer.`;

  const handleConfirm = async () => {
    if (loading || disabled) return;
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <Trash2 className="h-5 w-5 text-red-600" />
            </span>
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-muted-foreground">
            {finalDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={loading}>
              {cancelText}
            </Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button
              onClick={handleConfirm}
              disabled={loading || disabled}
              variant="destructive"
            >
              {loading ? "Eliminando..." : dangerText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
