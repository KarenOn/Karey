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

  title?: string; // default: "Eliminar"
  description?: string; // default auto
  itemName?: string; // "Cliente Juan"
  dangerText?: string; // default: "Eliminar"
  cancelText?: string; // default: "Cancelar"

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
    `¿Seguro que deseas eliminar${itemName ? ` "${itemName}"` : " este elemento"}? Esta acción no se puede deshacer.`;

  const handleConfirm = async () => {
    if (loading || disabled) return;
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
              <Trash2 className="h-5 w-5 text-red-600" />
            </span>
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-slate-600">
            {finalDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-3">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={loading}>
              {cancelText}
            </Button>
          </AlertDialogCancel>

          {/* Usamos Button dentro para poder controlar loading/disabled bien */}
          <AlertDialogAction asChild>
            <Button
              onClick={handleConfirm}
              disabled={loading || disabled}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Eliminando..." : dangerText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
