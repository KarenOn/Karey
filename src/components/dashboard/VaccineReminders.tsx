"use client";

import React from "react";
import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Syringe, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

import type {
  DashboardVaccinationDTO,
  DashboardPatientDTO,
  PetSpecies,
} from "@/types/common";

const speciesEmoji: Record<PetSpecies, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  OTHER: "🐾",
};

type Props = {
  vaccinations: DashboardVaccinationDTO[];
  patients: DashboardPatientDTO[];
};

export default function VaccineReminders({ vaccinations, patients }: Props) {
  const getPatient = (id: string) => patients.find((p) => p.id === id);

  const upcomingVaccinations = vaccinations
    .filter((v) => !!v.next_due_at)
    .map((v) => {
      const daysUntil = differenceInDays(parseISO(v.next_due_at as string), new Date());
      return { ...v, daysUntil };
    })
    .filter((v) => v.daysUntil >= 0 && v.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-bold text-slate-800">Vacunas Próximas</h3>
        </div>

        <Link
          href="/pets?tab=vaccinations"
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-slate-50">
        {upcomingVaccinations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Syringe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No hay vacunas próximas</p>
          </div>
        ) : (
          upcomingVaccinations.slice(0, 4).map((vac, index) => {
            const patient = getPatient(vac.pet_id);
            const isUrgent = vac.daysUntil <= 7;

            return (
              <motion.div
                key={vac.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`p-4 ${
                  isUrgent ? "bg-pink-50/50" : "hover:bg-slate-50"
                } transition-colors`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center text-xl">
                    {patient ? speciesEmoji[patient.species] ?? "🐾" : "🐾"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {patient?.name || vac.pet_name || "Paciente"}
                    </p>
                    <p className="text-sm text-slate-500">{vac.vaccine_name}</p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`flex items-center gap-1 ${
                        isUrgent ? "text-pink-600" : "text-slate-600"
                      }`}
                    >
                      {isUrgent && <AlertTriangle className="w-4 h-4" />}
                      <span className="text-sm font-semibold">
                        {vac.daysUntil === 0 ? "Hoy" : `${vac.daysUntil} días`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {vac.next_due_at
                        ? format(parseISO(vac.next_due_at), "d MMM", { locale: es })
                        : ""}
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
