"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowDownAZ,
  ChevronDown,
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  List,
  Paperclip,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AttachmentUploadModal from "@/components/shared/AttachmentUploadModal";
import DataTablePagination from "@/components/shared/DataTablePagination";
import DocumentAttachment from "@/components/shared/DocumentAttachment";
import ModalDelete from "@/components/shared/ModalDelete";
import {
  UPLOAD_SCOPES,
  uploadFileToStorage,
  type LocalFile,
} from "@/components/shared/SignedFileUploader";
import { MedicalAttachmentCreateSchema } from "@/lib/validators/attachments";
import { getAttachmentDisplayName } from "@/lib/attachments";

type PatientDocument = {
  id: number;
  fileName: string;
  displayName?: string | null;
  originalFilename?: string | null;
  fileType?: string | null;
  fileSizeBytes?: number | null;
  url?: string | null;
  downloadUrl?: string | null;
  storageRef?: string | null;
  createdAt: string;
  visitId?: number | null;
  visit?: {
    id: number;
    visitAt: string;
    diagnosis?: string | null;
    appointment?: { reason?: string | null } | null;
  } | null;
};

type PatientVisit = {
  id: number;
  visitAt: string;
  diagnosis?: string | null;
  appointment?: { reason?: string | null } | null;
};
type Category = "all" | "general" | "visits";
type ViewMode = "table" | "explorer";

function dateLabel(value?: string | null) {
  if (!value) return "-";
  try {
    return format(new Date(value), "d MMM yyyy", { locale: es });
  } catch {
    return "-";
  }
}

function visitDateLabel(value?: string | null) {
  if (!value) return "-";
  try {
    return format(parseISO(value.slice(0, 10)), "d MMM yyyy", { locale: es });
  } catch {
    return "-";
  }
}

function fileTypeLabel(document: PatientDocument) {
  const type = document.fileType?.trim();
  if (type?.startsWith("image/")) return "Imagen";
  if (type === "application/pdf") return "PDF";
  if (type?.includes("word")) return "Word";
  if (type?.includes("sheet") || type?.includes("excel")) return "Excel";
  return type || "Archivo";
}

function fileSizeLabel(size?: number | null) {
  if (!size) return "-";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function documentName(document: PatientDocument) {
  return document.displayName?.trim() || document.fileName;
}

function FolderRow({
  label,
  count,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  icon: typeof Folder;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted"}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  );
}

export default function PatientDocumentsTab({
  petId,
  visits,
  canDelete = false,
  onDocumentsChanged,
}: {
  petId: number;
  visits: PatientVisit[];
  canDelete?: boolean;
  onDocumentsChanged?: () => void | Promise<void>;
}) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<ViewMode>("table");
  const [page, setPage] = useState(0);
  const [folder, setFolder] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftFile, setDraftFile] = useState<LocalFile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState("none");
  const [deleting, setDeleting] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<PatientDocument | null>(null);

  async function loadDocuments() {
    setLoading(true);
    try {
      const response = await fetch(`/api/pets/${petId}/attachments`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No se pudieron cargar los documentos");
      const data = (await response.json()) as PatientDocument[];
      setDocuments(data);
      setSelectedId((current) =>
        current && data.some((item) => item.id === current)
          ? current
          : (data[0]?.id ?? null),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los documentos",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, [petId]);

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const folderDocuments =
      folder === "all"
        ? documents
        : folder === "general"
          ? documents.filter((item) => !item.visitId)
          : documents.filter(
              (item) => item.visitId === Number(folder.replace("visit:", "")),
            );
    return folderDocuments
      .filter(
        (item) =>
          category === "all" ||
          (category === "general" ? !item.visitId : Boolean(item.visitId)),
      )
      .filter(
        (item) =>
          !normalized ||
          [
            documentName(item),
            fileTypeLabel(item),
            item.visit?.diagnosis,
            item.visit?.appointment?.reason,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalized),
      )
      .sort((a, b) =>
        sort === "name"
          ? documentName(a).localeCompare(documentName(b), "es")
          : sort === "oldest"
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [category, documents, folder, query, sort]);

  const generalDocuments = documents.filter((item) => !item.visitId);
  const visitDocuments = documents.filter((item) => Boolean(item.visitId));
  const selectedDocument =
    documents.find((item) => item.id === selectedId) ?? null;
  const pageDocuments = filteredDocuments.slice(page * 10, (page + 1) * 10);

  useEffect(() => {
    setPage(0);
  }, [category, folder, query, sort, view]);

  function resetUpload() {
    if (draftFile?.previewUrl?.startsWith("blob:"))
      URL.revokeObjectURL(draftFile.previewUrl);
    setDraftFile(null);
    setDisplayName("");
    setSelectedVisitId("none");
    setUploadOpen(false);
  }

  async function saveUpload() {
    if (!draftFile || uploading) return;
    setUploading(true);
    const visitId = selectedVisitId === "none" ? null : Number(selectedVisitId);
    const uploaded = await uploadFileToStorage(
      draftFile,
      UPLOAD_SCOPES.medicalAttachment,
      visitId,
      petId,
    ).catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir el archivo",
      );
      return null;
    });
    if (!uploaded) {
      setUploading(false);
      return;
    }
    const parsed = MedicalAttachmentCreateSchema.safeParse({
      fileName: uploaded.originalFilename,
      displayName: getAttachmentDisplayName(
        displayName,
        uploaded.originalFilename,
      ),
      originalFilename: uploaded.originalFilename,
      fileType: uploaded.fileType,
      fileSizeBytes: uploaded.fileSizeBytes,
      storageRef: uploaded.storageRef,
      ...(visitId ? { visitId } : {}),
    });
    if (!parsed.success) {
      await fetch("/api/uploads/object", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageRef: uploaded.storageRef }),
      }).catch(() => undefined);
      toast.error(
        parsed.error.issues[0]?.message ?? "Datos de archivo inválidos",
      );
      setUploading(false);
      return;
    }
    try {
      const response = await fetch(`/api/pets/${petId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "No se pudo guardar el documento");
      }
      toast.success("Documento agregado correctamente");
      resetUpload();
      await loadDocuments();
      await onDocumentsChanged?.();
    } catch (error) {
      await fetch("/api/uploads/object", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageRef: uploaded.storageRef }),
      }).catch(() => undefined);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el documento",
      );
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!documentToDelete || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/pets/${petId}/attachments/${documentToDelete.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "No se pudo eliminar el documento");
      }
      toast.success("Documento eliminado");
      setDocumentToDelete(null);
      await loadDocuments();
      await onDocumentsChanged?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el documento",
      );
    } finally {
      setDeleting(false);
    }
  }

  function selectDocument(id: number) {
    setSelectedId(id);
  }
  function openPreview(document: PatientDocument) {
    selectDocument(document.id);
    setView("explorer");
  }

  return (
    <div className="app-panel-strong overflow-hidden">
      <div className="border-b border-border/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="app-heading text-2xl">Documentos del paciente</h2>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {documents.length} archivos
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos los documentos de este paciente, organizados por origen y
              visita.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <label className="relative min-w-0 flex-1 sm:min-w-64">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar documentos"
                className="pl-9"
                placeholder="Buscar documentos..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Button onClick={() => setUploadOpen(true)}>
              <Paperclip className="mr-2 h-4 w-4" />
              Adjuntar documento
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={category === "all" ? "default" : "outline"}
              onClick={() => setCategory("all")}
            >
              Todos ({documents.length})
            </Button>
            <Button
              size="sm"
              variant={category === "general" ? "default" : "outline"}
              onClick={() => setCategory("general")}
            >
              Generales ({generalDocuments.length})
            </Button>
            <Button
              size="sm"
              variant={category === "visits" ? "default" : "outline"}
              onClick={() => setCategory("visits")}
            >
              Visitas ({visitDocuments.length})
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-border bg-background p-1">
              <Button
                size="sm"
                variant={view === "table" ? "secondary" : "ghost"}
                onClick={() => setView("table")}
                aria-label="Vista tabla"
              >
                <List className="mr-1 h-4 w-4" />
                Tabla
              </Button>
              <Button
                size="sm"
                variant={view === "explorer" ? "secondary" : "ghost"}
                onClick={() => setView("explorer")}
                aria-label="Vista explorador"
              >
                <Grid2X2 className="mr-1 h-4 w-4" />
                Explorador
              </Button>
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger
                className="h-9 w-40"
                aria-label="Ordenar documentos"
              >
                <ArrowDownAZ className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="name">Por nombre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Cargando documentos...
        </div>
      ) : view === "table" ? (
        <div className="p-4 sm:p-5">
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha de carga</TableHead>
                  <TableHead>Visita asociada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageDocuments.length ? (
                  pageDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 shrink-0 text-primary" />
                          <span className="max-w-56 truncate font-medium">
                            {documentName(document)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{fileTypeLabel(document)}</TableCell>
                      <TableCell>
                        {document.visitId
                          ? "Visita clínica"
                          : "Documento general"}
                      </TableCell>
                      <TableCell>{dateLabel(document.createdAt)}</TableCell>
                      <TableCell>
                        {document.visit ? (
                          <Link
                            className="text-primary hover:underline"
                            href={`/pets/${petId}?visitId=${document.visit.id}`}
                          >
                            {visitDateLabel(document.visit.visitAt)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            Sin visita
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreview(document)}
                            aria-label={`Previsualizar ${documentName(document)}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {document.downloadUrl ? (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              aria-label={`Descargar ${documentName(document)}`}
                            >
                              <a
                                href={document.downloadUrl}
                                download={
                                  document.originalFilename || document.fileName
                                }
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDocumentToDelete(document)}
                              aria-label={`Eliminar ${documentName(document)}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="p-10 text-center">
                        <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                        <p className="font-medium">No hay documentos</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Prueba otro filtro o adjunta un documento.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredDocuments.length ? (
            <DataTablePagination
              page={page}
              pageSize={10}
              total={filteredDocuments.length}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid min-h-[520px] lg:grid-cols-[210px_minmax(0,1fr)_300px]">
          <aside className="border-b border-border/70 p-3 lg:border-b-0 lg:border-r">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Carpetas
            </p>
            <div className="space-y-1">
              <FolderRow
                label="Todos los documentos"
                count={documents.length}
                active={folder === "all"}
                icon={FolderOpen}
                onClick={() => setFolder("all")}
              />
              <FolderRow
                label="Documentos generales"
                count={generalDocuments.length}
                active={folder === "general"}
                icon={Folder}
                onClick={() => setFolder("general")}
              />
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Por visita
              </p>
              {Array.from(
                new Map(
                  visitDocuments.map((item) => [item.visitId, item]),
                ).values(),
              ).map((item) => (
                <FolderRow
                  key={item.visitId}
                   label={`${visitDateLabel(item.visit?.visitAt)}${item.visit?.diagnosis ? ` · ${item.visit.diagnosis}` : ""}`}
                  count={
                    visitDocuments.filter((doc) => doc.visitId === item.visitId)
                      .length
                  }
                  active={folder === `visit:${item.visitId}`}
                  icon={Folder}
                  onClick={() => setFolder(`visit:${item.visitId}`)}
                />
              ))}
            </div>
          </aside>
          <section className="min-w-0 border-b border-border/70 p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
                  {folder === "general"
                    ? "Documentos generales"
                    : folder === "all"
                      ? "Todos los documentos"
                      : "Documentos de la visita"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {filteredDocuments.length} archivos
                </p>
              </div>
            </div>
            {filteredDocuments.length ? (
              <div className="space-y-2">
                {filteredDocuments.map((document) => {
                  const image = document.fileType?.startsWith("image/");
                  return (
                    <button
                      type="button"
                      key={document.id}
                      onClick={() => selectDocument(document.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${selectedId === document.id ? "border-primary bg-primary/5" : "border-border/70 hover:bg-muted/40"}`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {image && document.url ? (
                          <img
                            src={document.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : image ? (
                          <FileImage className="h-5 w-5 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {documentName(document)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fileTypeLabel(document)} ·{" "}
                          {dateLabel(document.createdAt)}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No hay documentos en esta carpeta.
              </div>
            )}
          </section>
          <aside className="min-w-0 bg-muted/20 p-4">
            {selectedDocument ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <h3 className="truncate font-semibold text-foreground">
                      {documentName(selectedDocument)}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedId(null)}
                    aria-label="Cerrar previsualización"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background">
                  {selectedDocument.url &&
                  selectedDocument.fileType?.startsWith("image/") ? (
                    <img
                      src={selectedDocument.url}
                      alt={documentName(selectedDocument)}
                      className="max-h-64 w-full object-contain"
                    />
                  ) : selectedDocument.url &&
                    selectedDocument.fileType === "application/pdf" ? (
                    <iframe
                      title={documentName(selectedDocument)}
                      src={selectedDocument.url}
                      className="h-64 w-full"
                    />
                  ) : (
                    <div className="p-6 text-center">
                      <File className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Este formato no tiene previsualización.
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-3 border-t border-border/70 pt-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">
                      {fileTypeLabel(selectedDocument)} ·{" "}
                      {fileSizeLabel(selectedDocument.fileSizeBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      Fecha de carga
                    </span>
                    <span className="font-medium">
                      {dateLabel(selectedDocument.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Visita</span>
                    {selectedDocument.visit ? (
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/pets/${petId}?visitId=${selectedDocument.visit.id}`}
                      >
                        Ver visita
                      </Link>
                    ) : (
                      <span className="font-medium text-muted-foreground">
                        Sin visita asociada
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DocumentAttachment
                    fileName={selectedDocument.fileName}
                    displayName={selectedDocument.displayName}
                    originalFilename={selectedDocument.originalFilename}
                    fileType={selectedDocument.fileType}
                    size={selectedDocument.fileSizeBytes}
                    url={selectedDocument.url}
                    downloadUrl={selectedDocument.downloadUrl}
                    onDelete={
                      canDelete
                        ? () => setDocumentToDelete(selectedDocument)
                        : undefined
                    }
                    viewName={false}
                    deleting={deleting}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center text-center text-sm text-muted-foreground">
                <div>
                  <Eye className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p>Selecciona un archivo para previsualizarlo.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <AttachmentUploadModal
        open={uploadOpen}
        onClose={resetUpload}
        title="Adjuntar documento al expediente"
        description="Guarda el archivo directamente en el expediente o relaciónalo con una visita existente."
        displayName={displayName}
        file={draftFile}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        saving={uploading}
        onDisplayNameChange={setDisplayName}
        onFileSelected={setDraftFile}
        onError={(message) => toast.error(message)}
        onSave={() => void saveUpload()}
      >
        <div className="space-y-2">
          <Label htmlFor="document-visit">Visita asociada (opcional)</Label>
          <Select value={selectedVisitId} onValueChange={setSelectedVisitId}>
            <SelectTrigger id="document-visit" className="w-full">
              <SelectValue placeholder="Sin visita asociada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Documento general</SelectItem>
              {visits.map((visit) => (
                <SelectItem key={visit.id} value={String(visit.id)}>
                      {visitDateLabel(visit.visitAt)}
                  {visit.diagnosis ? ` · ${visit.diagnosis}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AttachmentUploadModal>
      <ModalDelete
        open={Boolean(documentToDelete)}
        title="Eliminar documento"
        itemName={documentToDelete ? documentName(documentToDelete) : undefined}
        description="El documento dejará de aparecer en el expediente y, si está asociado, también en su visita. La visita y sus demás registros no se modificarán."
        loading={deleting}
        onOpenChange={(open) => {
          if (!open && !deleting) setDocumentToDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
