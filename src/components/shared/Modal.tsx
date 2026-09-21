// "use client";

// import React from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";

// type ModalSize = "sm" | "default" | "lg" | "xl" | "full";

// type ModalProps = {
//   open: boolean;
//   onClose: (open: boolean) => void;
//   title: React.ReactNode;
//   children: React.ReactNode;
//   footer?: React.ReactNode;
//   size?: ModalSize;
//   description?: React.ReactNode;
//   scrollContent?: boolean;
// };

// const sizeClasses: Record<ModalSize, string> = {
//   sm: "sm:max-w-lg",
//   default: "sm:max-w-xl",
//   lg: "sm:max-w-3xl",
//   xl: "sm:max-w-5xl",
//   full: "sm:max-w-[calc(100vw-3rem)]",
// };

// export default function Modal({
//   open,
//   onClose,
//   title,
//   children,
//   footer,
//   size = "default",
//   description,
// }: ModalProps) {
//   return (
//     <Dialog open={open} onOpenChange={onClose}>
//       <DialogContent className={`${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
//         <DialogHeader className="shrink-0">
//           <DialogTitle className="app-heading text-3xl font-bold text-foreground">{title}</DialogTitle>
//           {description ? (
//             <DialogDescription className="text-sm text-muted-foreground">
//               {description}
//             </DialogDescription>
//           ) : null}
//         </DialogHeader>
//         <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">{children}</div>
//         {footer ? <DialogFooter className="shrink-0 border-t border-border/70 pt-4">{footer}</DialogFooter> : null}
//       </DialogContent>
//     </Dialog>
//   );
// }

"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

// Mapa de anchos exactos calculados
const sizeWidthMap: Record<ModalSize, string> = {
  sm: "440px",
  default: "540px",
  lg: "768px",
  xl: "1150px",
  full: "calc(100vw - 2rem)",
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
  const isFull = size === "full";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        // Forzamos clases de ancho dinámico con Tailwind prioritario
        className={cn(
          "max-h-[90vh] flex flex-col transition-all duration-200 !w-full",
          isFull ? "md:!w-[calc(100vw-4rem)]" : ""
        )}
        // Forzamos el ancho máximo real en línea, anulando por completo las restricciones de Radix UI v4
        style={{ 
          maxWidth: sizeWidthMap[size],
          width: isFull ? undefined : sizeWidthMap[size] 
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="app-heading text-2xl font-bold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-1">
          {children}
        </div>
        
        {footer ? (
          <DialogFooter className="shrink-0 border-t border-border/70 pt-4 mt-2">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
