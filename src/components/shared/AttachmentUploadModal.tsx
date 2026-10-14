"use client";

import { LoaderCircle } from "lucide-react";
import Modal from "@/components/shared/Modal";
import DocumentAttachment from "@/components/shared/DocumentAttachment";
import SignedFileUploader, { type LocalFile } from "@/components/shared/SignedFileUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAttachmentDisplayName } from "@/lib/attachments";

type AttachmentUploadModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  showNameField?: boolean;
  initialName?: string;
  displayName: string;
  file: LocalFile | null;
  accept?: string;
  disabled?: boolean;
  saving?: boolean;
  onDisplayNameChange: (value: string) => void;
  onFileSelected: (file: LocalFile | null) => void;
  onError?: (message: string) => void;
  onSave: () => void;
  children?: React.ReactNode;
};

export default function AttachmentUploadModal({
  open,
  onClose,
  title,
  description,
  showNameField = true,
  initialName,
  displayName,
  file,
  accept,
  disabled = false,
  saving = false,
  onDisplayNameChange,
  onFileSelected,
  onError,
  onSave,
  children,
}: AttachmentUploadModalProps) {
  const visibleName = getAttachmentDisplayName(displayName || initialName, file?.fileName);

  return (
    <Modal
      open={open}
      onClose={(nextOpen) => {
        if (!nextOpen && !disabled && !saving) onClose();
      }}
      title={title}
      description={description}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={disabled || saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSave} disabled={disabled || saving || !file}>
            {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SignedFileUploader
          accept={accept}
          disabled={disabled || saving}
          onFileSelected={onFileSelected}
          onError={onError}
        />
        {file ? (
          <DocumentAttachment
            fileName={visibleName}
            fileType={file.fileType}
            size={file.file.size}
            url={file.previewUrl}
            onDelete={() => onFileSelected(null)}
            deleting={disabled || saving}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona un archivo para continuar.</p>
        )}
        {showNameField ? (
          <div className="space-y-2">
            <Label htmlFor="attachment-display-name">Nombre del documento</Label>
            <Input
              id="attachment-display-name"
              value={displayName || initialName || ""}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder="Ej. Resultados de laboratorio"
              maxLength={255}
              disabled={disabled || saving}
            />
          </div>
        ) : null}
        {children}
      </div>
    </Modal>
  );
}
