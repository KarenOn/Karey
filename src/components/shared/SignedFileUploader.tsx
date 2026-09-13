// "use client";

// import { useRef } from "react";
// import { Upload } from "lucide-react";
// import { Button } from "@/components/ui/button";

// export type UploadScope = "clinic-logo" | "medical-attachment" | "user-avatar";
// export const UPLOAD_SCOPES = {
//   clinicLogo: "clinic-logo",
//   userAvatar: "user-avatar",
//   medicalAttachment: "medical-attachment",
// } as const satisfies Record<string, UploadScope>;
// export type LocalFile = {
//   file: File;
//   fileName: string;
//   fileType: string;
//   previewUrl: string;
// };
// export type UploadedFile = {
//   fileName: string;
//   fileType: string;
//   storageRef: string;
// };

// type Props = {
//   accept?: string;
//   buttonLabel?: string;
//   className?: string;
//   disabled?: boolean;
//   maxSizeBytes?: number;
//   onError?: (message: string) => void;
//   onFileSelected: (file: LocalFile) => void;
// };

// /** Uploads are intentionally separate from selection and are called by form submit handlers. */
// export async function uploadFileToStorage(
//   localFile: LocalFile,
//   scope: UploadScope,
//   visitId?: number | null,
// ): Promise<UploadedFile> {
//   const signRes = await fetch("/api/uploads/sign", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       fileName: localFile.file.name,
//       fileType: localFile.file.type,
//       scope,
//       ...(scope === "medical-attachment" ? { visitId } : {}),
//     }),
//   });
//   const signData = (await signRes.json().catch(() => null)) as {
//     contentType: string;
//     storageRef: string;
//     uploadUrl: string;
//   } | null;
//   if (!signRes.ok || !signData)
//     throw new Error("No se pudo preparar la subida");
//   const uploadRes = await fetch(signData.uploadUrl, {
//     method: "PUT",
//     headers: {
//       "Content-Type":
//         signData.contentType ||
//         localFile.file.type ||
//         "application/octet-stream",
//     },
//     body: localFile.file,
//   });
//   if (!uploadRes.ok)
//     throw new Error("No se pudo subir el archivo al almacenamiento");
//   return {
//     fileName: localFile.file.name,
//     fileType:
//       signData.contentType || localFile.file.type || "application/octet-stream",
//     storageRef: signData.storageRef,
//   };
// }

// function matchesAccept(file: File, accept?: string) {
//   if (!accept) return true;
//   return accept.split(",").some((entry) => {
//     const value = entry.trim().toLowerCase();
//     return value.endsWith("/*")
//       ? file.type.toLowerCase().startsWith(value.slice(0, -1))
//       : value.startsWith(".")
//         ? file.name.toLowerCase().endsWith(value)
//         : file.type.toLowerCase() === value;
//   });
// }

// export default function SignedFileUploader({
//   accept,
//   buttonLabel = "Seleccionar archivo",
//   className,
//   disabled = false,
//   maxSizeBytes = 10 * 1024 * 1024,
//   onError,
//   onFileSelected,
// }: Props) {
//   const inputRef = useRef<HTMLInputElement | null>(null);
//   const hasLabel = buttonLabel.trim().length > 0;
//   function handleChange(file: File) {
//     if (!matchesAccept(file, accept))
//       return onError?.("El tipo de archivo no está permitido.");
//     if (file.size > maxSizeBytes)
//       return onError?.(
//         `El archivo supera el tamaño máximo de ${Math.round(maxSizeBytes / 1024 / 1024)} MB.`,
//       );
//     onFileSelected({
//       file,
//       fileName: file.name,
//       fileType: file.type || "application/octet-stream",
//       previewUrl: URL.createObjectURL(file),
//     });
//     if (inputRef.current) inputRef.current.value = "";
//   }
//   return (
//     <>
//       <input
//         ref={inputRef}
//         accept={accept}
//         className="hidden"
//         disabled={disabled}
//         onChange={(event) => {
//           const file = event.target.files?.[0];
//           if (file) handleChange(file);
//         }}
//         type="file"
//       />
//       <Button
//         className={className}
//         disabled={disabled}
//         onClick={() => inputRef.current?.click()}
//         type="button"
//         variant="outline"
//       >
//         <Upload className={hasLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
//         {hasLabel ? buttonLabel : null}
//       </Button>
//     </>
//   );
// }

"use client";

import { useRef, useState } from "react";
import { Upload, Plus, AlertCircle, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // O la función que uses para combinar clases

export type UploadScope = "clinic-logo" | "medical-attachment" | "user-avatar";
export const UPLOAD_SCOPES = {
  clinicLogo: "clinic-logo",
  userAvatar: "user-avatar",
  medicalAttachment: "medical-attachment",
} as const satisfies Record<string, UploadScope>;

export type LocalFile = {
  file: File;
  fileName: string;
  fileType: string;
  previewUrl: string;
};
export type UploadedFile = {
  fileName: string;
  fileType: string;
  storageRef: string;
};

type Props = {
  accept?: string;
  className?: string;
  disabled?: boolean;
  maxSizeBytes?: number;
  onError?: (message: string) => void;
  onFileSelected: (file: LocalFile | null) => void; // Cambiado para soportar null si se desea limpiar
  currentFile?: LocalFile | null; // Añadido para que el componente sepa si hay un archivo seleccionado
};

export async function uploadFileToStorage(
  localFile: LocalFile,
  scope: UploadScope,
  visitId?: number | null,
): Promise<UploadedFile> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: localFile.file.name,
      fileType: localFile.file.type,
      scope,
      ...(scope === "medical-attachment" ? { visitId } : {}),
    }),
  });
  const signData = (await signRes.json().catch(() => null)) as {
    contentType: string;
    storageRef: string;
    uploadUrl: string;
  } | null;
  if (!signRes.ok || !signData)
    throw new Error("No se pudo preparar la subida");
  const uploadRes = await fetch(signData.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type":
        signData.contentType ||
        localFile.file.type ||
        "application/octet-stream",
    },
    body: localFile.file,
  });
  if (!uploadRes.ok)
    throw new Error("No se pudo subir el archivo al almacenamiento");
  return {
    fileName: localFile.file.name,
    fileType:
      signData.contentType || localFile.file.type || "application/octet-stream",
    storageRef: signData.storageRef,
  };
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  return accept.split(",").some((entry) => {
    const value = entry.trim().toLowerCase();
    return value.endsWith("/*")
      ? file.type.toLowerCase().startsWith(value.slice(0, -1))
      : value.startsWith(".")
        ? file.name.toLowerCase().endsWith(value)
        : file.type.toLowerCase() === value;
  });
}

export default function SignedFileUploader({
  accept,
  className,
  disabled = false,
  maxSizeBytes = 10 * 1024 * 1024,
  onError,
  onFileSelected,
  currentFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);

  function handleChange(file: File) {
    if (!matchesAccept(file, accept))
      return onError?.("El tipo de archivo no está permitido.");
    if (file.size > maxSizeBytes)
      return onError?.(
        `El archivo supera el tamaño máximo de ${maxSizeMB} MB.`,
      );
    onFileSelected({
      file,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      previewUrl: URL.createObjectURL(file),
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  // Manejadores del comportamiento Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleChange(e.dataTransfer.files[0]);
    }
  };

  // Obtener extensión limpia para la tarjeta inferior (.zip, .pdf, etc)
  const getFileExtension = (filename: string) => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
  };

  // Obtener tamaño legible en MB o KB
  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    }
    return `${Math.ceil(bytes / 1024)}KB`;
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <input
        ref={inputRef}
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleChange(file);
        }}
        type="file"
      />

      {/* Dropzone (Área Superior de Carga) */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer select-none",
          isDragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-blue-900/40 hover:border-primary/60 bg-transparent",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        {/* Icono Mas / Plus centralizado */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-600/30 text-blue-600 mb-3 bg-blue-50/50 dark:bg-blue-950/20">
          <Plus className="h-5 w-5 stroke-[2.5]" />
        </div>

        {/* Textos Informativos */}
        <p className="text-sm text-muted-foreground font-medium text-center">
          Arrastra o{" "}
          <span className="text-blue-600 font-semibold hover:underline">
            buscar archivo
          </span>
        </p>

        {/* Alerta de tamaño máximo en Rojo */}
        <div className="flex items-center gap-1.5 mt-3 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-semibold">Tamaño máximo: {maxSizeMB}MB</span>
        </div>
      </div>

      {/* Vista previa del Archivo Seleccionado (Tarjeta Inferior sin acciones) */}
      {currentFile && (
        <div className="flex items-center w-full p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 transition-all animate-in fade-in-50 duration-200">
          {/* Icono de Archivo circular */}
          <div className="flex flex-col items-center justify-center min-w-11 max-w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 mr-3 relative">
            <FileArchive className="h-5 w-5" />
            <span className="absolute bottom-1 text-[8px] font-bold uppercase tracking-tighter text-blue-800 dark:text-blue-300">
              {getFileExtension(currentFile.fileName)}
            </span>
          </div>

          {/* Nombre y Peso del documento */}
          <div className="flex flex-col flex-1 min-w-0 pr-2">
            <h4 className="text-sm font-semibold text-foreground truncate">
              {currentFile.fileName}
            </h4>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              .{getFileExtension(currentFile.fileName)} <span className="mx-1 text-muted-foreground/50">|</span> {formatFileSize(currentFile.file.size)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
