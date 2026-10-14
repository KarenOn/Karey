"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UPLOAD_SCOPES, uploadFileToStorage, type LocalFile } from "@/components/shared/SignedFileUploader";
import AttachmentUploadModal from "@/components/shared/AttachmentUploadModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  Calendar,
  Weight,
  Syringe,
  Stethoscope,
  Plus,
  AlertTriangle,
  Paperclip,
  Pencil,
  ChevronDown,
  ChevronRight,
  FileText,
  Eye,
  Info,
  MoreHorizontal,
  ClipboardList,
  Clock3,
  CalendarClock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO, differenceInYears, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";
import { VaccinationRecordCreateSchema } from "@/lib/validators/vaccination";
import { MedicalAttachmentCreateSchema } from "@/lib/validators/attachments";
import { useParams, useSearchParams } from "next/navigation";
import { AppAlert } from "@/components/shared/AppAlert";
import ClinicalVisitForm from "@/components/shared/ClinicalVisitForm";
import VaccinationForm from "@/components/shared/VaccinationForm";
import DocumentAttachment from "@/components/shared/DocumentAttachment";
import ModalDelete from "@/components/shared/ModalDelete";
import DataTablePagination from "@/components/shared/DataTablePagination";
import { useCurrentUserProfile } from "@/components/layout/current-user-context";
import { safeDate } from "@/lib/utility";
import ClinicalReportDialog from "@/components/shared/ClinicalReportDialog";
import { apiUpdatePet } from "@/lib/api/pets";
import { PetUpdateSchema, zodFieldErrors } from "@/lib/validators/pet";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import BackButton from "@/components/shared/BackButton";
import { deriveAttachmentDisplayName, getAttachmentDisplayName } from "@/lib/attachments";
import PatientDocumentsTab from "@/components/shared/PatientDocumentsTab";
import PatientInvoicesTab from "@/components/shared/PatientInvoicesTab";
import PatientRemindersTab from "@/components/shared/PatientRemindersTab";
import { apiListPetReminders, type PetReminder } from "@/lib/api/pet-reminders";

type PetDTO = any; // si quieres, luego lo tipamos con Prisma types
type VisitDTO = any;
type VaccDTO = any;
type VaccineDTO = any;
type AttachmentDTO = any;
type VetDTO = { id: string; name: string; email: string };
type AttachmentUploadDraft = {
  file?: LocalFile;
  fileName: string;
  displayName: string;
  fileType: string;
  storageRef: string;
  previewUrl: string;
};
const speciesEmoji: Record<string, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  OTHER: "🐾",
};

const sexLabel: Record<string, string> = {
  MALE: "Macho",
  FEMALE: "Hembra",
  UNKNOWN: "Desconocido",
};

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatClinicalDate(value?: string | null) {
  const key = dateOnly(value);
  const date = key ? safeDate(key) : null;
  return date ? format(date, "d MMM yyyy", { locale: es }) : "-";
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando data");
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? "Error guardando");
  }
  return res.json();
}

async function apiDelete(url: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? "Error eliminando");
  }
}

function PatientDetailContent() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();

  const petId = useMemo(() => {
  const raw = searchParams.get("id") ?? params?.id ?? "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams, params]);

  const [pet, setPet] = useState<PetDTO | null>(null);
  const [visits, setVisits] = useState<VisitDTO[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccDTO[]>([]);
  const [reminderPreview, setReminderPreview] = useState<PetReminder[]>([]);
  const [vaccinesCatalog, setVaccinesCatalog] = useState<VaccineDTO[]>([]);
  const [availableVets, setAvailableVets] = useState<VetDTO[]>([]);

  const [loading, setLoading] = useState(true);

  // modales
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitDTO | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitDTO | null>(null);
  const [patientEditOpen, setPatientEditOpen] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientEditForm, setPatientEditForm] = useState<Record<string, string>>({});
  const [patientEditErrors, setPatientEditErrors] = useState<Record<string, string>>({});
  const [vaccineModalOpen, setVaccineModalOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<VaccDTO | null>(null);
  const [visitDateFilter, setVisitDateFilter] = useState("");
  const [vaccinationDateFilter, setVaccinationDateFilter] = useState("");
  const [visitPage, setVisitPage] = useState(0);
  const [vaccinationPage, setVaccinationPage] = useState(0);
  const [activeTab, setActiveTab] = useState("history");
  const [highlightedVaccinationId, setHighlightedVaccinationId] = useState<number | null>(null);
  const [visitTotal, setVisitTotal] = useState(0);
  const [vaccinationTotal, setVaccinationTotal] = useState(0);
  const [expandedAttachments, setExpandedAttachments] = useState<Set<number>>(new Set());
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ visitId: number; attachment: AttachmentDTO } | null>(null);
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const currentUser = useCurrentUserProfile();

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertState, setAlert] = useState<{
    variant: "success" | "info" | "warning" | "destructive";
    title: string;
    description?: string;
  }>({ variant: "info", title: "" });

  // forms
  const [visitForm, setVisitForm] = useState<any>({
    visitAt: format(new Date(), "yyyy-MM-dd"),
    vetId: "",
    diagnosis: "",
    treatment: "",
    notes: "",
    weightKg: "",
    temperatureC: "",
  });

  const [vaccineForm, setVaccineForm] = useState<any>({
    vaccineId: "",
    vaccineName: "",
    appliedAt: format(new Date(), "yyyy-MM-dd"),
    nextDueAt: "",
    batchNumber: "",
    notes: "",
  });

  // attachments por visita
  const [attachModal, setAttachModal] = useState<{ open: boolean; visitId: number | null }>({
    open: false,
    visitId: null,
  });
  const [attachForm, setAttachForm] = useState<AttachmentUploadDraft>({
    fileName: "",
    displayName: "",
    fileType: "",
    storageRef: "",
    previewUrl: "",
  });
  const [draftAttachmentBusy, setDraftAttachmentBusy] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [clinicalReportOpen, setClinicalReportOpen] = useState(false);

  const emptyAttachmentForm: AttachmentUploadDraft = {
    fileName: "",
    displayName: "",
    fileType: "",
    storageRef: "",
    previewUrl: "",
  };

  function revokePreviewUrl(previewUrl?: string) {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  function resetAttachmentForm(form: AttachmentUploadDraft = attachForm) {
    revokePreviewUrl(form.previewUrl);
    setAttachForm(emptyAttachmentForm);
  }

  function finalizeAttachmentModalClose(form: AttachmentUploadDraft = attachForm) {
    setAttachModal({ open: false, visitId: null });
    resetAttachmentForm(form);
  }

  const client = pet?.client;
  const canEditPatient = !!currentUser?.access.actions.pets.update;
  const canViewVisit = !!currentUser?.access.actions.visits.read;
  const canViewVaccination = !!currentUser?.access.actions.vaccines.read;
  const canViewInvoices = !!currentUser?.access.actions.invoices.read;
  const canEditVisit = !!currentUser?.access.actions.visits.edit;

  function openPatientEdit() {
    if (!pet || !canEditPatient) return;
    setPatientEditForm({ name: pet.name, species: pet.species, sex: pet.sex, breed: pet.breed ?? "", birthDate: dateOnly(pet.birthDate), weightKg: pet.weightKg == null ? "" : String(pet.weightKg), color: pet.color ?? "", microchip: pet.microchip ?? "", notes: pet.notes ?? "", allergies: pet.allergies ?? "", chronicConditions: pet.chronicConditions ?? "", clinicalHistory: pet.clinicalHistory ?? "", currentMedications: pet.currentMedications ?? "", clinicalWarnings: pet.clinicalWarnings ?? "" });
    setPatientEditErrors({});
    setPatientEditOpen(true);
  }

  async function savePatientEdit() {
    if (!pet) return;
    const parsed = PetUpdateSchema.safeParse({ ...patientEditForm, weightKg: patientEditForm.weightKg === "" ? undefined : Number(patientEditForm.weightKg), birthDate: patientEditForm.birthDate || undefined });
    if (!parsed.success) {
      setPatientEditErrors(zodFieldErrors(parsed.error));
      toast.error("Revisa los campos obligatorios antes de continuar.");
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] button');
        first?.scrollIntoView({ block: "center" });
        first?.focus();
      });
      return;
    }
    setPatientEditErrors({});
    setSavingPatient(true);
    try { const updated = await apiUpdatePet(pet.id, parsed.data); setPet(updated); setPatientEditOpen(false); toast.success("El paciente fue actualizado."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo actualizar el paciente."); }
    finally { setSavingPatient(false); }
  }

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return "-";
    const d = parseISO(birthDate);
    const years = differenceInYears(new Date(), d);
    if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
    const months = differenceInMonths(new Date(), d);
    return `${months} mes${months > 1 ? "es" : ""}`;
  };

  async function loadVisits(date = visitDateFilter, page = visitPage) {
    const query = new URLSearchParams({ page: String(page), pageSize: "5" });
    if (date) query.set("date", date);
    const result = await apiGet<{ data: VisitDTO[]; total: number }>(`/api/pets/${petId}/visits?${query}`);
    setVisits(result.data);
    setVisitTotal(result.total);
  }

  async function loadVaccinations(date = vaccinationDateFilter, page = vaccinationPage) {
    const query = new URLSearchParams({ page: String(page), pageSize: "5" });
    if (date) query.set("date", date);
    const result = await apiGet<{ data: VaccDTO[]; total: number }>(`/api/pets/${petId}/vaccinations?${query}`);
    setVaccinations(result.data);
    setVaccinationTotal(result.total);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const petData = await apiGet<PetDTO>(`/api/pets/${petId}`);
      setPet(petData);
      const [catalog, appointmentMeta] = await Promise.all([
        apiGet<VaccineDTO[]>(`/api/vaccines?clinicId=${petData.clinicId}`),
        apiGet<{ vets: VetDTO[] }>(`/api/appointments/meta`),
      ]);
      setVaccinesCatalog(catalog);
      setAvailableVets(appointmentMeta.vets ?? []);
      await Promise.all([loadVisits(), loadVaccinations()]);
      if (canViewVisit || canViewVaccination) {
        const reminders = await apiListPetReminders(petId!, { pageSize: 3 });
        setReminderPreview(reminders.data);
      } else {
        setReminderPreview([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshVisits() { await loadVisits(); }
  async function refreshVaccinations() { await loadVaccinations(); }

  useEffect(() => {
    if (!petId || !Number.isFinite(petId)) return;
    loadAll().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  useEffect(() => { if (petId && pet) void loadVisits(visitDateFilter, visitPage).catch(console.error); }, [visitDateFilter, visitPage]);
  useEffect(() => { if (petId && pet) void loadVaccinations(vaccinationDateFilter, vaccinationPage).catch(console.error); }, [vaccinationDateFilter, vaccinationPage]);

  const requestedVisitId = Number(searchParams.get("visitId"));
  const requestedVaccinationId = Number(searchParams.get("vaccinationId"));

  useEffect(() => {
    if (!petId || !canViewVisit || !Number.isFinite(requestedVisitId) || requestedVisitId <= 0) return;
    setActiveTab("history");
    apiGet<VisitDTO[]>(`/api/pets/${petId}/visits?visitId=${requestedVisitId}`)
      .then((rows) => setSelectedVisit(rows[0] ?? null))
      .catch(console.error);
  }, [canViewVisit, petId, requestedVisitId]);

  useEffect(() => {
    if (loading || !petId || !canViewVaccination || !Number.isFinite(requestedVaccinationId) || requestedVaccinationId <= 0) return;
    setActiveTab("vaccines");
    setHighlightedVaccinationId(requestedVaccinationId);
    apiGet<VaccDTO[]>(`/api/pets/${petId}/vaccinations?vaccinationId=${requestedVaccinationId}`)
      .then((rows) => {
        const target = rows[0];
        if (target) setVaccinations((current) => current.some((item) => item.id === target.id) ? current : [target, ...current]);
      })
      .catch(console.error);
  }, [canViewVaccination, loading, petId, requestedVaccinationId]);

  async function deleteTemporaryAttachment(
    form: AttachmentUploadDraft = attachForm
  ) {
    if (!form.storageRef) {
      resetAttachmentForm(form);
      return true;
    }

    setDraftAttachmentBusy(true);

    try {
      await apiDelete("/api/uploads/object", { storageRef: form.storageRef });
      resetAttachmentForm(form);
      return true;
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo eliminar el archivo",
        description:
          error instanceof Error
            ? error.message
            : "Intenta nuevamente en unos segundos.",
      });
      setAlertOpen(true);
      return false;
    } finally {
      setDraftAttachmentBusy(false);
    }
  }

  async function closeAttachmentModal() {
    if (!attachForm.storageRef) {
      finalizeAttachmentModalClose(attachForm);
      return;
    }

    const deleted = await deleteTemporaryAttachment(attachForm);

    if (deleted) {
      setAttachModal({ open: false, visitId: null });
    }
  }

  function handleAttachmentSelected(file: LocalFile | null) {
    if (!file) return;
    const previousForm = attachForm;
    revokePreviewUrl(previousForm.previewUrl);
    setAttachForm({ file, fileName: file.fileName, displayName: deriveAttachmentDisplayName(file.fileName), fileType: file.fileType, storageRef: "", previewUrl: file.previewUrl });
  }

  async function handleDeleteSavedAttachment(
    visitId: number,
    attachment: AttachmentDTO
  ) {
    setDeletingAttachmentId(attachment.id);

    try {
      await apiDelete(`/api/visits/${visitId}/attachments/${attachment.id}`);
      await refreshVisits();
      setAlert({
        variant: "success",
        title: "Adjunto eliminado correctamente.",
      });
      setAlertOpen(true);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo eliminar el adjunto",
        description:
          error instanceof Error
            ? error.message
            : "Intenta nuevamente en unos segundos.",
      });
      setAlertOpen(true);
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  if (loading || !pet) {
    return <PatientDetailSkeleton />;
  }

  const latestVisit = visits[0] ?? null;
  const nextReview = visits
    .filter((visit) => visit.nextReviewAt && new Date(visit.nextReviewAt) >= new Date())
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())[0] ?? null;
  const recentActivity = [
    ...visits.slice(0, 3).map((visit) => ({
      id: `visit-${visit.id}`,
      label: "Visita clínica",
      date: visit.visitAt,
      detail: visit.diagnosis || visit.anamnesis || "Atención registrada",
      icon: Stethoscope,
    })),
    ...vaccinations.slice(0, 2).map((vaccination) => ({
      id: `vaccination-${vaccination.id}`,
      label: "Vacunación",
      date: vaccination.appliedAt,
      detail: vaccination.vaccine?.name ?? vaccination.vaccineName ?? "Vacuna registrada",
      icon: Syringe,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
  const recentDocuments = visits.flatMap((visit) =>
    (visit.attachments ?? []).map((attachment: AttachmentDTO) => ({ ...attachment, visitId: visit.id, visitAt: visit.visitAt }))
  ).slice(0, 3);

  async function handleCreateVisit() {
    const parsed = ClinicalVisitCreateSchema.safeParse({
      ...visitForm,
      visitAt: visitForm.visitAt ? new Date(visitForm.visitAt) : undefined,
      weightKg: visitForm.weightKg === "" ? undefined : Number(visitForm.weightKg),
      temperatureC: visitForm.temperatureC === "" ? undefined : Number(visitForm.temperatureC),
    });

    if (!parsed.success) {
      window.alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    try {
      await apiPost(`/api/pets/${petId}/visits`, parsed.data);
      setVisitModalOpen(false);
      setVisitForm({
        visitAt: format(new Date(), "yyyy-MM-dd"),
        vetId: "",
        diagnosis: "",
        treatment: "",
        notes: "",
        weightKg: "",
        temperatureC: "",
      });
      await refreshVisits();
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo registrar la visita",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
      setAlertOpen(true);
      return;
    }
  }

  async function handleCreateVaccination() {
    const parsed = VaccinationRecordCreateSchema.safeParse({
      ...vaccineForm,
      vaccineId: Number(vaccineForm.vaccineId),
      appliedAt: vaccineForm.appliedAt ? new Date(vaccineForm.appliedAt) : undefined,
      nextDueAt: vaccineForm.nextDueAt ? new Date(vaccineForm.nextDueAt) : undefined,
    });

    if (!parsed.success) {
      window.alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    try {
      await apiPost(`/api/pets/${petId}/vaccinations`, parsed.data);
      setVaccineModalOpen(false);
      setVaccineForm({
        vaccineId: "",
        vaccineName: "",
        appliedAt: format(new Date(), "yyyy-MM-dd"),
        nextDueAt: "",
        batchNumber: "",
        notes: "",
      });
      await refreshVaccinations();
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo registrar la vacuna",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
      setAlertOpen(true);
      return;
    }
  }

  async function handleCreateAttachment() {
    if (attachmentSaving) return;
    if (!attachModal.visitId && !petId) return;

    if (!attachForm.file) {
      setAlert({ variant: "destructive", title: "Selecciona un archivo", description: "Debes elegir un archivo antes de guardarlo." });
      setAlertOpen(true);
      return;
    }

    setAttachmentSaving(true);
    const uploaded = await uploadFileToStorage(attachForm.file, UPLOAD_SCOPES.medicalAttachment, attachModal.visitId, petId).catch((error) => {
      setAlert({ variant: "destructive", title: "No se pudo subir el archivo", description: error instanceof Error ? error.message : "Intenta nuevamente." });
      setAlertOpen(true);
      return null;
    });
    if (!uploaded) { setAttachmentSaving(false); return; }
    const parsed = MedicalAttachmentCreateSchema.safeParse({
      fileName: uploaded.originalFilename,
      displayName: getAttachmentDisplayName(attachForm.displayName, uploaded.originalFilename),
      originalFilename: uploaded.originalFilename,
      fileType: uploaded.fileType,
      fileSizeBytes: uploaded.fileSizeBytes,
      storageRef: uploaded.storageRef,
    });
    if (!parsed.success) {
      await apiDelete("/api/uploads/object", { storageRef: uploaded.storageRef }).catch(() => undefined);
      window.alert(parsed.error.issues.map((i) => i.message).join("\n"));
      setAttachmentSaving(false);
      return;
    }

    try {
      await apiPost(
        attachModal.visitId ? `/api/visits/${attachModal.visitId}/attachments` : `/api/pets/${petId}/attachments`,
        attachModal.visitId ? parsed.data : { ...parsed.data, visitId: undefined },
      );
      finalizeAttachmentModalClose(attachForm);
      await refreshVisits();
      setAlert({
        variant: "success",
        title: "Adjunto agregado correctamente.",
      });
      setAlertOpen(true);
    } catch (error) {
      await apiDelete("/api/uploads/object", { storageRef: uploaded.storageRef }).catch(() => undefined);
      setAlert({
        variant: "destructive",
        title: "No se pudo guardar el adjunto",
        description:
          error instanceof Error
            ? error.message
            : "Intenta nuevamente en unos segundos.",
      });
      setAlertOpen(true);
    } finally {
      setAttachmentSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="app-page-hero flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BackButton />
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span>Pacientes</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span className="truncate text-foreground">{pet.name}</span>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="app-kicker mb-2 inline-flex border-0">Expediente del paciente</p>
            <h1 className="app-heading text-3xl sm:text-4xl">{pet.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {pet.species} • {pet.breed || "Sin raza especificada"}
            </p>
          </div>
          <div className="self-start sm:self-end">
            <div className="flex flex-wrap gap-2">
              {currentUser?.access.actions.pets.viewClinicalHistory ? (
                <Button size="sm" variant="outline" onClick={() => setClinicalReportOpen(true)}>
                  <FileText className="mr-1 h-4 w-4" />
                  Informe clínico
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setVisitModalOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Nueva visita
              </Button>
              {currentUser?.access.actions.vaccines.create ? (
                <Button size="sm" variant="outline" onClick={() => setVaccineModalOpen(true)}>
                  <Syringe className="mr-1 h-4 w-4" /> Vacuna
                </Button>
              ) : null}
              {currentUser?.access.actions.visits.attachDocuments ? (
                <Button size="sm" variant="outline" onClick={() => setActiveTab("documents")}>
                  <Paperclip className="mr-1 h-4 w-4" />
                  Documento
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" aria-label="Más acciones">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEditPatient ? <DropdownMenuItem onSelect={openPatientEdit}><Pencil className="h-4 w-4" />Editar paciente</DropdownMenuItem> : null}
                  <DropdownMenuItem onSelect={() => setActiveTab("summary")}><ClipboardList className="h-4 w-4" />Ver resumen</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {/* Pet Info */}
        <section className="app-panel-strong overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-border/70 bg-muted/35 p-5 md:flex-row md:items-center">
            <div className="app-stat-icon h-16 w-16 shrink-0 text-3xl">
              {speciesEmoji[pet.species] || "🐾"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{pet.name}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{pet.species} • {pet.breed || "Sin raza especificada"}</p>
            </div>
            {client ? (
              <div className="md:ml-auto md:border-l md:border-border/70 md:pl-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Propietario</p>
                <p className="mt-1 font-semibold text-foreground">{client.fullName}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" /> {client.phone || "Sin teléfono"}</p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_1fr_1fr]">
            <div className="grid grid-cols-2 gap-3">
              <div className="app-panel-muted p-3 text-center">
                <Calendar className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Edad</p>
                <p className="font-semibold text-foreground">
                  {calculateAge(pet.birthDate)}
                </p>
              </div>
              <div className="app-panel-muted p-3 text-center">
                <Weight className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Peso</p>
                <p className="font-semibold text-foreground">
                  {pet.weightKg ? `${pet.weightKg} kg` : "-"}
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border/70 pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sexo:</span>
                <Badge variant="secondary">
                  {sexLabel[pet.sex] ?? pet.sex}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Color:</span>
                <span className="font-medium text-foreground">
                  {pet.color || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Microchip:</span>
                <span className="font-medium text-foreground">
                  {pet.microchip || "-"}
                </span>
              </div>
            </div>

            {!!pet.notes && (
              <div className="border-t border-border/70 pt-4">
                <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" /> Notas
                </p>
                <p className="text-sm text-foreground">{pet.notes}</p>
              </div>
            )}

            {pet.allergies || pet.chronicConditions || pet.clinicalWarnings ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-amber-950">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <AlertTriangle className="h-4 w-4" /> Alertas clínicas
                </p>
                <div className="space-y-2 text-sm">
                  {pet.allergies ? (
                    <p>
                      <span className="font-semibold">Alergias:</span>{" "}
                      {pet.allergies}
                    </p>
                  ) : null}
                  {pet.chronicConditions ? (
                    <p>
                      <span className="font-semibold">
                        Condiciones crónicas:
                      </span>{" "}
                      {pet.chronicConditions}
                    </p>
                  ) : null}
                  {pet.clinicalWarnings ? (
                    <p>
                      <span className="font-semibold">Advertencias:</span>{" "}
                      {pet.clinicalWarnings}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {pet.clinicalHistory || pet.currentMedications ? (
              <div className="rounded-lg border border-border/70 bg-background p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Información clínica
                </p>
                <div className="space-y-2 text-sm text-foreground">
                  {pet.clinicalHistory ? (
                    <p>
                      <span className="font-semibold">Antecedentes:</span>{" "}
                      {pet.clinicalHistory}
                    </p>
                  ) : null}
                  {pet.currentMedications ? (
                    <p>
                      <span className="font-semibold">
                        Medicamentos actuales:
                      </span>{" "}
                      {pet.currentMedications}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Tabs */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="app-panel-strong overflow-x-auto p-2">
              <TabsList className="min-w-max justify-start">
                <TabsTrigger value="summary">Resumen</TabsTrigger>
                <TabsTrigger value="history">Historial Clínico</TabsTrigger>
                <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                {canViewInvoices ? <TabsTrigger value="billing">Facturación</TabsTrigger> : null}
                {canViewVisit || canViewVaccination ? <TabsTrigger value="reminders">Recordatorios</TabsTrigger> : null}
              </TabsList>
            </div>

            <TabsContent value="summary">
              <div className="app-panel-strong space-y-5 p-5 sm:p-6">
                <div>
                  <p className="app-kicker">Vista general</p>
                  <h2 className="app-heading text-2xl">Resumen del paciente</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Datos clínicos registrados y actividad reciente.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <SummaryMetric icon={Stethoscope} label="Última visita" value={latestVisit ? formatClinicalDate(latestVisit.visitAt) : "Sin visitas"} detail={latestVisit?.diagnosis || "No hay diagnóstico registrado"} />
                  <SummaryMetric icon={Clock3} label="Próximo control" value={nextReview ? formatClinicalDate(nextReview.nextReviewAt) : "No registrado"} detail={nextReview ? "Fecha indicada en visita clínica" : "Añádelo al registrar una visita"} />
                  <SummaryMetric icon={Syringe} label="Vacunas registradas" value={String(vaccinationTotal)} detail={vaccinationTotal ? "Consulta el historial de vacunas" : "No hay vacunas registradas"} />
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                  <section className="rounded-lg border border-border/70 bg-background p-4">
                    <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-foreground">Actividad reciente</h3><p className="text-xs text-muted-foreground">Últimos eventos disponibles.</p></div><Button variant="ghost" size="sm" onClick={() => setActiveTab("history")}>Ver historial <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
                    {recentActivity.length ? <div className="space-y-3">{recentActivity.map((activity) => { const Icon = activity.icon; return <div key={activity.id} className="flex items-start gap-3"><div className="app-stat-icon h-9 w-9 shrink-0"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-medium text-foreground">{activity.detail}</p><p className="text-xs text-muted-foreground">{activity.label} · {formatClinicalDate(activity.date)}</p></div></div>; })}</div> : <EmptyTabState icon={ClipboardList} title="Sin actividad reciente" description="Las visitas y vacunas aparecerán aquí." />}
                  </section>
                  <section className="rounded-lg border border-border/70 bg-background p-4">
                    <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-foreground">Documentos recientes</h3><p className="text-xs text-muted-foreground">Adjuntos asociados a visitas.</p></div><Button variant="ghost" size="sm" onClick={() => setActiveTab("history")}>Ver visitas <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
                    {recentDocuments.length ? <div className="space-y-2">{recentDocuments.map((document) => <DocumentAttachment key={document.id} fileName={document.fileName} displayName={document.displayName} originalFilename={document.originalFilename} fileType={document.fileType} size={document.fileSizeBytes} url={document.url} downloadUrl={document.downloadUrl} />)}</div> : <EmptyTabState icon={FileText} title="Sin documentos recientes" description="Los documentos se muestran junto a su visita." />}
                  </section>
                  <section className="rounded-lg border border-border/70 bg-background p-4">
                    <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-foreground">Próximos recordatorios</h3><p className="text-xs text-muted-foreground">Controles y vacunas dentro de la regla vigente.</p></div><Button variant="ghost" size="sm" onClick={() => setActiveTab("reminders")}>Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
                    {reminderPreview.length ? <div className="space-y-3">{reminderPreview.map((reminder) => <Link key={reminder.id} href={reminder.sourceHref} className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/40"><div className="app-stat-icon h-8 w-8 shrink-0"><CalendarClock className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{reminder.description}</p><p className="text-xs text-muted-foreground">{formatClinicalDate(reminder.dueDate)}</p></div></Link>)}</div> : <EmptyTabState icon={CalendarClock} title="Sin próximos recordatorios" description="No hay controles o vacunas dentro de la regla vigente." />}
                  </section>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <PatientDocumentsTab petId={pet.id} visits={visits} canDelete={Boolean(currentUser?.access.actions.visits.attachDocuments)} onDocumentsChanged={refreshVisits} />
            </TabsContent>

            {canViewInvoices ? <TabsContent value="billing">
              <PatientInvoicesTab petId={pet.id} currency={currentUser?.clinicCurrency ?? "DOP"} />
            </TabsContent> : null}

            {canViewVisit || canViewVaccination ? <TabsContent value="reminders">
              <PatientRemindersTab petId={pet.id} />
            </TabsContent> : null}

            <TabsContent value="history">
              <div className="app-panel-strong overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="app-kicker">Seguimiento clínico</p>
                    <h2 className="app-heading text-2xl">Historial clínico</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Consulta la evolución del paciente y abre cada visita cuando necesites más detalle.</p>
                  </div>
                  <FormField
                    // label="Fecha"
                    name="visitDateFilter"
                    type="date"
                    value={visitDateFilter}
                    onChange={(event) => {
                      setVisitDateFilter(String(event.target.value));
                      setVisitPage(0);
                    }}
                  />
                </div>
                {visits.length === 0 ? (
                  <div className="p-12 text-center">
                    <Stethoscope className="mx-auto mb-4 h-12 w-12 text-muted-foreground/35" />
                    <p className="font-medium text-foreground">No hay visitas clínicas</p>
                    <p className="mt-1 text-sm text-muted-foreground">Las visitas registradas aparecerán en esta línea de tiempo.</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-4 sm:p-6">
                    {visits.map((v) => (
                      <article key={v.id} className="relative grid grid-cols-[76px_minmax(0,1fr)] gap-3 sm:grid-cols-[116px_minmax(0,1fr)] sm:gap-5">
                        <div className="pt-2 text-right"><p className="text-sm font-semibold text-foreground">{formatClinicalDate(v.visitAt)}</p><p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Visita</p></div>
                        <div className="relative pb-5 pl-6 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-px before:bg-border/80 last:before:bottom-1">
                          <span className="absolute left-[-5px] top-2 z-10 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary ring-1 ring-primary/30" aria-hidden="true" />
                          <div className="rounded-lg border border-border/70 bg-background p-4 transition-colors hover:border-primary/30 hover:bg-muted/20 sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Atención clínica</p><h3 className="mt-1 truncate text-base font-semibold text-foreground">{v.diagnosis || v.anamnesis || "Visita clínica"}</h3>{v.vet?.name ? <p className="mt-1 text-sm text-muted-foreground">Veterinario: {v.vet.name}</p> : null}</div>
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                {canViewVisit ? <Button size="sm" variant="outline" onClick={() => setSelectedVisit(v)}><Eye className="mr-1 h-4 w-4" />Ver detalle</Button> : null}
                                {canEditVisit ? <Button size="sm" variant="outline" onClick={() => setEditingVisit(v)}><Pencil className="mr-1 h-4 w-4" />Editar</Button> : null}
                                <Button size="sm" variant="outline" onClick={() => setAttachModal({ open: true, visitId: v.id })}><Paperclip className="mr-1 h-4 w-4" />Adjuntar</Button>
                              </div>
                            </div>
                            {v.treatment || v.notes ? <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-sm text-muted-foreground">{v.treatment ? <p><span className="font-medium text-foreground">Tratamiento:</span> {v.treatment}</p> : null}{v.notes ? <p><span className="font-medium text-foreground">Notas:</span> {v.notes}</p> : null}</div> : null}
                            {(v.weightKg != null || v.temperatureC != null || v.heartRateBpm != null || v.respiratoryRatePpm != null || v.nextReviewAt) ? <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">{v.weightKg != null ? <span>Peso: {v.weightKg} kg</span> : null}{v.temperatureC != null ? <span>Temperatura: {v.temperatureC} °C</span> : null}{v.heartRateBpm != null ? <span>FC: {v.heartRateBpm} lpm</span> : null}{v.respiratoryRatePpm != null ? <span>FR: {v.respiratoryRatePpm} rpm</span> : null}{v.nextReviewAt ? <span>Control: {formatClinicalDate(v.nextReviewAt)}</span> : null}</div> : null}
                              {Array.isArray(v.attachments) && v.attachments.length > 0 ? <div className="mt-4 border-t border-border/60 pt-3"><Button type="button" variant="ghost" size="sm" className="px-1" aria-expanded={expandedAttachments.has(v.id)} aria-controls={`visit-documents-${v.id}`} onClick={() => setExpandedAttachments((current) => { const next = new Set(current); if (next.has(v.id)) next.delete(v.id); else next.add(v.id); return next; })}><ChevronDown className={`mr-1 h-4 w-4 transition-transform ${expandedAttachments.has(v.id) ? "rotate-180" : ""}`} aria-hidden="true" />Documentos ({v.attachments.length})</Button>{expandedAttachments.has(v.id) ? <div id={`visit-documents-${v.id}`} className="mt-2 space-y-2">{v.attachments.map((attachment: AttachmentDTO) => <DocumentAttachment key={attachment.id} fileName={attachment.fileName} displayName={attachment.displayName} originalFilename={attachment.originalFilename} fileType={attachment.fileType} size={attachment.fileSizeBytes} url={attachment.url} downloadUrl={attachment.downloadUrl} deleting={deletingAttachmentId === attachment.id} onDelete={() => setAttachmentToDelete({ visitId: v.id, attachment })} />)}</div> : null}</div> : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {visitTotal > 0 ? (
                  <DataTablePagination
                    page={visitPage}
                    pageSize={5}
                    total={visitTotal}
                    onPageChange={setVisitPage}
                  />
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="vaccines">
              <div className="app-panel-strong overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
                  <div>
                    <p className="app-kicker">Prevención clínica</p>
                    <h2 className="app-heading text-2xl">Historial de vacunas</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Consulta las vacunas aplicadas y sus próximas dosis.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <FormField
                      name="vaccinationDateFilter"
                      type="date"
                      value={vaccinationDateFilter}
                      onChange={(event) => {
                        setVaccinationDateFilter(String(event.target.value));
                        setVaccinationPage(0);
                      }}
                    />
                    {currentUser?.access.actions.vaccines.create ? (
                      <Button type="button" onClick={() => setVaccineModalOpen(true)}>
                        <Plus className="mr-1 h-4 w-4" /> Registrar vacuna
                      </Button>
                    ) : null}
                  </div>
                </div>
                {vaccinations.length === 0 ? (
                  <div className="p-12 text-center">
                    <Syringe className="mx-auto mb-4 h-12 w-12 text-muted-foreground/35" />
                    <p className="font-medium text-foreground">No hay vacunas registradas</p>
                    <p className="mt-1 text-sm text-muted-foreground">Las vacunas aplicadas aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[720px]">
                      <TableHeader>
                        <TableRow className="bg-muted/35 hover:bg-muted/35">
                          <TableHead>Vacuna</TableHead>
                          <TableHead>Fecha de aplicación</TableHead>
                          <TableHead>Próxima dosis</TableHead>
                          <TableHead>Información adicional</TableHead>
                          <TableHead className="w-px text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                    {vaccinations.map((r: any) => (
                      <TableRow
                        key={r.id}
                        className={`transition-colors ${highlightedVaccinationId === r.id ? "bg-primary/10" : ""}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="app-stat-icon h-9 w-9 shrink-0 rounded-lg">
                              <Syringe className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-foreground">
                              {r.vaccine?.name ?? `Vacuna #${r.vaccineId}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatClinicalDate(r.appliedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.nextDueAt ? (
                            <span className="font-medium text-primary">{formatClinicalDate(r.nextDueAt)}</span>
                          ) : <span className="text-muted-foreground">No registrada</span>}
                        </TableCell>
                        <TableCell>
                          {r.batchNumber || r.notes ? (
                            <div className="max-w-[240px] space-y-0.5 text-xs text-muted-foreground">
                              {r.batchNumber ? <p><span className="font-medium text-foreground">Lote:</span> {r.batchNumber}</p> : null}
                              {r.notes ? <p className="truncate" title={r.notes}><span className="font-medium text-foreground">Notas:</span> {r.notes}</p> : null}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingVaccination(r)}
                          >
                            <Pencil className="mr-1 h-4 w-4" /> Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {vaccinationTotal > 0 ? (
                  <DataTablePagination
                    page={vaccinationPage}
                    pageSize={5}
                    total={vaccinationTotal}
                    onPageChange={setVaccinationPage}
                  />
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {currentUser?.access.actions.pets.viewClinicalHistory ? (
        <ClinicalReportDialog
          open={clinicalReportOpen}
          onClose={() => setClinicalReportOpen(false)}
          pets={[pet]}
          clients={client ? [client] : []}
          initialPetIds={[pet.id]}
        />
      ) : null}

      <Modal
        open={patientEditOpen}
        onClose={setPatientEditOpen}
        title="Editar paciente"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPatientEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={savingPatient}
              onClick={() => void savePatientEdit()}
            >
              {savingPatient ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Nombre", "text", true],
              ["species", "Especie", "select", true],
              ["sex", "Sexo", "select", false],
              ["breed", "Raza", "text", false],
              ["birthDate", "Fecha de nacimiento", "date", false],
              ["weightKg", "Peso (kg)", "number", false],
              ["color", "Color / pelaje", "text", false],
              ["microchip", "Microchip", "text", false],
            ] as const
          ).map(([name, label, type, required]) => (
            <FormField
              key={name}
              label={label}
              name={name}
              type={type}
              options={
                name === "species"
                  ? [
                      { value: "DOG", label: "Perro" },
                      { value: "CAT", label: "Gato" },
                      { value: "BIRD", label: "Ave" },
                      { value: "RABBIT", label: "Conejo" },
                      { value: "OTHER", label: "Otro" },
                    ]
                  : name === "sex"
                    ? [
                        { value: "MALE", label: "Macho" },
                        { value: "FEMALE", label: "Hembra" },
                        { value: "UNKNOWN", label: "Desconocido" },
                      ]
                    : undefined
              }
              value={patientEditForm[name] ?? ""}
              required={required}
              error={patientEditErrors[name]}
              onChange={(event) =>
                { setPatientEditForm((current) => ({ ...current, [name]: String(event.target.value) })); setPatientEditErrors((current) => ({ ...current, [name]: "" })); }
              }
            />
          ))}
            <p className="text-sm font-semibold text-foreground sm:col-span-2">
              Información clínica permanente
            </p>
            <FormField
              label="Alergias"
              name="allergies"
              type="textarea"
              value={patientEditForm.allergies ?? ""}
              onChange={(event) =>
                setPatientEditForm((current) => ({
                  ...current,
                  allergies: String(event.target.value),
                }))
              }
            />
            <FormField
              label="Condiciones / enfermedades crónicas"
              name="chronicConditions"
              type="textarea"
              value={patientEditForm.chronicConditions ?? ""}
              onChange={(event) =>
                setPatientEditForm((current) => ({
                  ...current,
                  chronicConditions: String(event.target.value),
                }))
              }
            />
            <FormField
              label="Antecedentes clínicos importantes"
              name="clinicalHistory"
              type="textarea"
              value={patientEditForm.clinicalHistory ?? ""}
              onChange={(event) =>
                setPatientEditForm((current) => ({
                  ...current,
                  clinicalHistory: String(event.target.value),
                }))
              }
            />
            <FormField
              label="Medicamentos actuales"
              name="currentMedications"
              type="textarea"
              value={patientEditForm.currentMedications ?? ""}
              onChange={(event) =>
                setPatientEditForm((current) => ({
                  ...current,
                  currentMedications: String(event.target.value),
                }))
              }
            />
            <FormField
              label="Advertencias clínicas"
              name="clinicalWarnings"
              type="textarea"
              value={patientEditForm.clinicalWarnings ?? ""}
              onChange={(event) =>
                setPatientEditForm((current) => ({
                  ...current,
                  clinicalWarnings: String(event.target.value),
                }))
              }
              className="sm:col-span-2"
            />
          <FormField
            label="Notas"
            name="notes"
            type="textarea"
            value={patientEditForm.notes ?? ""}
            onChange={(event) =>
              setPatientEditForm((current) => ({
                ...current,
                notes: String(event.target.value),
              }))
            }
            className="sm:col-span-2"
          />
        </div>
      </Modal>

      <Modal
        open={!!selectedVisit}
        onClose={(open) => {
          if (!open) setSelectedVisit(null);
        }}
        title="Detalle de visita clínica"
        size="lg"
        footer={
          <div className="flex gap-3">
            {canEditVisit && selectedVisit ? (
              <Button
                onClick={() => {
                  setEditingVisit(selectedVisit);
                  setSelectedVisit(null);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSelectedVisit(null)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedVisit ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Detail
                label="Fecha"
                value={formatClinicalDate(selectedVisit.visitAt)}
              />
              <Detail
                label="Veterinario"
                value={selectedVisit.vet?.name ?? "No registrado"}
              />
              <Detail
                label="Peso"
                value={
                  selectedVisit.weightKg == null
                    ? "-"
                    : `${selectedVisit.weightKg} kg`
                }
              />
              <Detail
                label="Temperatura"
                value={
                  selectedVisit.temperatureC == null
                    ? "-"
                    : `${selectedVisit.temperatureC} °C`
                }
              />
              <Detail
                label="Frecuencia cardíaca"
                value={
                  selectedVisit.heartRateBpm == null
                    ? "-"
                    : `${selectedVisit.heartRateBpm} lpm`
                }
              />
              <Detail
                label="Frecuencia respiratoria"
                value={
                  selectedVisit.respiratoryRatePpm == null
                    ? "-"
                    : `${selectedVisit.respiratoryRatePpm} rpm`
                }
              />
            </div>
            {[
              ["Motivo", selectedVisit.appointment?.reason],
              ["Anamnesis", selectedVisit.anamnesis],
              ["Diagnóstico", selectedVisit.diagnosis],
              ["Tratamiento", selectedVisit.treatment],
              ["Plan / recomendaciones", selectedVisit.carePlan],
              ["Notas", selectedVisit.notes],
              [
                "Próximo control",
                selectedVisit.nextReviewAt
                  ? formatClinicalDate(selectedVisit.nextReviewAt)
                  : null,
              ],
            ].map(([label, value]) =>
              value ? (
                <div key={label}>
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {value}
                  </p>
                </div>
              ) : null,
            )}
            {selectedVisit.attachments?.length ? (
              <div>
                <p className="mb-2 font-semibold text-foreground">Adjuntos</p>
                <div className="space-y-2">
                  {selectedVisit.attachments.map(
                    (attachment: AttachmentDTO) => (
                      <DocumentAttachment
                        key={attachment.id}
                        fileName={attachment.fileName}
                        displayName={attachment.displayName}
                        originalFilename={attachment.originalFilename}
                        fileType={attachment.fileType}
                        size={attachment.fileSizeBytes}
                        url={attachment.url}
                        downloadUrl={attachment.downloadUrl}
                      />
                    ),
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Sin adjuntos.</p>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Modal: Nueva Visita */}
      <Modal
        open={visitModalOpen || Boolean(editingVisit)}
        onClose={() => {
          setVisitModalOpen(false);
          setEditingVisit(null);
        }}
        title={editingVisit ? "Editar Visita Clínica" : "Nueva Visita Clínica"}
        size="lg"
        // footer={
        //   <div className="flex gap-3">
        //     <Button
        //       variant="outline"
        //       onClick={() => {
        //         setVisitModalOpen(false);
        //         setEditingVisit(null);
        //       }}
        //     >
        //       Cancelar
        //     </Button>
        //   </div>
        // }
      >
        <ClinicalVisitForm
          petId={petId!}
          visitId={editingVisit?.id}
          vets={availableVets}
          currentUserRole={currentUser?.roleKey}
          currentUserId={currentUser?.userId}
          initialValues={
            editingVisit
              ? {
                  visitAt: dateOnly(editingVisit.visitAt),
                  vetId: editingVisit.vetId ?? "",
                  diagnosis: editingVisit.diagnosis ?? "",
                  treatment: editingVisit.treatment ?? "",
                  notes: editingVisit.notes ?? "",
                  anamnesis: editingVisit.anamnesis ?? "",
                  carePlan: editingVisit.carePlan ?? "",
                  weightKg: editingVisit.weightKg ?? "",
                  temperatureC: editingVisit.temperatureC ?? "",
                  heartRateBpm: editingVisit.heartRateBpm ?? "",
                  respiratoryRatePpm: editingVisit.respiratoryRatePpm ?? "",
                  nextReviewAt: editingVisit.nextReviewAt
                    ? dateOnly(editingVisit.nextReviewAt)
                    : "",
                }
              : visitForm
          }
          onCancel={() => {
            setVisitModalOpen(false);
            setEditingVisit(null);
          }}
          onSaved={async () => {
            setVisitModalOpen(false);
            setEditingVisit(null);
            await refreshVisits();
          }}
        />
      </Modal>

      {/* Modal: Nueva Vacuna */}
      <Modal
        open={vaccineModalOpen || Boolean(editingVaccination)}
        onClose={() => {
          setVaccineModalOpen(false);
          setEditingVaccination(null);
        }}
        title={editingVaccination ? "Editar Vacuna" : "Nueva Vacuna"}
        // footer={
        //   <div className="flex gap-3">
        //     <Button
        //       variant="outline"
        //       onClick={() => {
        //         setVaccineModalOpen(false);
        //         setEditingVaccination(null);
        //       }}
        //     >
        //       Cancelar
        //     </Button>
        //   </div>
        // }
      >
        <VaccinationForm
          petId={petId!}
          vaccinationId={editingVaccination?.id}
          initialValues={
            editingVaccination
              ? {
                  vaccineId: editingVaccination.vaccineId
                    ? String(editingVaccination.vaccineId)
                    : "",
                  vaccineName: editingVaccination.vaccineName ?? "",
                  appliedAt: dateOnly(editingVaccination.appliedAt),
                  nextDueAt: dateOnly(editingVaccination.nextDueAt),
                  batchNumber: editingVaccination.batchNumber ?? "",
                  notes: editingVaccination.notes ?? "",
                }
              : undefined
          }
          vaccines={vaccinesCatalog}
          onCancel={() => {
            setVaccineModalOpen(false);
            setEditingVaccination(null);
          }}
          onSaved={async () => {
            setVaccineModalOpen(false);
            setEditingVaccination(null);
            await refreshVaccinations();
          }}
        />
      </Modal>

      {/* Modal: Adjuntar archivo */}
      <AttachmentUploadModal
        open={attachModal.open}
        onClose={() => void closeAttachmentModal()}
        title={attachModal.visitId ? "Adjuntar archivo a la visita" : "Adjuntar documento al expediente"}
        // description="Selecciona un archivo y define el nombre que verá el equipo clínico."
        showNameField
        displayName={attachForm.displayName}
        file={attachForm.file ?? null}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        disabled={draftAttachmentBusy}
        saving={attachmentSaving}
        onDisplayNameChange={(displayName) => setAttachForm((current) => ({ ...current, displayName }))}
        onFileSelected={handleAttachmentSelected}
        onError={(message) => {
          setAlert({ variant: "destructive", title: "No se pudo seleccionar el archivo", description: message });
          setAlertOpen(true);
        }}
        onSave={() => void handleCreateAttachment()}
      />

      {attachmentToDelete ? (
        <ModalDelete
          open
          title="Eliminar adjunto"
          itemName={attachmentToDelete.attachment.fileName}
          loading={deletingAttachmentId === attachmentToDelete.attachment.id}
          onOpenChange={(open) => {
            if (!open && !deletingAttachmentId) setAttachmentToDelete(null);
          }}
          onConfirm={async () => {
            await handleDeleteSavedAttachment(
              attachmentToDelete.visitId,
              attachmentToDelete.attachment,
            );
            setAttachmentToDelete(null);
          }}
        />
      ) : null}

      <AppAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        variant={alertState.variant}
        title={alertState.title}
        description={alertState.description}
      />
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value, detail }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
        </div>
        <div className="app-stat-icon h-9 w-9"><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyTabState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-8 text-center"><Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" /><p className="font-medium text-foreground">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium text-foreground">{value}</p></div>; }

export default function PatientDetail() {
  return (
    <Suspense fallback={<PatientDetailSkeleton />}>
      <PatientDetailContent />
    </Suspense>
  );
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando paciente">
      <div className="app-panel-strong p-5 sm:p-6">
        <div className="flex items-center gap-4"><LoadingSkeleton className="h-10 w-10" /><div className="space-y-2"><LoadingSkeleton className="h-8 w-64" /><LoadingSkeleton className="h-4 w-40" /></div></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <LoadingSkeleton className="h-72 w-full" />
        <div className="space-y-6"><LoadingSkeleton className="h-56 w-full" /><LoadingSkeleton className="h-72 w-full" /></div>
      </div>
    </div>
  );
}
