import "server-only";

import { differenceInYears } from "date-fns";
import { prisma } from "@/lib/prisma";
import { resolveStoredFileUrl } from "@/lib/storage";
import type { ClinicalReportData, ClinicalReportRange } from "@/types/clinical-report";

export type { ClinicalReportData, ClinicalReportRange } from "@/types/clinical-report";

function dateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function clinicToday(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

function toUtcBoundary(value: string, end = false) {
  return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
}

export function resolveClinicalReportDates(range: ClinicalReportRange, timezone: string) {
  if (range.mode === "all") return null;
  const date = range.mode === "today" ? clinicToday(timezone) : dateOnly(range.date ?? "");
  if (range.mode === "date" || range.mode === "today") {
    if (!date) throw new Error("Rango de fechas inválido");
    return { gte: toUtcBoundary(date), lte: toUtcBoundary(date, true), label: date };
  }
  const from = dateOnly(range.from ?? "");
  const to = dateOnly(range.to ?? "");
  if (!from || !to || from > to) throw new Error("Rango de fechas inválido");
  return { gte: toUtcBoundary(from), lte: toUtcBoundary(to, true), label: `${from} a ${to}` };
}

export async function getClinicalReportData(opts: { clinicId: number; petIds?: number[]; clientId?: number; range: ClinicalReportRange }) {
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: opts.clinicId },
    select: { name: true, phone: true, email: true, address: true, taxId: true, logoUrl: true, timezone: true },
  });
  const dates = resolveClinicalReportDates(opts.range, clinic.timezone);
  const pets = await prisma.pet.findMany({
    where: { clinicId: opts.clinicId, ...(opts.petIds?.length ? { id: { in: opts.petIds } } : {}), ...(opts.clientId ? { clientId: opts.clientId } : {}) },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, species: true, breed: true, sex: true, birthDate: true, client: { select: { fullName: true, phone: true, email: true } },
      visits: { where: dates ? { visitAt: { gte: dates.gte, lte: dates.lte } } : undefined, orderBy: { visitAt: "desc" }, select: { id: true, visitAt: true, weightKg: true, temperatureC: true, diagnosis: true, treatment: true, notes: true, vet: { select: { name: true } }, attachments: { select: { fileName: true, fileType: true, createdAt: true } } } },
      vaccinations: { where: dates ? { appliedAt: { gte: dates.gte, lte: dates.lte } } : undefined, orderBy: { appliedAt: "desc" }, select: { id: true, vaccineName: true, appliedAt: true, nextDueAt: true, batchNumber: true, notes: true } },
    },
  });
  return {
    clinic: { ...clinic, logoUrl: await resolveStoredFileUrl(clinic.logoUrl, { fileName: `logo-clinica-${opts.clinicId}.png` }) },
    scope: { petIds: opts.petIds ?? [], clientId: opts.clientId ?? null },
    range: { ...opts.range, label: dates?.label ?? "Todo el historial" },
    patients: pets.map((pet) => ({ ...pet, age: pet.birthDate ? differenceInYears(new Date(), pet.birthDate) : null, birthDate: pet.birthDate?.toISOString() ?? null, visits: pet.visits.map((visit) => ({ ...visit, visitAt: visit.visitAt.toISOString(), attachments: visit.attachments.map((attachment) => ({ ...attachment, createdAt: attachment.createdAt.toISOString() })) })), vaccinations: pet.vaccinations.map((record) => ({ ...record, appliedAt: record.appliedAt.toISOString(), nextDueAt: record.nextDueAt?.toISOString() ?? null })) })),
  };
}
