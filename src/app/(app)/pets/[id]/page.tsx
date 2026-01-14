"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { format, parseISO, differenceInYears, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";
import { VaccinationRecordCreateSchema } from "@/lib/validators/vaccination";
import { MedicalAttachmentCreateSchema } from "@/lib/validators/attachments";
import { useParams, useSearchParams } from "next/navigation";

type PetDTO = any; // si quieres, luego lo tipamos con Prisma types
type VisitDTO = any;
type VaccDTO = any;
type VaccineDTO = any;

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

export default function PatientDetail() {
//   const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
//   const petId = Number(urlParams.get("id"));
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

  // attachments por visita (modal simple por URL)
  const [attachModal, setAttachModal] = useState<{ open: boolean; visitId: number | null }>({
    open: false,
    visitId: null,
  });
  const [attachForm, setAttachForm] = useState<any>({
    fileName: "",
    fileType: "",
    url: "",
  });

  const client = pet?.client;

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return "-";
    const d = parseISO(birthDate);
    const years = differenceInYears(new Date(), d);
    if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
    const months = differenceInMonths(new Date(), d);
    return `${months} mes${months > 1 ? "es" : ""}`;
  };

  const clinicId = pet?.clinicId ?? 1;

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

  if (loading || !pet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
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
      alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

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
  }

  async function handleCreateVaccination() {
    const parsed = VaccinationRecordCreateSchema.safeParse({
      ...vaccineForm,
      vaccineId: Number(vaccineForm.vaccineId),
      appliedAt: vaccineForm.appliedAt ? new Date(vaccineForm.appliedAt) : undefined,
      nextDueAt: vaccineForm.nextDueAt ? new Date(vaccineForm.nextDueAt) : undefined,
    });

    if (!parsed.success) {
      alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

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
  }

  async function handleCreateAttachment() {
    if (!attachModal.visitId) return;

    const parsed = MedicalAttachmentCreateSchema.safeParse(attachForm);
    if (!parsed.success) {
      alert(parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    await apiPost(`/api/visits/${attachModal.visitId}/attachments`, parsed.data);
    setAttachModal({ open: false, visitId: null });
    setAttachForm({ fileName: "", fileType: "", url: "" });
    await loadAll();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">{pet.name}</h2>
          <p className="text-slate-500">
            {pet.species} • {pet.breed || "Sin raza especificada"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pet Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-6 text-white text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-white/20 flex items-center justify-center text-5xl mb-4">
              {speciesEmoji[pet.species] || "🐾"}
            </div>
            <h3 className="text-2xl font-bold">{pet.name}</h3>
            <p className="text-teal-100">
              {pet.species} • {pet.breed || "-"}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Calendar className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Edad</p>
                <p className="font-semibold text-slate-800">{calculateAge(pet.birthDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Weight className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Peso</p>
                <p className="font-semibold text-slate-800">{pet.weightKg ? `${pet.weightKg} kg` : "-"}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Sexo:</span>
                <Badge className="bg-slate-100 text-slate-700">{sexLabel[pet.sex] ?? pet.sex}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Color:</span>
                <span className="font-medium text-slate-800">{pet.color || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Microchip:</span>
                <span className="font-medium text-slate-800">{pet.microchip || "-"}</span>
              </div>
            </div>

            {!!pet.notes && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Notas
                </p>
                <p className="text-sm text-slate-700">{pet.notes}</p>
              </div>
            )}

            {client && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">PROPIETARIO</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{client.fullName}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
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
              <TabsList className="bg-white shadow-sm">
                <TabsTrigger value="history">Historial Clínico</TabsTrigger>
                <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => setVisitModalOpen(true)} className="bg-teal-500 hover:bg-teal-600">
                  <Plus className="w-4 h-4 mr-1" /> Visita
                </Button>
                <Button size="sm" variant="outline" onClick={() => setVaccineModalOpen(true)}>
                  <Syringe className="w-4 h-4 mr-1" /> Vacuna
                </Button>
              </div>
            </div>

            <TabsContent value="history">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {visits.length === 0 ? (
                  <div className="p-12 text-center">
                    <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No hay visitas clínicas</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {visits.map((v: any) => (
                      <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="w-5 h-5 text-teal-600" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Visita</Badge>
                                <span className="text-sm text-slate-500">
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

                            {v.diagnosis && <p className="font-medium text-slate-800 mt-2">{v.diagnosis}</p>}
                            {v.treatment && (
                              <p className="text-sm text-slate-600 mt-1">
                                <span className="font-medium">Tratamiento:</span> {v.treatment}
                              </p>
                            )}
                            {v.notes && (
                              <p className="text-sm text-slate-600 mt-1">
                                <span className="font-medium">Notas:</span> {v.notes}
                              </p>
                            )}

                            {Array.isArray(v.attachments) && v.attachments.length > 0 && (
                              <p className="text-xs text-slate-400 mt-2">
                                {v.attachments.length} adjunto(s)
                              </p>
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
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {vaccinations.length === 0 ? (
                  <div className="p-12 text-center">
                    <Syringe className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No hay vacunas registradas</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {vaccinations.map((r: any) => (
                      <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                              <Syringe className="w-5 h-5 text-pink-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{r.vaccine?.name ?? `Vacuna #${r.vaccineId}`}</p>
                              <p className="text-sm text-slate-500">
                                Aplicada: {format(parseISO(r.appliedAt), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>

                          {r.nextDueAt && (
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Próxima</p>
                              <p className="font-medium text-teal-600">
                                {format(parseISO(r.nextDueAt), "d MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          )}
                        </div>

                        {(r.batchNumber || r.notes) && (
                          <div className="mt-2 text-sm text-slate-600">
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
            <Button onClick={handleCreateVisit} className="bg-teal-500 hover:bg-teal-600">
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
            onChange={(e) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
          />
          <FormField
            label="Peso en visita (kg)"
            name="weightKg"
            type="number"
            value={visitForm.weightKg}
            onChange={(e) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Temperatura (°C)"
            name="temperatureC"
            type="number"
            value={visitForm.temperatureC}
            onChange={(e) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Diagnóstico"
            name="diagnosis"
            type="textarea"
            value={visitForm.diagnosis}
            onChange={(e) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            className="sm:col-span-2"
          />
          <FormField
            label="Tratamiento"
            name="treatment"
            type="textarea"
            value={visitForm.treatment}
            onChange={(e) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            className="sm:col-span-2"
          />
          <FormField
            label="Notas"
            name="notes"
            type="textarea"
            value={visitForm.notes}
            onChange={(e) => setVisitForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
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
            <Button onClick={handleCreateVaccination} className="bg-teal-500 hover:bg-teal-600">
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
            onChange={(e) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
          />
          <FormField
            label="Fecha de Aplicación"
            name="appliedAt"
            type="date"
            value={vaccineForm.appliedAt}
            onChange={(e) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
          />
          <FormField
            label="Próxima Dosis"
            name="nextDueAt"
            type="date"
            value={vaccineForm.nextDueAt}
            onChange={(e) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Número de Lote"
            name="batchNumber"
            value={vaccineForm.batchNumber}
            onChange={(e) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
          />
          <FormField
            label="Notas"
            name="notes"
            type="textarea"
            value={vaccineForm.notes}
            onChange={(e) => setVaccineForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            className="sm:col-span-2"
          />
        </div>
      </Modal>

      {/* Modal: Adjuntar archivo (por URL por ahora) */}
      <Modal
        open={attachModal.open}
        onClose={() => setAttachModal({ open: false, visitId: null })}
        title="Adjuntar archivo a la visita"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAttachModal({ open: false, visitId: null })}>Cancelar</Button>
            <Button onClick={handleCreateAttachment} className="bg-teal-500 hover:bg-teal-600">
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Nombre"
            name="fileName"
            value={attachForm.fileName}
            onChange={(e) => setAttachForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
          />
          <FormField
            label="Tipo (mime)"
            name="fileType"
            value={attachForm.fileType}
            onChange={(e) => setAttachForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            placeholder="image/png, application/pdf…"
          />
          <FormField
            label="URL"
            name="url"
            value={attachForm.url}
            onChange={(e) => setAttachForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))}
            required
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </div>
  );
}
