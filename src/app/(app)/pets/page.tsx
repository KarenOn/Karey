"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { differenceInMonths, differenceInYears, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Edit, Eye, PawPrint, Plus, Trash2, User as UserIcon } from "lucide-react";
import AppPageHero from "@/components/shared/AppPageHero";
import DataTable from "@/components/shared/Datatable";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import ModalDelete from "@/components/shared/ModalDelete";
import PhoneInput from "@/components/shared/PhoneInput";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { apiCreateClient, apiListClients, type ClientRow } from "@/lib/api/clients";
import { apiCreatePet, apiDeletePet, apiListPets, apiUpdatePet, type PetRow } from "@/lib/api/pets";
import { apiListVaccinations, type VaccinationRow } from "@/lib/api/vaccinations";
import { ClientFormSchema } from "@/lib/validators/client";
import { PetCreateSchema, PetUpdateSchema } from "@/lib/validators/pet";
import { toast } from "sonner";

const speciesEmoji: Record<string, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  OTHER: "🐾",
};

const speciesOptions = [
  { value: "DOG", label: "🐕 Perro", keywords: ["dog", "canino"] },
  { value: "CAT", label: "🐱 Gato", keywords: ["cat", "felino"] },
  { value: "BIRD", label: "🦜 Ave", keywords: ["bird", "pajaro"] },
  { value: "RABBIT", label: "🐰 Conejo", keywords: ["rabbit"] },
  { value: "OTHER", label: "🐾 Otro", keywords: ["other", "otro"] },
];

const sexOptions = [
  { value: "MALE", label: "Macho" },
  { value: "FEMALE", label: "Hembra" },
  { value: "UNKNOWN", label: "Desconocido" },
];

function formatSpecies(species: string) {
  const option = speciesOptions.find((item) => item.value === species);
  if (!option) return species;
  return option.label.replace(/^[^\s]+\s/, "");
}

type PatientFormState = {
  name: string;
  clientId: string;
  species: string;
  sex: string;
  breed: string;
  birthDate: string;
  weightKg: string;
  color: string;
  microchip: string;
  notes: string;
};

type QuickClientFormState = {
  fullName: string;
  phone: string;
  email: string;
};

const emptyPatientForm: PatientFormState = {
  name: "",
  clientId: "",
  species: "",
  sex: "UNKNOWN",
  breed: "",
  birthDate: "",
  weightKg: "",
  color: "",
  microchip: "",
  notes: "",
};

const emptyQuickClientForm: QuickClientFormState = {
  fullName: "",
  phone: "",
  email: "",
};

function calculateAge(birthDateISO: string | null) {
  if (!birthDateISO) return null;
  const date = parseISO(birthDateISO);
  const years = differenceInYears(new Date(), date);
  if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
  const months = differenceInMonths(new Date(), date);
  return `${months} mes${months > 1 ? "es" : ""}`;
}

function getValidationMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Revisa los datos e inténtalo nuevamente.";
}

export default function PatientsPage() {
  const access = useCurrentUserAccess();
  const [activeTab, setActiveTab] = useState<"patients" | "vaccinations">("patients");
  const [pets, setPets] = useState<PetRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetRow | null>(null);
  const [formData, setFormData] = useState<PatientFormState>(emptyPatientForm);
  const [quickClientForm, setQuickClientForm] = useState<QuickClientFormState>(emptyQuickClientForm);
  const [quickClientErrors, setQuickClientErrors] = useState<Record<string, string>>({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PetRow | null>(null);

  const canCreatePets = !!access?.actions.pets.create;
  const canUpdatePets = !!access?.actions.pets.update;
  const canDeletePets = !!access?.actions.pets.delete;

  async function refreshAll() {
    setLoading(true);
    try {
      const [petsRes, clientsRes, vaccRes] = await Promise.all([
        apiListPets(),
        apiListClients(),
        apiListVaccinations(),
      ]);
      setPets(petsRes);
      setClients(clientsRes);
      setVaccinations(vaccRes);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: String(client.id),
        label: client.fullName,
        keywords: [client.phone ?? "", client.email ?? ""],
      })),
    [clients]
  );

  function handlePatientChange(event: FormFieldChangeEvent) {
    setFormData((current) => ({
      ...current,
      [event.target.name]: String(event.target.value),
    }));
  }

  function openCreate() {
    if (!canCreatePets) return;
    setEditingPet(null);
    setFormData(emptyPatientForm);
    setPatientModalOpen(true);
  }

  function openEdit(pet: PetRow) {
    if (!canUpdatePets) return;
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      clientId: String(pet.clientId),
      species: pet.species,
      sex: pet.sex,
      breed: pet.breed ?? "",
      birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : "",
      weightKg: pet.weightKg != null ? String(pet.weightKg) : "",
      color: pet.color ?? "",
      microchip: pet.microchip ?? "",
      notes: pet.notes ?? "",
    });
    setPatientModalOpen(true);
  }

  function openQuickClient(prefill = "") {
    setQuickClientErrors({});
    setQuickClientForm({
      ...emptyQuickClientForm,
      fullName: prefill,
    });
    setQuickClientOpen(true);
  }

  async function submitQuickClient() {
    const parsed = ClientFormSchema.safeParse(quickClientForm);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setQuickClientErrors(nextErrors);
      return;
    }

    try {
      setSavingClient(true);
      const created = await apiCreateClient(parsed.data);
      setClients((current) => [created, ...current]);
      setFormData((current) => ({ ...current, clientId: String(created.id) }));
      setQuickClientOpen(false);
      setQuickClientForm(emptyQuickClientForm);
      toast.success("El cliente fue registrado.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos crear el cliente. Revisa los datos e inténtalo nuevamente."
      );
    } finally {
      setSavingClient(false);
    }
  }

  async function submitPatient(event?: React.FormEvent) {
    event?.preventDefault();
    if ((editingPet && !canUpdatePets) || (!editingPet && !canCreatePets)) {
      return;
    }

    const payload = {
      ...formData,
      clientId: Number(formData.clientId),
      weightKg: formData.weightKg === "" ? undefined : Number(formData.weightKg),
      birthDate: formData.birthDate || undefined,
    };

    try {
      setSavingPatient(true);
      if (editingPet) {
        const parsed = PetUpdateSchema.safeParse(payload);
        if (!parsed.success) {
          toast.error(getValidationMessage(parsed.error));
          return;
        }

        await apiUpdatePet(editingPet.id, parsed.data);
        toast.success("El paciente fue actualizado.");
      } else {
        const parsed = PetCreateSchema.safeParse(payload);
        if (!parsed.success) {
          toast.error(getValidationMessage(parsed.error));
          return;
        }

        await apiCreatePet(parsed.data);
        toast.success("El paciente fue registrado.");
      }

      setPatientModalOpen(false);
      setEditingPet(null);
      setFormData(emptyPatientForm);
      await refreshAll();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el paciente."
      );
    } finally {
      setSavingPatient(false);
    }
  }

  function confirmDelete(pet: PetRow) {
    if (!canDeletePets) return;
    setDeleteTarget(pet);
    setDeleteOpen(true);
  }

  async function doDelete() {
    if (!deleteTarget) return;
    try {
      await apiDeletePet(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await refreshAll();
      toast.success("El paciente fue eliminado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el paciente."
      );
    }
  }

  const petColumns = [
      {
        header: "Paciente",
        cell: (row: PetRow) => (
          <div className="flex items-center gap-3">
            <div>
              <p className="font-semibold text-foreground">{row.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatSpecies(row.species)} - {row.breed || "Sin raza"}
              </p>
            </div>
          </div>
      ),
    },
    {
      header: "Propietario",
      cell: (row: PetRow) => {
        const client = clients.find((item) => item.id === row.clientId);
        return (
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{client?.fullName ?? "-"}</span>
          </div>
        );
      },
    },
    {
      header: "Edad",
      cell: (row: PetRow) => calculateAge(row.birthDate) ?? <span className="text-muted-foreground/60">-</span>,
    },
    {
      header: "Sexo",
      cell: (row: PetRow) => (
        <Badge
          className={
            row.sex === "MALE"
              ? "bg-secondary text-foreground font-semibold"
              : row.sex === "FEMALE"
                ? "bg-primary/12 text-primary font-semibold"
                : "bg-muted text-foreground font-semibold"
          }
          variant="secondary"
        >
          {row.sex === "MALE" ? "Macho" : row.sex === "FEMALE" ? "Hembra" : "Desconocido"}
        </Badge>
      ),
    },
    {
        header: "Acciones",
        cell: (row: PetRow) => (
          <div className="flex items-center gap-2">
            <Link href={`/pets/${row.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Ver paciente ${row.name}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {canUpdatePets ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => openEdit(row)}
              aria-label={`Editar paciente ${row.name}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
          ) : null}
          {canDeletePets ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => confirmDelete(row)}
              aria-label={`Eliminar paciente ${row.name}`}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const vaccinationColumns = [
    {
      header: "Paciente",
      cell: (row: VaccinationRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-xl">
            {row.pet ? speciesEmoji[row.pet.species] : "🐾"}
          </div>
          <span className="font-medium text-foreground">{row.pet?.name || "-"}</span>
        </div>
      ),
    },
    { header: "Vacuna", cell: (row: VaccinationRow) => row.vaccineName ?? row.vaccine?.name ?? "-" },
    {
      header: "Fecha Aplicación",
      cell: (row: VaccinationRow) => format(parseISO(row.appliedAt), "d MMM yyyy", { locale: es }),
    },
    {
      header: "Próxima Dosis",
      cell: (row: VaccinationRow) =>
        row.nextDueAt ? (
          format(parseISO(row.nextDueAt), "d MMM yyyy", { locale: es })
        ) : (
          <span className="text-muted-foreground/60">-</span>
        ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<PawPrint className="size-3.5" />}
        badgeLabel="Pacientes y vacunas"
        title="Pacientes"
        description="Consulta pacientes, propietarios y seguimiento clínico desde una misma vista."
        actions={
          canCreatePets ? (
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo paciente
            </Button>
          ) : null
        }
        stats={[
          { label: "Pacientes", value: pets.length, hint: "Total de pacientes" },
          { label: "Vacunas", value: vaccinations.length, hint: "Total de vacunas" },
        ]}
      />

      <div className="space-y-6">
        <div className="inline-flex rounded-2xl border border-border/70 p-1">
          <Button variant={activeTab === "patients" ? "default" : "ghost"} onClick={() => setActiveTab("patients")}>
            Pacientes
          </Button>
          <Button variant={activeTab === "vaccinations" ? "default" : "ghost"} onClick={() => setActiveTab("vaccinations")}>
            Vacunas
          </Button>
        </div>

        {activeTab === "patients" ? (
          <DataTable
            columns={petColumns}
            data={pets}
            title="Pacientes"
            description={`${pets.length} ${pets.length === 1 ? "paciente registrado" : "pacientes registrados"}`}
            searchKey="name"
            searchPlaceholder="Buscar paciente..."
            emptyMessage="No hay pacientes registrados"
          />
        ) : (
          <DataTable
            columns={vaccinationColumns}
            data={vaccinations}
            title="Vacunaciones"
            description={`${vaccinations.length} ${vaccinations.length === 1 ? "registro aplicado" : "registros aplicados"}`}
            emptyMessage="No hay vacunaciones registradas"
            searchKey={undefined}
          />
        )}
      </div>

      <Modal
        open={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        title={editingPet ? "Editar paciente" : "Nuevo paciente"}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPatientModalOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={savingPatient} onClick={() => void submitPatient()}>
              {savingPatient
                ? editingPet
                  ? "Guardando..."
                  : "Creando..."
                : editingPet
                  ? "Guardar cambios"
                  : "Crear paciente"}
            </Button>
          </div>
        }
      >
        <form onSubmit={(event) => void submitPatient(event)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nombre" name="name" value={formData.name} onChange={handlePatientChange} required />

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground/90">
                Dueño / responsable
                <span className="ml-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-600">
                  (Obligatorio)
                </span>
              </Label>
              <SearchableSelect
                allowCustomValue
                customValueLabel={(input) => `+ Registrar nuevo dueño: "${input}"`}
                emptyMessage="No encontramos clientes."
                onValueChange={(nextValue, detail) => {
                  if (detail?.isCustom) {
                    openQuickClient(nextValue);
                    return;
                  }
                  setFormData((current) => ({ ...current, clientId: nextValue }));
                }}
                options={clientOptions}
                placeholder="Seleccionar cliente"
                searchPlaceholder="Buscar por nombre, teléfono o correo..."
                value={formData.clientId}
              />
            </div>

            <FormField
              label="Especie"
              name="species"
              type="select"
              value={formData.species}
              onChange={handlePatientChange}
              options={speciesOptions}
              required
              searchPlaceholder="Buscar especie..."
            />
            <FormField label="Raza" name="breed" value={formData.breed} onChange={handlePatientChange} />
            <FormField label="Fecha de nacimiento" name="birthDate" type="date" value={formData.birthDate} onChange={handlePatientChange} />
            <FormField
              label="Sexo"
              name="sex"
              type="select"
              value={formData.sex}
              onChange={handlePatientChange}
              options={sexOptions}
              searchPlaceholder="Buscar sexo..."
            />
            <FormField label="Peso (kg)" name="weightKg" type="number" value={formData.weightKg} onChange={handlePatientChange} />
            <FormField label="Color / pelaje" name="color" value={formData.color} onChange={handlePatientChange} />
            <FormField label="Microchip" name="microchip" value={formData.microchip} onChange={handlePatientChange} />
            <FormField
              label="Notas"
              name="notes"
              type="textarea"
              value={formData.notes}
              onChange={handlePatientChange}
              className="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={quickClientOpen}
        onClose={() => setQuickClientOpen(false)}
        title="Registrar nuevo dueño"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setQuickClientOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={savingClient} onClick={() => void submitQuickClient()}>
              {savingClient ? "Creando..." : "Crear cliente"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="quick-client-name" className="text-sm font-semibold text-foreground/90">
              Nombre completo
            </Label>
            <Input
              id="quick-client-name"
              value={quickClientForm.fullName}
              onChange={(event) =>
                setQuickClientForm((current) => ({ ...current, fullName: event.target.value }))
              }
            />
            {quickClientErrors.fullName ? (
              <p className="text-sm font-medium text-red-500">{quickClientErrors.fullName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-client-phone" className="text-sm font-semibold text-foreground/90">
              Teléfono
            </Label>
            <PhoneInput
              id="quick-client-phone"
              value={quickClientForm.phone}
              onChange={(event) =>
                setQuickClientForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            {quickClientErrors.phone ? (
              <p className="text-sm font-medium text-red-500">{quickClientErrors.phone}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-client-email" className="text-sm font-semibold text-foreground/90">
              Correo electrónico
            </Label>
            <Input
              id="quick-client-email"
              type="email"
              value={quickClientForm.email}
              onChange={(event) =>
                setQuickClientForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            {quickClientErrors.email ? (
              <p className="text-sm font-medium text-red-500">{quickClientErrors.email}</p>
            ) : null}
          </div>
        </div>
      </Modal>

      <ModalDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar paciente"
        itemName={deleteTarget?.name}
        onConfirm={doDelete}
      />
    </div>
  );
}
