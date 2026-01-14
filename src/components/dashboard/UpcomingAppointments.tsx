"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, User, PawPrint, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utility";

// ✅ Usa tus types (del archivo que te creé)
import type {
  DashboardAppointmentDTO,
  DashboardPatientDTO,
  DashboardClientDTO,
  PetSpecies,
  AppointmentStatus,
} from "@/types/common";

const statusUI: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  SCHEDULED: {
    label: "Programada",
    className: "bg-blue-100 text-blue-700",
  },
  CONFIRMED: {
    label: "Confirmada",
    className: "bg-green-100 text-green-700",
  },
  IN_PROGRESS: {
    label: "En Espera",
    className: "bg-yellow-100 text-yellow-700",
  },
  COMPLETED: {
    label: "Atendida",
    className: "bg-teal-100 text-teal-700",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "bg-red-100 text-red-700",
  },
  NO_SHOW: {
    label: "No Asistió",
    className: "bg-slate-100 text-slate-700",
  },
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

export default function UpcomingAppointments({
  appointments,
  patients,
  clients,
}: Props) {
  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getClient = (id: string) => clients.find((c) => c.id === id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Próximas Citas</h3>

        <Link
          href={"/appointments"}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-slate-50">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <PawPrint className="w-12 h-12 mx-auto mb-3 text-slate-300" />
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
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-2xl">
                    {patient ? speciesEmoji[patient.species] ?? "🐾" : "🐾"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 truncate">
                        {patient?.name || apt.patient_name || "Paciente"}
                      </p>

                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
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
                    <p className="text-sm font-semibold text-teal-600">
                      {formatDate(apt.date)}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {apt.reason || "Consulta"}
                    </p>
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
