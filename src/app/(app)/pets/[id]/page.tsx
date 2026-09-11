"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import SignedFileUploader, { UPLOAD_SCOPES, uploadFileToStorage, type LocalFile } from "@/components/shared/SignedFileUploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User as UserIcon,
  Phone,
  Calendar,
  Weight,
  Syringe,
  Stethoscope,
  Plus,
  AlertTriangle,
  Paperclip,
  Trash2,
  Pencil,
  ChevronDown,
  LoaderCircle,
  FileText,
  Eye,
  Info,
} from "lucide-react";
import { format, parseISO, differenceInYears, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "@/components/shared/Modal";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
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
import { PetUpdateSchema } from "@/lib/validators/pet";
import { toast } from "sonner";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import BackButton from "@/components/shared/BackButton";

type PetDTO = any; // si quieres, luego lo tipamos con Prisma types
type VisitDTO = any;
type VaccDTO = any;
type VaccineDTO = any;
type AttachmentDTO = any;
type VetDTO = { id: string; name: string; email: string };
type AttachmentUploadDraft = {
  file?: LocalFile;
  fileName: string;
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
  const [vaccineModalOpen, setVaccineModalOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<VaccDTO | null>(null);
  const [visitDateFilter, setVisitDateFilter] = useState("");
  const [vaccinationDateFilter, setVaccinationDateFilter] = useState("");
  const [visitPage, setVisitPage] = useState(0);
  const [vaccinationPage, setVaccinationPage] = useState(0);
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
    fileType: "",
    storageRef: "",
    previewUrl: "",
  });
  const [draftAttachmentBusy, setDraftAttachmentBusy] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [clinicalReportOpen, setClinicalReportOpen] = useState(false);

  const emptyAttachmentForm: AttachmentUploadDraft = {
    fileName: "",
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
  const canEditVisit = !!currentUser?.access.actions.visits.edit;

  function openPatientEdit() {
    if (!pet || !canEditPatient) return;
    setPatientEditForm({ name: pet.name, species: pet.species, sex: pet.sex, breed: pet.breed ?? "", birthDate: dateOnly(pet.birthDate), weightKg: pet.weightKg == null ? "" : String(pet.weightKg), color: pet.color ?? "", microchip: pet.microchip ?? "", notes: pet.notes ?? "" });
    setPatientEditOpen(true);
  }

  async function savePatientEdit() {
    if (!pet) return;
    const parsed = PetUpdateSchema.safeParse({ ...patientEditForm, weightKg: patientEditForm.weightKg === "" ? undefined : Number(patientEditForm.weightKg), birthDate: patientEditForm.birthDate || undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos del paciente."); return; }
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

  function handleAttachmentSelected(file: LocalFile) {
    const previousForm = attachForm;
    revokePreviewUrl(previousForm.previewUrl);
    setAttachForm({ file, fileName: file.fileName, fileType: file.fileType, storageRef: "", previewUrl: file.previewUrl });
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
    if (!attachModal.visitId) return;

    if (!attachForm.file) {
      setAlert({ variant: "destructive", title: "Selecciona un archivo", description: "Debes elegir un archivo antes de guardarlo." });
      setAlertOpen(true);
      return;
    }

    setAttachmentSaving(true);
    const uploaded = await uploadFileToStorage(attachForm.file, UPLOAD_SCOPES.medicalAttachment, attachModal.visitId).catch((error) => {
      setAlert({ variant: "destructive", title: "No se pudo subir el archivo", description: error instanceof Error ? error.message : "Intenta nuevamente." });
      setAlertOpen(true);
      return null;
    });
    if (!uploaded) { setAttachmentSaving(false); return; }
    const parsed = MedicalAttachmentCreateSchema.safeParse({ ...attachForm, ...uploaded, file: undefined });
    if (!parsed.success) {
      await apiDelete("/api/uploads/object", { storageRef: uploaded.storageRef }).catch(() => undefined);
      window.alert(parsed.error.issues.map((i) => i.message).join("\n"));
      setAttachmentSaving(false);
      return;
    }

    try {
      await apiPost(`/api/visits/${attachModal.visitId}/attachments`, parsed.data);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="app-page-hero flex items-center gap-4">
        <BackButton />

        <div className="flex-1 justify-between flex">
          <div>
            <p className="app-kicker mb-3 inline-flex border-0">
              Paciente y seguimiento
            </p>
            <h2 className="app-heading text-3xl sm:text-4xl">{pet.name}</h2>
            <p className="mt-2 text-muted-foreground">
              {pet.species} • {pet.breed || "Sin raza especificada"}
            </p>
          </div>
          <div className="self-end">
            {canEditPatient ? <Button size="sm" variant="outline" onClick={openPatientEdit}><Pencil className="mr-1 h-4 w-4" />Editar paciente</Button> : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pet Info */}
        <aside className="app-panel-strong h-fit overflow-hidden">
          <div className="border-b border-border/70 bg-muted/35 p-5 text-center text-foreground">
            <div className="app-stat-icon mx-auto mb-3 h-16 w-16 text-3xl">
              {speciesEmoji[pet.species] || "🐾"}
            </div>
            <h3 className="text-xl font-semibold">{pet.name}</h3>
            <p className="text-sm text-muted-foreground">
              {pet.species} • {pet.breed || "-"}
            </p>
          </div>

          <div className="space-y-4 p-5">
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

            {client && (
              <div className="border-t border-border/70 pt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  PROPIETARIO
                </p>
                <div className="flex items-center gap-3">
                  <div className="app-stat-icon h-10 w-10 rounded-full">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {client.fullName}
                    </p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" /> {client.phone || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="history">Historial Clínico</TabsTrigger>
                <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
              </TabsList>

              <div className="flex flex-wrap justify-end gap-2">
                {currentUser?.access.actions.pets.viewClinicalHistory ? <Button size="sm" variant="outline" onClick={() => setClinicalReportOpen(true)}><FileText className="mr-1 h-4 w-4" />Generar informe clínico</Button> : null}
                <Button size="sm" onClick={() => setVisitModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Visita
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVaccineModalOpen(true)}
                >
                  <Syringe className="w-4 h-4 mr-1" /> Vacuna
                </Button>
              </div>
            </div>

            <TabsContent value="history">
              <div className="app-panel-strong overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Historial clínico
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Filtra las visitas por día.
                    </p>
                  </div>
                  <FormField
                    label="Fecha"
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
                    <p className="text-muted-foreground">
                      No hay visitas clínicas
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {visits.map((v: any) => (
                      <div
                        key={v.id}
                        className="p-4 transition-colors hover:bg-muted/45"
                      >
                        <div className="flex items-start gap-4">
                          <div className="app-stat-icon h-10 w-10 flex-shrink-0 rounded-[1rem]">
                            <Stethoscope className="w-5 h-5" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Visita</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatClinicalDate(v.visitAt)}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                {canViewVisit ? <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedVisit(v)}
                                >
                                  <Eye className="mr-1 h-4 w-4" />
                                  Ver detalle
                                </Button> : null}
                                {canEditVisit ? <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingVisit(v)}
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Editar
                                </Button> : null}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setAttachModal({
                                      open: true,
                                      visitId: v.id,
                                    });
                                  }}
                                >
                                  <Paperclip className="w-4 h-4 mr-1" />
                                  Adjuntar
                                </Button>
                              </div>
                            </div>

                            {v.diagnosis && (
                              <p className="mt-2 font-medium text-foreground">
                                {v.diagnosis}
                              </p>
                            )}
                            {v.treatment && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-medium">
                                  Tratamiento:
                                </span>{" "}
                                {v.treatment}
                              </p>
                            )}
                            {v.notes && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-medium">Notas:</span>{" "}
                                {v.notes}
                              </p>
                            )}

                            {Array.isArray(v.attachments) &&
                              v.attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs text-muted-foreground/80">
                                    {v.attachments.length} adjunto(s)
                                  </p>
                                  {(expandedAttachments.has(v.id)
                                    ? v.attachments
                                    : v.attachments.slice(0, 3)
                                  ).map((attachment: any) => (
                                    <DocumentAttachment
                                      key={attachment.id}
                                      fileName={attachment.fileName}
                                      fileType={attachment.fileType}
                                      url={attachment.url}
                                      downloadUrl={attachment.downloadUrl}
                                      deleting={
                                        deletingAttachmentId === attachment.id
                                      }
                                      onDelete={() =>
                                        setAttachmentToDelete({
                                          visitId: v.id,
                                          attachment,
                                        })
                                      }
                                    />
                                  ))}
                                  {v.attachments.length > 3 ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setExpandedAttachments((current) => {
                                          const next = new Set(current);
                                          if (next.has(v.id)) next.delete(v.id);
                                          else next.add(v.id);
                                          return next;
                                        })
                                      }
                                    >
                                      <ChevronDown
                                        className={`mr-1 h-4 w-4 transition-transform ${expandedAttachments.has(v.id) ? "rotate-180" : ""}`}
                                        aria-hidden="true"
                                      />
                                      {expandedAttachments.has(v.id)
                                        ? "Ocultar adjuntos"
                                        : `Ver ${v.attachments.length - 3} adjuntos más`}
                                    </Button>
                                  ) : null}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
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
                <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Vacunas registradas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Filtra las aplicaciones por día.
                    </p>
                  </div>
                  <FormField
                    label="Fecha"
                    name="vaccinationDateFilter"
                    type="date"
                    value={vaccinationDateFilter}
                    onChange={(event) => {
                      setVaccinationDateFilter(String(event.target.value));
                      setVaccinationPage(0);
                    }}
                  />
                </div>
                {vaccinations.length === 0 ? (
                  <div className="p-12 text-center">
                    <Syringe className="mx-auto mb-4 h-12 w-12 text-muted-foreground/35" />
                    <p className="text-muted-foreground">
                      No hay vacunas registradas
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {vaccinations.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-4 transition-colors hover:bg-muted/45"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="app-stat-icon rounded-[1rem]">
                              <Syringe className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {r.vaccine?.name ?? `Vacuna #${r.vaccineId}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Aplicada: {formatClinicalDate(r.appliedAt)}
                              </p>
                            </div>
                          </div>

                          {r.nextDueAt && (
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Próxima dosis:
                              </p>
                              <p className="font-medium text-primary">
                                {formatClinicalDate(r.nextDueAt)}
                              </p>
                            </div>
                          )}
                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingVaccination(r)}
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              Editar
                            </Button>
                          </div>
                        </div>


                        {(r.batchNumber || r.notes) && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {r.batchNumber && (
                              <p>
                                <span className="font-medium">Lote:</span>{" "}
                                {r.batchNumber}
                              </p>
                            )}
                            {r.notes && (
                              <p>
                                <span className="font-medium">Notas:</span>{" "}
                                {r.notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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

      {currentUser?.access.actions.pets.viewClinicalHistory ? <ClinicalReportDialog open={clinicalReportOpen} onClose={() => setClinicalReportOpen(false)} pets={[pet]} clients={client ? [client] : []} initialPetIds={[pet.id]} /> : null}

      <Modal open={patientEditOpen} onClose={setPatientEditOpen} title="Editar paciente" footer={<div className="flex gap-3"><Button variant="outline" onClick={() => setPatientEditOpen(false)}>Cancelar</Button><Button disabled={savingPatient} onClick={() => void savePatientEdit()}>{savingPatient ? "Guardando..." : "Guardar cambios"}</Button></div>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([['name','Nombre','text'],['species','Especie','select'],['sex','Sexo','select'],['breed','Raza','text'],['birthDate','Fecha de nacimiento','date'],['weightKg','Peso (kg)','number'],['color','Color / pelaje','text'],['microchip','Microchip','text']] as const).map(([name,label,type]) => <FormField key={name} label={label} name={name} type={type} options={name === 'species' ? [{ value: 'DOG', label: 'Perro' }, { value: 'CAT', label: 'Gato' }, { value: 'BIRD', label: 'Ave' }, { value: 'RABBIT', label: 'Conejo' }, { value: 'OTHER', label: 'Otro' }] : name === 'sex' ? [{ value: 'MALE', label: 'Macho' }, { value: 'FEMALE', label: 'Hembra' }, { value: 'UNKNOWN', label: 'Desconocido' }] : undefined} value={patientEditForm[name] ?? ''} onChange={(event) => setPatientEditForm((current) => ({ ...current, [name]: String(event.target.value) }))} />)}
          <FormField label="Notas" name="notes" type="textarea" value={patientEditForm.notes ?? ''} onChange={(event) => setPatientEditForm((current) => ({ ...current, notes: String(event.target.value) }))} className="sm:col-span-2" />
        </div>
      </Modal>

      <Modal open={!!selectedVisit} onClose={(open) => { if (!open) setSelectedVisit(null); }} title="Detalle de visita clínica" size="lg" footer={<div className="flex gap-3">{canEditVisit && selectedVisit ? <Button onClick={() => { setEditingVisit(selectedVisit); setSelectedVisit(null); }}><Pencil className="mr-1 h-4 w-4" />Editar</Button> : null}<Button variant="outline" onClick={() => setSelectedVisit(null)}>Cerrar</Button></div>}>
        {selectedVisit ? <div className="space-y-4 text-sm"><div className="grid grid-cols-2 gap-4"><Detail label="Fecha" value={formatClinicalDate(selectedVisit.visitAt)} /><Detail label="Veterinario" value={selectedVisit.vet?.name ?? "No registrado"} /><Detail label="Peso" value={selectedVisit.weightKg == null ? "-" : `${selectedVisit.weightKg} kg`} /><Detail label="Temperatura" value={selectedVisit.temperatureC == null ? "-" : `${selectedVisit.temperatureC} °C`} /></div>{[['Motivo', selectedVisit.appointment?.reason], ['Diagnóstico', selectedVisit.diagnosis], ['Tratamiento / notas', [selectedVisit.treatment, selectedVisit.notes].filter(Boolean).join("\n")]].map(([label,value]) => value ? <div key={label}><p className="font-semibold text-foreground">{label}</p><p className="whitespace-pre-wrap text-muted-foreground">{value}</p></div> : null)}{selectedVisit.attachments?.length ? <div><p className="mb-2 font-semibold text-foreground">Adjuntos</p><div className="space-y-2">{selectedVisit.attachments.map((attachment: AttachmentDTO) => <DocumentAttachment key={attachment.id} fileName={attachment.fileName} fileType={attachment.fileType} url={attachment.url} downloadUrl={attachment.downloadUrl} />)}</div></div> : <p className="text-muted-foreground">Sin adjuntos.</p>}</div> : null}
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
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setVisitModalOpen(false);
                setEditingVisit(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        }
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
                  visitAt: format(parseISO(editingVisit.visitAt), "yyyy-MM-dd"),
                  vetId: editingVisit.vetId ?? "",
                  diagnosis: editingVisit.diagnosis ?? "",
                  treatment: editingVisit.treatment ?? "",
                  notes: editingVisit.notes ?? "",
                  weightKg: editingVisit.weightKg ?? "",
                  temperatureC: editingVisit.temperatureC ?? "",
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
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setVaccineModalOpen(false);
                setEditingVaccination(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        }
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
      <Modal
        open={attachModal.open}
        onClose={() => {
          void closeAttachmentModal();
        }}
        title="Adjuntar archivo a la visita"
        footer={
          <div className="flex gap-3">
            <Button
              disabled={draftAttachmentBusy}
              variant="outline"
              onClick={() => {
                void closeAttachmentModal();
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                draftAttachmentBusy || attachmentSaving || !attachForm.file
              }
              onClick={handleCreateAttachment}
            >
              {attachmentSaving ? (
                <LoaderCircle
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {attachmentSaving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="order-first rounded-[1.5rem] border border-dashed border-border/70 p-4 sm:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {attachForm.storageRef
                    ? "Documento listo"
                    : "Sube el documento primero"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Al subirlo, el nombre se completa automaticamente y luego
                  puedes ajustarlo si quieres.
                </p>
              </div>
              <SignedFileUploader
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                buttonLabel={
                  attachForm.storageRef
                    ? "Cambiar documento"
                    : "Subir documento"
                }
                disabled={draftAttachmentBusy}
                onError={(message) => {
                  setAlert({
                    variant: "destructive",
                    title: "No se pudo subir el archivo",
                    description: message,
                  });
                  setAlertOpen(true);
                }}
                onFileSelected={handleAttachmentSelected}
              />
            </div>

            {attachForm.file || attachForm.storageRef ? (
              <div className="mt-4 rounded-[1rem] border border-border/70 bg-muted/45 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* <div className="min-w-0 text-sm text-muted-foreground">
                    <p className="truncate font-medium text-foreground">
                      {attachForm.fileName}
                    </p>
                    <p>{attachForm.fileType || "application/octet-stream"}</p>
                  </div> */}
                  <div className="flex gap-2">
                    <DocumentAttachment
                      fileName={attachForm.fileName}
                      fileType={attachForm.fileType}
                      url={attachForm.previewUrl}
                      size={attachForm.file?.file.size}
                    />
                    <Button
                      className="self-center"
                      disabled={draftAttachmentBusy}
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void deleteTemporaryAttachment();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {draftAttachmentBusy ? "Quitando..." : "Quitar"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <FormField
            label="Nombre"
            name="fileName"
            value={attachForm.fileName}
            onChange={(e: FormFieldChangeEvent) =>
              setAttachForm((p: any) => ({
                ...p,
                [e.target.name]: e.target.value,
              }))
            }
            required
            className="sm:col-span-2"
          />
        </div>
      </Modal>

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
