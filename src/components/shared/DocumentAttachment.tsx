"use client";

import { useState } from "react";
import { Download, Eye, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = { fileName: string; fileType?: string | null; size?: number | null; url?: string | null; downloadUrl?: string | null; onDelete?: () => void; deleting?: boolean };

export default function DocumentAttachment({ fileName, fileType, size, url, downloadUrl, onDelete, deleting }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const type = fileType || "application/octet-stream";
  const canPreview = type.startsWith("image/") || type === "application/pdf";
  const sizeLabel = size ? `${Math.ceil(size / 1024)} KB` : null;
  return (
    <>
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
        <FileText
          className="h-4 w-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{fileName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {type}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </p>
        </div>
        {url ? (
          <Button
            type="button"
            size="sm"
            className="cursor-pointer"
            variant="ghost"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="mr-1 h-4 w-4" />
            Previsualizar
          </Button>
        ) : null}
        {downloadUrl ? (
          <Button asChild type="button" size="sm" variant="ghost">
            <a href={downloadUrl} download>
              <Download className="mr-1 h-4 w-4" />
              Descargar
            </a>
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-pointer"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Eliminar ${fileName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
            <DialogDescription>
              {canPreview
                ? "Previsualización del archivo"
                : "Este formato no se puede previsualizar aquí."}
            </DialogDescription>
          </DialogHeader>
          {canPreview && url ? (
            type === "application/pdf" ? (
              <iframe
                title={fileName}
                src={url}
                className="h-[65vh] w-full rounded-md border"
              />
            ) : (
              <img
                src={url}
                alt={fileName}
                className="max-h-[65vh] w-full object-contain"
              />
            )
          ) : downloadUrl ? (
            <div className="flex justify-center">
              <Button asChild>
                <a href={downloadUrl} download>
                  Descargar archivo
                </a>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
