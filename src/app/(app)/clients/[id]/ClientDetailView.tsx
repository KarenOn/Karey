"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Phone,
  Mail,
  MapPin,
  PawPrint,
  Calendar,
  Clock3,
  FileText,
  Eye,
  UserRound,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "@/components/shared/Modal";
import ClientForm from "@/components/shared/ClientForm";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { apiUpdateClient } from "@/lib/api/clients";
import { ClientFormSchema, zodFieldErrors, type ClientFormValues } from "@/lib/validators/client";
import type { FormFieldChangeEvent } from "@/components/shared/FormField";
import { toast } from "sonner";
import BackButton from "@/components/shared/BackButton";
import { formatCurrency } from "@/lib/utility";
import DataTable, { type DataTableRow } from "@/components/shared/Datatable";

type PetSpecies = "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";

type ClientDTO = {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  identificationType: "CEDULA" | "RNC" | "PASSPORT_OTHER" | null;
  identificationNumber: string | null;
  createdAt: string;
};

type PetDTO = {
  id: number;
  name: string;
  species: PetSpecies;
  breed: string | null;
  createdAt: string;
};

type AppointmentDTO = {
  id: number;
  startAt: string;
  status:
    | "SCHEDULED"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW";
  reason: string;
  pet: { id: number; name: string; species: PetSpecies } | null;
  vet: { id: string; name: string } | null;
};

type InvoiceDTO = {
  id: number;
  number: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "VOID";
  issueDate: string;
  total: number;
  pet: { id: number; name: string } | null;
};
type ClientPetRow = DataTableRow & PetDTO;
type ClientAppointmentRow = DataTableRow & AppointmentDTO & { searchText: string };
type ClientInvoiceRow = DataTableRow & InvoiceDTO & { searchText: string };
type ClientActivity = { id: string; kind: "appointment" | "invoice"; date: string; title: string; detail: string; href: string };

const speciesEmoji: Record<PetSpecies, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  OTHER: "🐾",
};

const appointmentStatusLabel: Record<AppointmentDTO["status"], string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Atendida",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistio",
};

const appointmentStatusColors: Record<AppointmentDTO["status"], string> = {
  SCHEDULED: "border-blue-500/20 bg-blue-500/12 text-blue-700 dark:text-blue-300",
  CONFIRMED: "border-green-500/20 bg-green-500/12 text-green-700 dark:text-green-300",
  IN_PROGRESS: "border-yellow-500/20 bg-yellow-500/12 text-yellow-700 dark:text-yellow-300",
  COMPLETED: "border-teal-500/20 bg-teal-500/12 text-teal-700 dark:text-teal-300",
  CANCELLED: "border-red-500/20 bg-red-500/12 text-red-700 dark:text-red-300",
  NO_SHOW: "border-border bg-muted/70 text-muted-foreground",
};

const invoiceStatusLabel: Record<InvoiceDTO["status"], string> = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  PAID: "Pagada",
  PARTIALLY_PAID: "Pago parcial",
  VOID: "Anulada",
};

const invoiceStatusColors: Record<InvoiceDTO["status"], string> = {
  DRAFT: "border-border bg-muted/70 text-muted-foreground",
  ISSUED: "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  PAID: "border-green-500/20 bg-green-500/12 text-green-700 dark:text-green-300",
  PARTIALLY_PAID: "border-blue-500/20 bg-blue-500/12 text-blue-700 dark:text-blue-300",
  VOID: "border-red-500/20 bg-red-500/12 text-red-700 dark:text-red-300",
};

export default function ClientDetailView({
  client,
  pets,
  appointments,
  invoices,
  totalSpent,
  currency,
}: {
  clinicName: string;
  currency: string;
  client: ClientDTO;
  pets: PetDTO[];
  appointments: AppointmentDTO[];
  invoices: InvoiceDTO[];
  totalSpent: number;
}) {
  const [clientData, setClientData] = useState(client);
  const access = useCurrentUserAccess();
  const canEditClient = !!access?.actions.clients.update;
  const canCreatePets = !!access?.actions.pets.create;
  const isReservedClient = clientData.fullName === "VENTA GENERAL";
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<ClientFormValues>({
    fullName: clientData.fullName,
    phone: clientData.phone ?? "",
    email: clientData.email ?? "",
    address: clientData.address ?? "",
    notes: clientData.notes ?? "",
    identificationType: clientData.identificationType ?? "",
    identificationNumber: clientData.identificationNumber ?? "",
  });
  const [activeTab, setActiveTab] = useState("summary");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const [appointmentPetFilter, setAppointmentPetFilter] = useState("all");
  const [appointmentFrom, setAppointmentFrom] = useState("");
  const [appointmentTo, setAppointmentTo] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");

  function openEdit() {
    setFormValues({ fullName: clientData.fullName, phone: clientData.phone ?? "", email: clientData.email ?? "", address: clientData.address ?? "", notes: clientData.notes ?? "", identificationType: clientData.identificationType ?? "", identificationNumber: clientData.identificationNumber ?? "" });
    setErrors({});
    setEditOpen(true);
  }

  function handleChange(event: FormFieldChangeEvent) {
    setFormValues((current) => ({ ...current, [event.target.name]: String(event.target.value) }));
    setErrors((current) => { const next = { ...current }; delete next[event.target.name]; return next; });
  }

  async function saveEdit() {
    const parsed = ClientFormSchema.safeParse(formValues);
    if (!parsed.success) { setErrors(zodFieldErrors(parsed.error)); return; }
    setSaving(true);
    try {
      const updated = await apiUpdateClient(clientData.id, parsed.data);
      setClientData((current) => ({ ...current, ...updated }));
      setEditOpen(false);
      toast.success("El cliente fue actualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el cliente.");
    } finally { setSaving(false); }
  }

  const petRows: ClientPetRow[] = pets;
  const appointmentRows: ClientAppointmentRow[] = appointments
    .filter((appointment) => appointmentStatusFilter === "all" || appointment.status === appointmentStatusFilter)
    .filter((appointment) => appointmentPetFilter === "all" || String(appointment.pet?.id) === appointmentPetFilter)
    .filter((appointment) => !appointmentFrom || appointment.startAt.slice(0, 10) >= appointmentFrom)
    .filter((appointment) => !appointmentTo || appointment.startAt.slice(0, 10) <= appointmentTo)
    .map((appointment) => ({
      ...appointment,
      searchText: `${appointment.reason} ${appointment.pet?.name ?? ""} ${appointment.vet?.name ?? ""} ${appointment.status}`,
    }));
  const invoiceRows: ClientInvoiceRow[] = invoices
    .filter((invoice) => invoiceStatusFilter === "all" || invoice.status === invoiceStatusFilter)
    .map((invoice) => ({
      ...invoice,
      searchText: `${invoice.number} ${invoice.pet?.name ?? ""} ${invoice.status}`,
    }));
  const nextAppointment = appointments
    .filter((appointment) => !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appointment.status) && parseISO(appointment.startAt).getTime() >= Date.now())
    .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime())[0] ?? null;
  const recentActivity: ClientActivity[] = [
    ...appointments.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      kind: "appointment" as const,
      date: appointment.startAt,
      title: appointment.reason || "Consulta",
      detail: `${appointment.pet?.name ?? "Mascota"} · Cita ${appointmentStatusLabel[appointment.status]}`,
      href: `/appointments/${appointment.id}`,
    })),
    ...invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      kind: "invoice" as const,
      date: invoice.issueDate,
      title: invoice.number,
      detail: `Factura ${invoiceStatusLabel[invoice.status]}`,
      href: `/invoices/${invoice.id}`,
    })),
  ].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).slice(0, 5);

  return (
    <div className="space-y-5">
      <header className="app-page-hero flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BackButton href="/clients" />
          <span aria-hidden="true">/</span>
          <span>Clientes</span>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground">{clientData.fullName}</span>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="app-stat-icon h-14 w-14 shrink-0 text-xl font-semibold">{clientData.fullName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0">
              <p className="app-kicker mb-1 border-0">Detalle de cliente</p>
              <h1 className="app-heading truncate text-3xl sm:text-4xl">{clientData.fullName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Cliente desde {format(parseISO(client.createdAt), "MMMM yyyy", { locale: es })}</p>
              {clientData.identificationNumber ? <p className="mt-1 text-xs text-muted-foreground">{clientData.identificationType === "CEDULA" ? "Cédula" : clientData.identificationType === "RNC" ? "RNC" : "Pasaporte/Otro"}: {clientData.identificationNumber}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {canEditClient && !isReservedClient ? <Button size="sm" variant="outline" onClick={openEdit}><UserRound className="mr-1 h-4 w-4" />Editar cliente</Button> : null}
          </div>
        </div>
        <div className="grid gap-3 border-t border-border/70 pt-4 md:grid-cols-2">
          <div className="app-panel-muted flex items-center gap-3 p-3"><Phone className="h-4 w-4 text-primary" /><div><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Teléfono</p><p className="text-sm font-medium text-foreground">{clientData.phone ?? "Sin teléfono"}</p></div></div>
          <div className="app-panel-muted flex items-center gap-3 p-3"><Mail className="h-4 w-4 text-primary" /><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Correo electrónico</p><p className="truncate text-sm font-medium text-foreground">{clientData.email ?? "Sin correo"}</p></div></div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="app-panel-strong overflow-x-auto p-2">
          <TabsList className="min-w-max justify-start">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="pets">Mascotas ({pets.length})</TabsTrigger>
            <TabsTrigger value="appointments">Citas ({appointments.length})</TabsTrigger>
            <TabsTrigger value="billing">Facturación</TabsTrigger>
            <TabsTrigger value="information">Información</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryPanel title="Mascotas" icon={PawPrint} action={<Button size="sm" variant="ghost" onClick={() => setActiveTab("pets")}>Ver todas</Button>}>
                {pets.length === 0 ? <EmptyPanel message="No tiene mascotas registradas" /> : <div className="space-y-2">{pets.slice(0, 3).map((pet) => <Link key={pet.id} href={`/pets/${pet.id}`} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/45"><span className="app-stat-icon h-9 w-9 text-lg">{speciesEmoji[pet.species] ?? "🐾"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{pet.name}</span><span className="block text-xs text-muted-foreground">{pet.species} · {pet.breed || "Sin raza"}</span></span><Eye className="h-4 w-4 text-muted-foreground" /></Link>)}</div>}
              </SummaryPanel>
              <SummaryPanel title="Próxima cita" icon={Calendar} action={<Button size="sm" variant="ghost" onClick={() => setActiveTab("appointments")}>Ver todas</Button>}>
                {nextAppointment ? <div className="space-y-3"><div><p className="font-semibold text-foreground">{nextAppointment.reason || "Consulta"}</p><p className="mt-1 text-sm text-muted-foreground">{nextAppointment.pet?.name ?? "Mascota"}</p></div><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-foreground">{format(parseISO(nextAppointment.startAt), "d MMM yyyy", { locale: es })}</p><p className="text-sm text-muted-foreground">{format(parseISO(nextAppointment.startAt), "HH:mm")}</p></div><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${appointmentStatusColors[nextAppointment.status]}`}>{appointmentStatusLabel[nextAppointment.status]}</span></div></div> : <EmptyPanel message="No hay próxima cita registrada" />}
              </SummaryPanel>
              <SummaryPanel title="Resumen de facturación" icon={FileText} action={<Button size="sm" variant="ghost" onClick={() => setActiveTab("billing")}>Ver todas</Button>}>
                <div className="space-y-3"><div><p className="text-xs text-muted-foreground">Total pagado</p><p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(totalSpent, currency)}</p></div><div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3"><div><p className="text-xs text-muted-foreground">Facturas</p><p className="font-semibold text-foreground">{invoices.length}</p></div><div><p className="text-xs text-muted-foreground">Pagadas</p><p className="font-semibold text-foreground">{invoices.filter((invoice) => invoice.status === "PAID").length}</p></div></div></div>
              </SummaryPanel>
              <SummaryPanel title="Información del cliente" icon={UserRound} action={<Button size="sm" variant="ghost" onClick={() => setActiveTab("information")}>Ver información</Button>}>
                <div className="space-y-2 text-sm"><InfoLine label="Nombre" value={clientData.fullName} /><InfoLine label="Teléfono" value={clientData.phone ?? "Sin teléfono"} /><InfoLine label="Correo" value={clientData.email ?? "Sin correo"} /></div>
              </SummaryPanel>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <SummaryPanel title="Actividad reciente" icon={Clock3}>
                {recentActivity.length === 0 ? <EmptyPanel message="Sin actividad registrada" /> : <div className="divide-y divide-border/60">{recentActivity.map((event) => <Link key={event.id} href={event.href} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="app-stat-icon h-8 w-8">{event.kind === "appointment" ? <Calendar className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{event.title}</span><span className="block truncate text-xs text-muted-foreground">{event.detail}</span></span><span className="shrink-0 text-xs text-muted-foreground">{format(parseISO(event.date), "d MMM", { locale: es })}</span></Link>)}</div>}
              </SummaryPanel>
              <SummaryPanel title="Próximas citas" icon={Calendar} action={<Button size="sm" variant="ghost" onClick={() => setActiveTab("appointments")}>Ver todas</Button>}>
                {appointments.filter((appointment) => !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appointment.status) && parseISO(appointment.startAt).getTime() >= Date.now()).sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()).slice(0, 3).map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)}
                {!appointments.some((appointment) => !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appointment.status) && parseISO(appointment.startAt).getTime() >= Date.now()) ? <EmptyPanel message="No hay próximas citas" /> : null}
              </SummaryPanel>
              <SummaryPanel title="Últimas facturas" icon={FileText} action={<Button size="sm" variant="ghost" onClick={() => setActiveTab("billing")}>Ver todas</Button>}>
                {invoices.length === 0 ? <EmptyPanel message="Sin facturas registradas" /> : invoices.slice(0, 3).map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} currency={currency} />)}
              </SummaryPanel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pets">
          <DataTable
            title="Mascotas"
            description="Mascotas registradas a nombre de este cliente."
            data={petRows}
            searchPlaceholder="Buscar mascota..."
            searchKeys={["name", "species", "breed"]}
            emptyMessage="No tiene mascotas registradas"
            actions={canCreatePets ? <Button asChild size="sm"><Link href="/pets">Agregar mascota</Link></Button> : null}
            columns={[
              { header: "Nombre", cell: (pet) => <Link className="font-semibold text-primary hover:underline" href={`/pets/${pet.id}`}>{pet.name}</Link> },
              { header: "Especie", cell: (pet) => <span className="text-muted-foreground">{speciesEmoji[pet.species] ?? "🐾"} {pet.species}</span> },
              { header: "Raza", cell: (pet) => <span className="text-muted-foreground">{pet.breed || "—"}</span> },
              { header: "Registro", cell: (pet) => format(parseISO(pet.createdAt), "d MMM yyyy", { locale: es }) },
              { header: "Acciones", cell: (pet) => <Link className="text-sm font-semibold text-primary hover:underline" href={`/pets/${pet.id}`}>Ver expediente</Link> },
            ]}
          />
        </TabsContent>

        <TabsContent value="appointments">
          <DataTable
            title="Citas"
            description="Citas registradas para las mascotas de este cliente."
            data={appointmentRows}
            searchPlaceholder="Buscar por motivo, mascota o veterinario..."
            searchPredicate={(appointment, query) => appointment.searchText.toLowerCase().includes(query)}
            emptyMessage="Sin citas que coincidan con los filtros"
            actions={<><Select value={appointmentStatusFilter} onValueChange={(value) => { setAppointmentStatusFilter(value); }}><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem>{Object.entries(appointmentStatusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={appointmentPetFilter} onValueChange={setAppointmentPetFilter}><SelectTrigger><SelectValue placeholder="Mascota" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las mascotas</SelectItem>{pets.map((pet) => <SelectItem key={pet.id} value={String(pet.id)}>{pet.name}</SelectItem>)}</SelectContent></Select><Input type="date" aria-label="Cita desde" value={appointmentFrom} onChange={(event) => setAppointmentFrom(event.target.value)} /><Input type="date" aria-label="Cita hasta" value={appointmentTo} onChange={(event) => setAppointmentTo(event.target.value)} /></>}
            columns={[
              { header: "Fecha", cell: (appointment) => format(parseISO(appointment.startAt), "d MMM yyyy", { locale: es }) },
              { header: "Hora", cell: (appointment) => format(parseISO(appointment.startAt), "HH:mm") },
              { header: "Mascota", cell: (appointment) => appointment.pet ? <Link className="font-medium text-primary hover:underline" href={`/pets/${appointment.pet.id}`}>{appointment.pet.name}</Link> : <span className="text-muted-foreground">—</span> },
              { header: "Motivo", cell: (appointment) => appointment.reason || "Consulta" },
              { header: "Veterinario", cell: (appointment) => appointment.vet?.name || <span className="text-muted-foreground">Sin asignar</span> },
              { header: "Estado", cell: (appointment) => <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${appointmentStatusColors[appointment.status]}`}>{appointmentStatusLabel[appointment.status]}</span> },
              { header: "Acciones", cell: (appointment) => <Link className="text-sm font-semibold text-primary hover:underline" href={`/appointments/${appointment.id}`}>Ver detalle</Link> },
            ]}
          />
        </TabsContent>

        <TabsContent value="billing">
          <DataTable
            title="Facturación"
            description="Facturas asociadas a este cliente, con o sin mascota."
            data={invoiceRows}
            searchPlaceholder="Buscar factura o mascota..."
            searchPredicate={(invoice, query) => invoice.searchText.toLowerCase().includes(query)}
            emptyMessage="Sin facturas que coincidan con los filtros"
            actions={<Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem>{Object.entries(invoiceStatusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>}
            columns={[
              { header: "Referencia", cell: (invoice) => <Link className="font-semibold text-primary hover:underline" href={`/invoices/${invoice.id}`}>{invoice.number}</Link> },
              { header: "Fecha", cell: (invoice) => format(parseISO(invoice.issueDate), "d MMM yyyy", { locale: es }) },
              { header: "Mascota", cell: (invoice) => invoice.pet ? <Link className="text-primary hover:underline" href={`/pets/${invoice.pet.id}`}>{invoice.pet.name}</Link> : <span className="text-muted-foreground">Sin mascota</span> },
              { header: "Monto", cell: (invoice) => <span className="font-semibold">{formatCurrency(invoice.total, currency)}</span> },
              { header: "Estado", cell: (invoice) => <Badge className={invoiceStatusColors[invoice.status]}>{invoiceStatusLabel[invoice.status]}</Badge> },
              { header: "Acciones", cell: (invoice) => <Link className="text-sm font-semibold text-primary hover:underline" href={`/invoices/${invoice.id}`}>Ver detalle</Link> },
            ]}
          />
        </TabsContent>

        <TabsContent value="information">
          <div className="app-panel-strong space-y-5 p-5 sm:p-6">
            <PanelHeading icon={UserRound} title="Información del cliente" description="Datos generales, contacto y notas registradas." />
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-border/70 bg-background p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-foreground">Datos generales</h3>{canEditClient && !isReservedClient ? <Button size="sm" variant="outline" onClick={openEdit}>Editar</Button> : null}</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2"><InfoLine label="Nombre completo" value={clientData.fullName} /><InfoLine label="Tipo de identificación" value={clientData.identificationType === "CEDULA" ? "Cédula" : clientData.identificationType === "RNC" ? "RNC" : clientData.identificationType === "PASSPORT_OTHER" ? "Pasaporte/Otro" : "No registrado"} /><InfoLine label="Número de identificación" value={clientData.identificationNumber ?? "No registrado"} /><InfoLine label="Fecha de registro" value={format(parseISO(clientData.createdAt), "d MMM yyyy", { locale: es })} /></div>
              </section>
              <section className="rounded-lg border border-border/70 bg-background p-4"><h3 className="font-semibold text-foreground">Contacto</h3><div className="mt-4 space-y-4"><InfoRow icon={Phone} label="Teléfono" value={clientData.phone ?? "Sin teléfono"} /><InfoRow icon={Mail} label="Correo electrónico" value={clientData.email ?? "Sin correo"} /></div></section>
              {clientData.address ? <section className="rounded-lg border border-border/70 bg-background p-4"><h3 className="font-semibold text-foreground">Dirección</h3><div className="mt-4"><InfoRow icon={MapPin} label="Dirección registrada" value={clientData.address} /></div></section> : null}
              <section className="rounded-lg border border-border/70 bg-background p-4"><h3 className="font-semibold text-foreground">Notas</h3><p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{clientData.notes || "Sin notas registradas"}</p></section>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Modal open={editOpen} onClose={setEditOpen} title="Editar cliente" footer={<div className="flex gap-3"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button><Button disabled={saving} onClick={() => void saveEdit()}>{saving ? "Guardando..." : "Guardar cambios"}</Button></div>}>
        <ClientForm values={formValues} errors={errors} onChange={handleChange} lockName={isReservedClient} />
      </Modal>
    </div>
  );
}
function SummaryPanel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return <section className="app-panel-strong min-w-0 overflow-hidden p-4"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex min-w-0 items-center gap-2 font-semibold text-foreground"><Icon className="h-4 w-4 shrink-0 text-primary" />{title}</h3>{action}</div>{children}</section>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium text-foreground">{value}</p></div>;
}

function PanelHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return <div className="border-b border-border/70 p-5"><h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Icon className="h-5 w-5 text-primary" />{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="p-6 text-center text-sm text-muted-foreground">{message}</div>;
}

function AppointmentRow({ appointment }: { appointment: AppointmentDTO }) {
  return <div className="p-4 transition-colors hover:bg-muted/45"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate font-medium text-foreground">{appointment.reason || "Consulta"}</p><p className="text-sm text-muted-foreground">{appointment.pet?.name ?? "Mascota"} • {format(parseISO(appointment.startAt), "HH:mm")}</p></div><div className="shrink-0 text-right"><p className="text-sm font-medium text-muted-foreground">{format(parseISO(appointment.startAt), "d MMM", { locale: es })}</p><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${appointmentStatusColors[appointment.status]}`}>{appointmentStatusLabel[appointment.status]}</span></div></div></div>;
}

function InvoiceRow({ invoice, currency }: { invoice: InvoiceDTO; currency: string }) {
  return <Link href={`/invoices/${invoice.id}`}><div className="p-4 transition-colors hover:bg-muted/45"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-medium text-foreground">{invoice.number}</p><p className="text-sm text-muted-foreground">{format(parseISO(invoice.issueDate), "d MMM yyyy", { locale: es })}</p></div><div className="shrink-0 text-right"><p className="font-semibold text-foreground">{formatCurrency(invoice.total, currency)}</p><Badge className={invoiceStatusColors[invoice.status]}>{invoiceStatusLabel[invoice.status]}</Badge></div></div></div></Link>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-foreground">
      <div className="app-stat-icon h-10 w-10 rounded-[1rem]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

