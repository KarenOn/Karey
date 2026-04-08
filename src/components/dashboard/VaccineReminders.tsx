"use client";

import React from "react";
import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Syringe, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { DashboardVaccinationDTO, DashboardPatientDTO, PetSpecies } from "@/types/common";

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
  const getPatient = (id: number) => patients.find((p) => p.id === id);

  const upcomingVaccinations = vaccinations
    .filter((v) => !!v.next_due_at)
    .map((v) => {
      const daysUntil = differenceInDays(parseISO(v.next_due_at as string), new Date());
      return { ...v, daysUntil };
    })
    .filter((v) => v.daysUntil >= 0 && v.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="app-panel-strong overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 p-6">
        <div className="flex items-center gap-2">
          <Syringe className="w-5 h-5 text-(--brand-gold)" />
          <h3 className="font-display text-2xl font-semibold text-foreground">Vacunas Proximas</h3>
        </div>

        <Link href="/pets?tab=vaccinations" className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1">
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-border/60">
        {upcomingVaccinations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Syringe className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p>No hay vacunas proximas</p>
          </div>
        ) : (
          upcomingVaccinations.slice(0, 4).map((vac, index) => {
            const patient = getPatient(vac.pet_id);
            const isUrgent = vac.daysUntil <= 7;

            return (
              <motion.div key={vac.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index }} className={`p-4 ${isUrgent ? "bg-[rgba(216,162,87,0.08)]" : "hover:bg-secondary/55"} transition-colors`}>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,rgba(216,162,87,0.18),rgba(13,148,136,0.12))] text-xl">
                    {patient ? speciesEmoji[patient.species] ?? "🐾" : "🐾"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-foreground">{patient?.name || vac.pet_name || "Paciente"}</p>
                    <p className="text-sm text-muted-foreground">{vac.vaccine_name}</p>
                  </div>

                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${isUrgent ? "text-(--brand-gold)" : "text-muted-foreground"}`}>
                      {isUrgent && <AlertTriangle className="w-4 h-4" />}
                      <span className="text-sm font-semibold">{vac.daysUntil === 0 ? "Hoy" : `${vac.daysUntil} dias`}</span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {vac.next_due_at ? format(parseISO(vac.next_due_at), "d MMM", { locale: es }) : ""}
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
