"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import SignedFileUploader from "@/components/shared/SignedFileUploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Calendar,
  Weight,
  Syringe,
  Stethoscope,
  Plus,
  AlertTriangle,
  Paperclip,
  Eye,
  Trash2,
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

type PetDTO = any; // si quieres, luego lo tipamos con Prisma types
type VisitDTO = any;
type VaccDTO = any;
type VaccineDTO = any;
type AttachmentDTO = any;
type AttachmentUploadDraft = {
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

  const [loading, setLoading] = useState(true);

  // modales
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [vaccineModalOpen, setVaccineModalOpen] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertState, setAlert] = useState<{
    variant: "success" | "info" | "warning" | "destructive";
    title: string;
    description?: string;
  }>({ variant: "info", title: "" });

  // forms
  const [visitForm, setVisitForm] = useState<any>({
    visitAt: format(new Date(), "yyyy-MM-dd"),
    diagnosis: "",
    treatment: "",
    notes: "",
    weightKg: "",
    temperatureC: "",
  });

  const [vaccineForm, setVaccineForm] = useState<any>({
    vaccineId: "",
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

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return "-";
    const d = parseISO(birthDate);
    const years = differenceInYears(new Date(), d);
    if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
    const months = differenceInMonths(new Date(), d);
    return `${months} mes${months > 1 ? "es" : ""}`;
  };

  const vaccineOptions = useMemo(
    () =>
      vaccinesCatalog.map((v) => ({
        value: String(v.id),
        label: v.species ? `${v.name} (${v.species})` : v.name,
      })),
    [vaccinesCatalog]
  );

  async function loadAll() {
    setLoading(true);
    try {
      const petData = await apiGet<PetDTO>(`/api/pets/${petId}`);
      console.log("Loaded pet:", petData);
      setPet(petData);

      const [visitData, vaccData, catalog] = await Promise.all([
        apiGet<VisitDTO[]>(`/api/pets/${petId}/visits`),
        apiGet<VaccDTO[]>(`/api/pets/${petId}/vaccinations`),
        apiGet<VaccineDTO[]>(`/api/vaccines?clinicId=${petData.clinicId}`),
      ]);

      setVisits(visitData);
      setVaccinations(vaccData);
      setVaccinesCatalog(catalog);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!petId || !Number.isFinite(petId)) return;
    loadAll().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

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

  async function handleAttachmentUploaded(file: AttachmentUploadDraft) {
    const previousForm = attachForm;

    setAttachForm({
      fileName: file.fileName,
      fileType: file.fileType,
      storageRef: file.storageRef,
      previewUrl: file.previewUrl,
    });

    if (
      previousForm.storageRef &&
      previousForm.storageRef !== file.storageRef
    ) {
      revokePreviewUrl(previousForm.previewUrl);

      try {
        await apiDelete("/api/uploads/object", {
          storageRef: previousForm.storageRef,
        });
      } catch (error) {
        setAlert({
          variant: "warning",
          title: "Se reemplazo el documento",
          description:
            error instanceof Error
              ? `${error.message}. El archivo anterior podria seguir en almacenamiento.`
              : "El archivo anterior podria seguir en almacenamiento.",
        });
        setAlertOpen(true);
      }
    }
  }

  async function handleDeleteSavedAttachment(
    visitId: number,
    attachment: AttachmentDTO
  ) {
    const confirmed = window.confirm(
      `¿Eliminar el adjunto "${attachment.fileName}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingAttachmentId(attachment.id);

    try {
      await apiDelete(`/api/visits/${visitId}/attachments/${attachment.id}`);
      await loadAll();
      setAlert({
        variant: "success",
        title: "Adjunto eliminado",
        description: "El archivo se elimino del historial y del almacenamiento.",
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
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
        diagnosis: "",
        treatment: "",
        notes: "",
        weightKg: "",
        temperatureC: "",
      });
      await loadAll();
    } catch(e) {
      console.log(e)
    } finally {
      setAlert({
        variant: "success",
        title: "Visita registrada",
        description: "La visita se registró correctamente.",
      });
      
      setAlertOpen(true);
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
        appliedAt: format(new Date(), "yyyy-MM-dd"),
        nextDueAt: "",
        batchNumber: "",
        notes: "",
      });
      await loadAll();
    } catch(e) {
      console.log(e)
    } finally {
      setAlert({
        variant: "success",
        title: "Vacuna registrada",
        description: "La vacuna se registró correctamente.",
      });
      
      setAlertOpen(true);
    }
  }

  async function handleCreateAttachment() {
    if (!attachModal.visitId) return;

    const parsed = MedicalAttachmentCreateSchema.safeParse(attachForm);
    if (!parsed.success) {
      window.alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    try {
      await apiPost(`/api/visits/${attachModal.visitId}/attachments`, parsed.data);
      finalizeAttachmentModalClose(attachForm);
      await loadAll();
      setAlert({
        variant: "success",
        title: "Adjunto guardado",
        description: "El archivo se agrego correctamente a la visita.",
      });
      setAlertOpen(true);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo guardar el adjunto",
        description:
          error instanceof Error
            ? error.message
            : "Intenta nuevamente en unos segundos.",
      });
      setAlertOpen(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="app-page-hero flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <p className="app-kicker mb-3 inline-flex border-0">Paciente y seguimiento</p>
          <h2 className="app-heading text-3xl sm:text-4xl">{pet.name}</h2>
          <p className="mt-2 text-muted-foreground">
            {pet.species} • {pet.breed || "Sin raza especificada"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pet Info */}
        <div className="app-panel-strong overflow-hidden">
          <div className="bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-teal)_82%,white_18%),color-mix(in_srgb,var(--brand-navy)_82%,white_18%))] p-6 text-center text-white">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/15 bg-white/12 text-5xl backdrop-blur">
              {speciesEmoji[pet.species] || "🐾"}
            </div>
            <h3 className="text-2xl font-bold">{pet.name}</h3>
            <p className="text-white/76">
              {pet.species} • {pet.breed || "-"}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="app-panel-muted p-3 text-center">
                <Calendar className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Edad</p>
                <p className="font-semibold text-foreground">{calculateAge(pet.birthDate)}</p>
              </div>
              <div className="app-panel-muted p-3 text-center">
                <Weight className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Peso</p>
                <p className="font-semibold text-foreground">{pet.weightKg ? `${pet.weightKg} kg` : "-"}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border/70 pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sexo:</span>
                <Badge variant="secondary">{sexLabel[pet.sex] ?? pet.sex}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Color:</span>
                <span className="font-medium text-foreground">{pet.color || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Microchip:</span>
                <span className="font-medium text-foreground">{pet.microchip || "-"}</span>
              </div>
            </div>

            {!!pet.notes && (
              <div className="border-t border-border/70 pt-4">
                <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3" /> Notas
                </p>
                <p className="text-sm text-foreground">{pet.notes}</p>
              </div>
            )}

            {client && (
              <div className="border-t border-border/70 pt-4">
                <p className="mb-2 text-xs text-muted-foreground">PROPIETARIO</p>
                <div className="flex items-center gap-3">
                  <div className="app-stat-icon h-10 w-10 rounded-full">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{client.fullName}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" /> {client.phone || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="history" className="space-y-4">
            <div className="flex items-center justify-between">
                <TabsList>
                <TabsTrigger value="history">Historial Clínico</TabsTrigger>
                <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => setVisitModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Visita
                </Button>
                <Button size="sm" variant="outline" onClick={() => setVaccineModalOpen(true)}>
                  <Syringe className="w-4 h-4 mr-1" /> Vacuna
                </Button>
              </div>
            </div>

            <TabsContent value="history">
              <div className="app-panel-strong overflow-hidden">
                {visits.length === 0 ? (
                  <div className="p-12 text-center">
                    <Stethoscope className="mx-auto mb-4 h-12 w-12 text-muted-foreground/35" />
                    <p className="text-muted-foreground">No hay visitas clínicas</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {visits.map((v: any) => (
                      <div key={v.id} className="p-4 transition-colors hover:bg-muted/45">
                        <div className="flex items-start gap-4">
                          <div className="app-stat-icon h-10 w-10 flex-shrink-0 rounded-[1rem]">
                            <Stethoscope className="w-5 h-5" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Visita</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(parseISO(v.visitAt), "d MMM yyyy", { locale: es })}
                                </span>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAttachModal({ open: true, visitId: v.id })}
                              >
                                <Paperclip className="w-4 h-4 mr-1" />
                                Adjuntar
                              </Button>
                            </div>

                            {v.diagnosis && <p className="mt-2 font-medium text-foreground">{v.diagnosis}</p>}
                            {v.treatment && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-medium">Tratamiento:</span> {v.treatment}
                              </p>
                            )}
                            {v.notes && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-medium">Notas:</span> {v.notes}
                              </p>
                            )}

                            {Array.isArray(v.attachments) && v.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs text-muted-foreground/80">
                                  {v.attachments.length} adjunto(s)
                                </p>
                                {v.attachments.map((attachment: any) => (
                                  <div
                                    key={attachment.id}
                                    className="flex flex-wrap items-center gap-2 rounded-[1rem] border border-border/70 bg-muted/45 px-3 py-2 text-sm text-muted-foreground"
                                  >
                                     <Paperclip className="h-4 w-4 text-muted-foreground" />
                                     <span className="font-medium text-foreground">
                                       {attachment.fileName}
                                     </span>
                                     <a
                                       className="text-primary hover:underline"
                                       href={attachment.url}
                                       rel="noreferrer"
                                       target="_blank"
                                     >
                                       Ver
                                     </a>
                                     {attachment.downloadUrl ? (
                                       <a
                                         className="text-muted-foreground hover:text-foreground hover:underline"
                                        href={attachment.downloadUrl}
                                      >
                                         Descargar
                                       </a>
                                     ) : null}
                                     <Button
                                       disabled={deletingAttachmentId === attachment.id}
                                       onClick={() =>
                                         void handleDeleteSavedAttachment(v.id, attachment)
                                       }
                                       size="sm"
                                       type="button"
                                       variant="ghost"
                                     >
                                       <Trash2 className="mr-2 h-4 w-4" />
                                       {deletingAttachmentId === attachment.id
                                         ? "Eliminando..."
                                         : "Eliminar"}
                                     </Button>
                                   </div>
                                 ))}
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="vaccines">
              <div className="app-panel-strong overflow-hidden">
                {vaccinations.length === 0 ? (
                  <div className="p-12 text-center">
                    <Syringe className="mx-auto mb-4 h-12 w-12 text-muted-foreground/35" />
                    <p className="text-muted-foreground">No hay vacunas registradas</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {vaccinations.map((r: any) => (
                      <div key={r.id} className="p-4 transition-colors hover:bg-muted/45">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="app-stat-icon rounded-[1rem]">
                              <Syringe className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{r.vaccine?.name ?? `Vacuna #${r.vaccineId}`}</p>
                              <p className="text-sm text-muted-foreground">
                                Aplicada: {format(parseISO(r.appliedAt), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>

                          {r.nextDueAt && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Próxima</p>
                              <p className="font-medium text-primary">
                                {format(parseISO(r.nextDueAt), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          )}
                        </div>

                        {(r.batchNumber || r.notes) && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {r.batchNumber && <p><span className="font-medium">Lote:</span> {r.batchNumber}</p>}
                            {r.notes && <p><span className="font-medium">Notas:</span> {r.notes}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal: Nueva Visita */}
      <Modal
        open={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        title="Nueva Visita Clínica"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setVisitModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateVisit}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Fecha"
            name="visitAt"
            type="date"
            value={visitForm.visitAt}
            onChange={(e: FormFieldChangeEvent) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
          />
          <FormField
            label="Peso en visita (kg)"
            name="weightKg"
            type="number"
            value={visitForm.weightKg}
            onChange={(e: FormFieldChangeEvent) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Temperatura (°C)"
            name="temperatureC"
            type="number"
            value={visitForm.temperatureC}
            onChange={(e: FormFieldChangeEvent) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Diagnóstico"
            name="diagnosis"
            type="textarea"
            value={visitForm.diagnosis}
            onChange={(e: FormFieldChangeEvent) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            className="sm:col-span-2"
          />
          <FormField
            label="Tratamiento"
            name="treatment"
            type="textarea"
            value={visitForm.treatment}
            onChange={(e: FormFieldChangeEvent) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            className="sm:col-span-2"
          />
          <FormField
            label="Notas"
            name="notes"
            type="textarea"
            value={visitForm.notes}
            onChange={(e: FormFieldChangeEvent) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            className="sm:col-span-2"
          />
        </div>
      </Modal>

      {/* Modal: Nueva Vacuna */}
      <Modal
        open={vaccineModalOpen}
        onClose={() => setVaccineModalOpen(false)}
        title="Nueva Vacuna"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setVaccineModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateVaccination}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Vacuna"
            name="vaccineId"
            type="select"
            value={vaccineForm.vaccineId}
            options={vaccineOptions}
            onChange={(e: FormFieldChangeEvent) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
          />
          <FormField
            label="Fecha de Aplicación"
            name="appliedAt"
            type="date"
            value={vaccineForm.appliedAt}
            onChange={(e: FormFieldChangeEvent) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
          />
          <FormField
            label="Próxima Dosis"
            name="nextDueAt"
            type="date"
            value={vaccineForm.nextDueAt}
            onChange={(e: FormFieldChangeEvent) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Número de Lote"
            name="batchNumber"
            value={vaccineForm.batchNumber}
            onChange={(e: FormFieldChangeEvent) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Notas"
            name="notes"
            type="textarea"
            value={vaccineForm.notes}
            onChange={(e: FormFieldChangeEvent) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            className="sm:col-span-2"
          />
        </div>
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
              disabled={draftAttachmentBusy}
              onClick={handleCreateAttachment}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="order-first rounded-[1.5rem] border border-dashed border-border/70 p-4 sm:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {attachForm.storageRef ? "Documento listo" : "Sube el documento primero"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Al subirlo, el nombre se completa automaticamente y luego puedes ajustarlo si quieres.
                </p>
              </div>
              <SignedFileUploader
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                buttonLabel={attachForm.storageRef ? "Cambiar documento" : "Subir documento"}
                disabled={draftAttachmentBusy}
                onError={(message) => {
                  setAlert({
                    variant: "destructive",
                    title: "No se pudo subir el archivo",
                    description: message,
                  });
                  setAlertOpen(true);
                }}
                onUploaded={handleAttachmentUploaded}
                scope="medical-attachment"
                visitId={attachModal.visitId}
              />
            </div>

            {attachForm.storageRef ? (
              <div className="mt-4 rounded-[1rem] border border-border/70 bg-muted/45 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-sm text-muted-foreground">
                    <p className="truncate font-medium text-foreground">{attachForm.fileName}</p>
                    <p>{attachForm.fileType || "application/octet-stream"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild type="button" variant="outline">
                      <a href={attachForm.previewUrl} target="_blank" rel="noreferrer">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver documento
                      </a>
                    </Button>
                    <Button
                      disabled={draftAttachmentBusy}
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void deleteTemporaryAttachment();
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
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
            onChange={(e: FormFieldChangeEvent) => setAttachForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
            className="sm:col-span-2"
          />
        </div>
      </Modal>
      
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

export default function PatientDetail() {
  return (
    <Suspense fallback={<div className="app-panel-strong p-6 text-sm text-muted-foreground">Cargando paciente...</div>}>
      <PatientDetailContent />
    </Suspense>
  );
}
