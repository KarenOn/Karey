"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, User as UserIcon, PawPrint } from "lucide-react";
import { format, differenceInYears, differenceInMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import DataTable from "@/components/shared/Datatable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";

// (opcional) si ya creaste tu ModalDelete shared, úsalo:
import ModalDelete from "@/components/shared/ModalDelete";

import { PetCreateSchema, PetUpdateSchema } from "@/lib/validators/pet";
import { apiCreatePet, apiDeletePet, apiListPets, apiUpdatePet, type PetRow } from "@/lib/api/pets";
import { apiListClients, type ClientRow } from "@/lib/api/clients";
import { apiListVaccinations, type VaccinationRow } from "@/lib/api/vaccinations";
import Link from "next/link";
import AppPageHero from "@/components/shared/AppPageHero";

const speciesEmoji: Record<string, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  OTHER: "🐾",
};

const speciesOptions = [
  { value: "DOG", label: "🐕 Perro" },
  { value: "CAT", label: "🐱 Gato" },
  { value: "BIRD", label: "🦜 Ave" },
  { value: "RABBIT", label: "🐰 Conejo" },
  { value: "OTHER", label: "🐾 Otro" },
];

const sexOptions = [
  { value: "MALE", label: "Macho" },
  { value: "FEMALE", label: "Hembra" },
  { value: "UNKNOWN", label: "Desconocido" },
];

type PatientForm = {
  name: string,
  clientId: number,
  species: string,
  sex: string,
  breed: string,
  birthDate: string,
  weightKg: string,
  color: string,
  microchip: string,
  notes: string,
};

const emptyForm: PatientForm = {
  name: "",
  clientId: 0,
  species: "",
  sex: "",
  breed: "",
  birthDate: "",
  weightKg: "",
  color: "",
  microchip: "",
  notes: "",
}

type PetFormState = {
  name?: string;
  clientId?: string | number;
  species?: string;
  sex?: string;
  breed?: string;
  birthDate?: string;
  weightKg?: string | number;
  color?: string;
  microchip?: string;
  notes?: string;
};

export default function PatientsPage() {
  const [activeTab, setActiveTab] = useState<"patients" | "vaccinations">("patients");

  const [pets, setPets] = useState<PetRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetRow | null>(null);
  const [formData, setFormData] = useState<PetFormState>({ sex: "UNKNOWN" });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PetRow | null>(null);

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
    refreshAll();
  }, []);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: c.id, label: c.fullName })),
    [clients]
  );

  const getClientName = (clientId: number) =>
    clients.find((c) => c.id === clientId)?.fullName ?? "-";

  const calculateAge = (birthDateISO: string | null) => {
    if (!birthDateISO) return null;
    const d = parseISO(birthDateISO);
    const years = differenceInYears(new Date(), d);
    if (years > 0) return `${years} año${years > 1 ? "s" : ""}`;
    const months = differenceInMonths(new Date(), d);
    return `${months} mes${months > 1 ? "es" : ""}`;
  };

  const handleChange = (e: any) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value ?? e;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const openCreate = () => {
    setEditingPet(null);
    setFormData({ sex: "UNKNOWN" });
    setModalOpen(true);
  };

  const openEdit = (pet: PetRow) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      clientId: pet.clientId,
      species: pet.species,
      sex: pet.sex,
      breed: pet.breed ?? "",
      birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : "",
      weightKg: pet.weightKg ?? "",
      color: pet.color ?? "",
      microchip: pet.microchip ?? "",
      notes: pet.notes ?? "",
    });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPet) {
      console.log("Updating pet with data:", formData);
      const parsed = PetUpdateSchema.safeParse(formData);
      if (!parsed.success) {
        console.error(parsed.error.flatten());
        alert("Revisa los campos del formulario (update).");
        return;
      }
      await apiUpdatePet(editingPet.id, parsed.data);
    } else {
      const parsed = PetCreateSchema.safeParse(formData);
      if (!parsed.success) {
        console.error(parsed.error.flatten());
        alert("Revisa los campos del formulario (create).");
        return;
      }
      await apiCreatePet(parsed.data);
    }

    setModalOpen(false);
    setEditingPet(null);
    setFormData({ sex: "UNKNOWN" });
    await refreshAll();
  };

  const confirmDelete = (pet: PetRow) => {
    setDeleteTarget(pet);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    await apiDeletePet(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
    await refreshAll();
  };

  const petColumns = [
    {
      header: "Paciente",
      cell: (row: PetRow) => (
        <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-border/70 bg-secondary text-2xl">
            {speciesEmoji[row.species] || "🐾"}
          </div>
          <div>
              <p className="font-semibold text-foreground">{row.name}</p>
              <p className="text-sm text-muted-foreground">
              {row.species} • {row.breed || "Sin raza"}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Propietario",
      cell: (row: PetRow) => (
        <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{getClientName(row.clientId)}</span>
        </div>
      ),
    },
    {
      header: "Edad",
      cell: (row: PetRow) =>
        calculateAge(row.birthDate) || <span className="text-muted-foreground/60">-</span>,
    },
    {
      header: "Sexo",
      cell: (row: PetRow) => (
          <Badge className={row.sex === "MALE" ? "bg-secondary text-foreground font-semibold" : row.sex === "FEMALE" ? "bg-primary/12 text-primary font-semibold" : "bg-muted text-foreground font-semibold"} variant="secondary">
          {row.sex === "MALE" ? "Macho" : row.sex === "FEMALE" ? "Hembra" : "Desconocido"}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      cell: (row: PetRow) => (
        <div className="flex items-center gap-2">
          <Link href={`/pets/${row.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => openEdit(row)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => confirmDelete(row)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const vaccinationColumns = [
    {
      header: "Paciente",
      cell: (row: VaccinationRow) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-xl">
            {row.pet ? speciesEmoji[row.pet.species] : "🐾"}
          </div>
          <span className="font-medium text-foreground">{row.pet?.name || "-"}</span>
        </div>
      ),
    },
    { header: "Vacuna", cell: (row: VaccinationRow) => row.vaccine?.name ?? "-" },
    {
      header: "Fecha Aplicación",
      cell: (row: VaccinationRow) =>
        format(parseISO(row.appliedAt), "d MMM yyyy", { locale: es }),
    },
    {
      header: "Próxima Dosis",
      cell: (row: VaccinationRow) =>
        row.nextDueAt
          ? format(parseISO(row.nextDueAt), "d MMM yyyy", { locale: es })
          : <span className="text-muted-foreground/60">-</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <div className="app-page-hero flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="app-kicker mb-3 border-0">Pacientes y vacunas</div>
          <h2 className="app-heading text-3xl sm:text-4xl">Mascotas con mejor contexto y una lectura mÃ¡s cÃ³moda.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Gestiona pacientes, propietarios y su historial con una interfaz mÃ¡s densa, amable y consistente con el resto de la app.</p>
        </div>
        <Button
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Paciente
        </Button>
      </div> */}

      <AppPageHero
        badgeIcon={<PawPrint className="size-3.5" />}
        badgeLabel="Pacientes y vacunas"
        title="Pacientes"
        description="Gestiona pacientes, propietarios y su historial"
        actions={
          <Button
            className="gap-2"
            onClick={() => {
              setEditingPet(null);
              setFormData(emptyForm);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Nuevo paciente
          </Button>
        }
        stats={[
          { label: "Pacientes", value: pets.length, hint: "Total de pacientes" },
          { label: "Vacunas", value: vaccinations.length, hint: "Total de vacunas" },
          // { label: "Con mascotas", value: clientsWithPets, hint: "Historias activas" },
          // { label: "Mascotas", value: totalPets, hint: "Pacientes vinculados" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
          <TabsTrigger value="vaccinations">Vacunas</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="mt-6">
          <DataTable
            columns={petColumns}
            data={pets}
            searchKey="name"
            searchPlaceholder="Buscar paciente..."
            emptyMessage="No hay pacientes registrados"
            
          />
        </TabsContent>

        <TabsContent value="vaccinations" className="mt-6">
          <DataTable
            columns={vaccinationColumns}
            data={vaccinations}
            searchKey={undefined}
            emptyMessage="No hay vacunaciones registradas"
          />
        </TabsContent>
      </Tabs>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPet ? "Editar Paciente" : "Nuevo Paciente"}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} className="bg-gradient-to-r from-teal-500 to-teal-600">
              {editingPet ? "Guardar Cambios" : "Crear Paciente"}
            </Button>
          </div>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nombre" name="name" value={formData.name} onChange={handleChange} required />
            <FormField
              label="Propietario"
              name="clientId"
              type="select"
              value={formData.clientId}
              onChange={handleChange}
              options={clientOptions}
              required
            />
            <FormField
              label="Especie"
              name="species"
              type="select"
              value={formData.species}
              onChange={handleChange}
              options={speciesOptions}
              required
            />
            <FormField label="Raza" name="breed" value={formData.breed} onChange={handleChange} />
            <FormField label="Fecha de Nacimiento" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} />
            <FormField label="Sexo" name="sex" type="select" value={formData.sex} onChange={handleChange} options={sexOptions} />

            <FormField label="Peso (kg)" name="weightKg" type="number" value={formData.weightKg} onChange={handleChange} />
            <FormField label="Color/Pelaje" name="color" value={formData.color} onChange={handleChange} />
            <FormField label="Microchip" name="microchip" value={formData.microchip} onChange={handleChange} />

            <FormField
              label="Notas"
              name="notes"
              type="textarea"
              value={formData.notes}
              onChange={handleChange}
              className="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>

      <ModalDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar paciente"
        itemName={deleteTarget?.name}
        // description={`¿Seguro que deseas eliminar a "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        // dangerText="Eliminar"
        // onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={doDelete}
      />
    </div>
  );
}
