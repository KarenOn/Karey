export function deriveAttachmentDisplayName(filename: string) {
  const trimmed = filename.trim();
  const withoutExtension = trimmed.replace(/\.[^./\\]+$/, "");
  return (withoutExtension || trimmed || "Documento").slice(0, 255);
}

export function getAttachmentDisplayName(displayName?: string | null, originalFilename?: string | null, fileName?: string | null) {
  return displayName?.trim() || deriveAttachmentDisplayName(originalFilename || fileName || "Documento");
}
