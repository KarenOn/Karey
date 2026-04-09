"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type UploadScope = "clinic-logo" | "medical-attachment" | "user-avatar";

type SignedFileUploaderProps = {
  accept?: string;
  buttonLabel?: string;
  className?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
  onUploaded: (file: {
    fileName: string;
    fileType: string;
    previewUrl: string;
    storageRef: string;
  }) => void | Promise<void>;
  scope: UploadScope;
  visitId?: number | null;
};

type SignResponse = {
  contentType: string;
  storageRef: string;
  uploadUrl: string;
};

export default function SignedFileUploader({
  accept,
  buttonLabel = "Subir archivo",
  className,
  disabled = false,
  onError,
  onUploaded,
  scope,
  visitId,
}: SignedFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const hasLabel = buttonLabel.trim().length > 0;

  async function handleFileSelection(file: File) {
    setUploading(true);

    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          scope,
          ...(scope === "medical-attachment" ? { visitId } : {}),
        }),
      });

      const signData = (await signRes.json().catch(() => null)) as SignResponse | null;

      if (!signRes.ok || !signData) {
        throw new Error("No se pudo firmar la subida");
      }

      const uploadRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": signData.contentType || file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("No se pudo subir el archivo al almacenamiento");
      }

      await onUploaded({
        fileName: file.name,
        fileType: signData.contentType || file.type || "application/octet-stream",
        previewUrl: URL.createObjectURL(file),
        storageRef: signData.storageRef,
      });
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Ocurrió un error subiendo el archivo"
      );
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        accept={accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFileSelection(file);
          }
        }}
        type="file"
      />

      <Button
        className={className}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="outline"
      >
        {uploading ? (
          <Loader2 className={hasLabel ? "mr-2 h-4 w-4 animate-spin" : "h-4 w-4 animate-spin"} />
        ) : (
          <Upload className={hasLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        )}
        {hasLabel ? (uploading ? "Subiendo..." : buttonLabel) : null}
      </Button>
    </>
  );
}
