// src/app/clients/[id]/ClientDetailView.tsx
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
  createdAt: string; // ISO
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
  startAt: string; // ISO
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
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  issueDate: string; // ISO
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
  NO_SHOW: "No asistió",
};

const appointmentStatusColors: Record<AppointmentDTO["status"], string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-teal-100 text-teal-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-slate-100 text-slate-700",
};

const invoiceStatusLabel: Record<InvoiceDTO["status"], string> = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  PAID: "Pagada",
  VOID: "Anulada",
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link href="/clients">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">{client.fullName}</h2>
          <p className="text-slate-500">
            Cliente desde{" "}
            {format(parseISO(client.createdAt), "MMMM yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
              {client.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{client.fullName}</h3>
              <p className="text-slate-500 text-sm">Propietario</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Teléfono</p>
                <p className="font-medium">{client.phone ?? "-"}</p>
              </div>
            </div>

            {client.email && (
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
            )}

            {client.address && (
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Dirección</p>
                  <p className="font-medium">{client.address}</p>
                </div>
              </div>
            )}
          </div>

          {client.notes && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Notas</p>
              <p className="text-slate-600">{client.notes}</p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{pets.length}</p>
              <p className="text-xs text-slate-500">Mascotas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{appointments.length}</p>
              <p className="text-xs text-slate-500">Citas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                ${totalSpent.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </motion.div>

        {/* Pets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-teal-500" />
              Mascotas ({pets.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-50">
            {pets.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No tiene mascotas registradas
              </div>
            ) : (
              pets.map((pet) => (
                <Link key={pet.id} href={`/pets/${pet.id}`}>
                  <div className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-2xl">
                        {speciesEmoji[pet.species] ?? "🐾"}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{pet.name}</p>
                        <p className="text-sm text-slate-500">
                          {pet.species} • {pet.breed || "Sin raza"}
                        </p>
                      </div>
                      <Eye className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Recent Appointments */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Últimas Citas
              </h3>
            </div>

            <div className="divide-y divide-slate-50">
              {appointments.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  Sin citas registradas
                </div>
              ) : (
                appointments.slice(0, 3).map((apt) => (
                  <div key={apt.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {apt.reason || "Consulta"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {apt.pet?.name ?? "Mascota"} •{" "}
                          {format(parseISO(apt.startAt), "HH:mm")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-600">
                          {format(parseISO(apt.startAt), "d MMM", { locale: es })}
                        </p>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                            appointmentStatusColors[apt.status]
                          }`}
                        >
                          {appointmentStatusLabel[apt.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Últimas Facturas
              </h3>
            </div>

            <div className="divide-y divide-slate-50">
              {invoices.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  Sin facturas registradas
                </div>
              ) : (
                invoices.slice(0, 3).map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}>
                    <div className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{inv.number}</p>
                          <p className="text-sm text-slate-500">
                            {format(parseISO(inv.issueDate), "d MMM yyyy", {
                              locale: es,
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-slate-800">
                            ${inv.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </p>
                          <Badge
                            className={
                              inv.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : inv.status === "VOID"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {invoiceStatusLabel[inv.status]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
