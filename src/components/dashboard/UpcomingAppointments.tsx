"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, User, PawPrint, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utility";

import type {
  DashboardAppointmentDTO,
  DashboardPatientDTO,
  DashboardClientDTO,
  PetSpecies,
  AppointmentStatus,
} from "@/types/common";

const statusUI: Record<AppointmentStatus, { label: string; className: string }> = {
  SCHEDULED: { label: "Programada", className: "bg-blue-100 text-blue-700" },
  CONFIRMED: { label: "Confirmada", className: "bg-green-100 text-green-700" },
  IN_PROGRESS: { label: "En progreso", className: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Atendida", className: "bg-teal-100 text-teal-700" },
  CANCELLED: { label: "Cancelada", className: "bg-red-100 text-red-700" },
  NO_SHOW: { label: "No Asistio", className: "bg-slate-100 text-slate-700" },
};

const speciesEmoji: Record<PetSpecies, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  OTHER: "🐾",
};

type Props = {
  appointments: DashboardAppointmentDTO[];
  patients: DashboardPatientDTO[];
  clients: DashboardClientDTO[];
};

export default function UpcomingAppointments({ appointments, patients, clients }: Props) {
  const getPatient = (id: number) => patients.find((p) => p.id === id);
  const getClient = (id: number) => clients.find((c) => c.id === id);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="app-panel-strong overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 p-6">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Agenda viva</p>
          <h3 className="font-display text-2xl font-semibold text-foreground">Proximas Citas</h3>
        </div>

        <Link href="/appointments" className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1">
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-border/60">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <PawPrint className="mx-auto mb-3 w-12 h-12 text-muted-foreground/50" />
            <p>No hay citas programadas</p>
          </div>
        ) : (
          appointments.slice(0, 5).map((apt, index) => {
            const patient = getPatient(apt.patient_id);
            const client = getClient(apt.client_id);
            const status = statusUI[apt.status] ?? statusUI.SCHEDULED;

            return (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 transition-colors hover:bg-secondary/55"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(13,148,136,0.12),rgba(45,58,102,0.08))] text-2xl">
                    {patient ? speciesEmoji[patient.species] ?? "🐾" : "🐾"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{patient?.name || apt.patient_name || "Paciente"}</p>

                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <User className="w-3 h-3" />
                        {client?.name || apt.client_name || "Cliente"}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {apt.time}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatDate(apt.date)}</p>
                    <p className="truncate text-xs text-muted-foreground">{apt.reason || "Consulta"}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
