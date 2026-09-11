"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UploadScope = "clinic-logo" | "medical-attachment" | "user-avatar";
export const UPLOAD_SCOPES = {
  clinicLogo: "clinic-logo",
  userAvatar: "user-avatar",
  medicalAttachment: "medical-attachment",
} as const satisfies Record<string, UploadScope>;
export type LocalFile = { file: File; fileName: string; fileType: string; previewUrl: string };
export type UploadedFile = { fileName: string; fileType: string; storageRef: string };

type Props = {
  accept?: string; buttonLabel?: string; className?: string; disabled?: boolean;
  maxSizeBytes?: number; onError?: (message: string) => void;
  onFileSelected: (file: LocalFile) => void;
};

/** Uploads are intentionally separate from selection and are called by form submit handlers. */
export async function uploadFileToStorage(localFile: LocalFile, scope: UploadScope, visitId?: number | null): Promise<UploadedFile> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: localFile.file.name, fileType: localFile.file.type, scope, ...(scope === "medical-attachment" ? { visitId } : {}) }),
  });
  const signData = (await signRes.json().catch(() => null)) as { contentType: string; storageRef: string; uploadUrl: string } | null;
  if (!signRes.ok || !signData) throw new Error("No se pudo preparar la subida");
  const uploadRes = await fetch(signData.uploadUrl, {
    method: "PUT", headers: { "Content-Type": signData.contentType || localFile.file.type || "application/octet-stream" }, body: localFile.file,
  });
  if (!uploadRes.ok) throw new Error("No se pudo subir el archivo al almacenamiento");
  return { fileName: localFile.file.name, fileType: signData.contentType || localFile.file.type || "application/octet-stream", storageRef: signData.storageRef };
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  return accept.split(",").some((entry) => {
    const value = entry.trim().toLowerCase();
    return value.endsWith("/*") ? file.type.toLowerCase().startsWith(value.slice(0, -1)) : value.startsWith(".") ? file.name.toLowerCase().endsWith(value) : file.type.toLowerCase() === value;
  });
}

export default function SignedFileUploader({ accept, buttonLabel = "Seleccionar archivo", className, disabled = false, maxSizeBytes = 10 * 1024 * 1024, onError, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasLabel = buttonLabel.trim().length > 0;
  function handleChange(file: File) {
    if (!matchesAccept(file, accept)) return onError?.("El tipo de archivo no está permitido.");
    if (file.size > maxSizeBytes) return onError?.(`El archivo supera el tamaño máximo de ${Math.round(maxSizeBytes / 1024 / 1024)} MB.`);
    onFileSelected({ file, fileName: file.name, fileType: file.type || "application/octet-stream", previewUrl: URL.createObjectURL(file) });
    if (inputRef.current) inputRef.current.value = "";
  }
  return <>
    <input ref={inputRef} accept={accept} className="hidden" disabled={disabled} onChange={(event) => { const file = event.target.files?.[0]; if (file) handleChange(file); }} type="file" />
    <Button className={className} disabled={disabled} onClick={() => inputRef.current?.click()} type="button" variant="outline"><Upload className={hasLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />{hasLabel ? buttonLabel : null}</Button>
  </>;
}
