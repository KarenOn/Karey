"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  PawPrint,
  Calendar,
  FileText,
  Eye,
  UserRound,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type PetSpecies = "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";

type ClientDTO = {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
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
};

type InvoiceDTO = {
  id: number;
  number: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "VOID";
  issueDate: string;
  total: number;
};

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
}: {
  clinicName: string;
  client: ClientDTO;
  pets: PetDTO[];
  appointments: AppointmentDTO[];
  invoices: InvoiceDTO[];
  totalSpent: number;
}) {
  return (
    <div className="space-y-6">
      <div className="app-page-hero flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="rounded-2xl">
          <Link href="/clients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1">
          <p className="app-kicker mb-3 inline-flex border-0">Detalle de cliente</p>
          <h2 className="app-heading text-3xl sm:text-4xl">{client.fullName}</h2>
          <p className="mt-2 text-muted-foreground">
            Cliente desde {format(parseISO(client.createdAt), "MMMM yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="app-panel-strong p-6"
        >
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-teal)_82%,white_18%),color-mix(in_srgb,var(--brand-navy)_82%,white_18%))] text-2xl font-bold text-white">
              {client.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{client.fullName}</h3>
              <p className="text-sm text-muted-foreground">Propietario</p>
            </div>
          </div>

          <div className="space-y-4">
            <InfoRow icon={Phone} label="Telefono" value={client.phone ?? "-"} />
            {client.email ? <InfoRow icon={Mail} label="Email" value={client.email} /> : null}
            {client.address ? <InfoRow icon={MapPin} label="Dirección" value={client.address} /> : null}
          </div>

          {client.notes ? (
            <div className="mt-6 border-t border-border/70 pt-4">
              <p className="mb-1 text-xs text-muted-foreground">Notas</p>
              <p className="text-sm text-foreground">{client.notes}</p>
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/70 pt-4">
            <MiniStat label="Mascotas" value={pets.length} tone="text-primary" />
            <MiniStat label="Citas" value={appointments.length} tone="text-[var(--brand-navy)] dark:text-blue-300" />
            <MiniStat
              label="Total"
              value={`$${totalSpent.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
              tone="text-emerald-600 dark:text-emerald-300"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="app-panel-strong overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border/70 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <PawPrint className="h-5 w-5 text-primary" />
              Mascotas ({pets.length})
            </h3>
          </div>

          <div className="divide-y divide-border/50">
            {pets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No tiene mascotas registradas
              </div>
            ) : (
              pets.map((pet) => (
                <Link key={pet.id} href={`/pets/${pet.id}`}>
                  <div className="p-4 transition-colors hover:bg-muted/45">
                    <div className="flex items-center gap-3">
                      <div className="app-stat-icon text-2xl">{speciesEmoji[pet.species] ?? "🐾"}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{pet.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pet.species} • {pet.breed || "Sin raza"}
                        </p>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <ActivityPanel
            title="Últimas Citas"
            icon={Calendar}
            iconClassName="text-[var(--brand-navy)] dark:text-blue-300"
            emptyMessage="Sin citas registradas"
          >
            {appointments.slice(0, 3).map((apt) => (
              <div key={apt.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {apt.reason || "Consulta"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {apt.pet?.name ?? "Mascota"} • {format(parseISO(apt.startAt), "HH:mm")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      {format(parseISO(apt.startAt), "d MMM", { locale: es })}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${appointmentStatusColors[apt.status]}`}
                    >
                      {appointmentStatusLabel[apt.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </ActivityPanel>

          <ActivityPanel
            title="Últimas Facturas"
            icon={FileText}
            iconClassName="text-emerald-600 dark:text-emerald-300"
            emptyMessage="Sin facturas registradas"
          >
            {invoices.slice(0, 3).map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <div className="p-4 transition-colors hover:bg-muted/45">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{inv.number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(inv.issueDate), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        ${inv.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                      <Badge className={invoiceStatusColors[inv.status]}>
                        {invoiceStatusLabel[inv.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </ActivityPanel>
        </motion.div>
      </div>
    </div>
  );
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ActivityPanel({
  title,
  icon: Icon,
  iconClassName,
  emptyMessage,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  const hasItems = React.Children.count(children) > 0;

  return (
    <div className="app-panel-strong overflow-hidden">
      <div className="border-b border-border/70 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Icon className={`h-5 w-5 ${iconClassName ?? "text-primary"}`} />
          {title}
        </h3>
      </div>

      <div className="divide-y divide-border/50">
        {hasItems ? children : <div className="p-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>}
      </div>
    </div>
  );
}
