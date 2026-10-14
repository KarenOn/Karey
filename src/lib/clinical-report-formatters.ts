import type { ClinicalReportData } from "@/types/clinical-report";

import { DEFAULT_LOCALE, DEFAULT_TIMEZONE, formatClinicDate, formatClinicDateTime } from "@/lib/formatters";

export function clinicalDate(value: string | null, timezone = DEFAULT_TIMEZONE) {
  if (!value) return "-";
  return formatClinicDate(value, timezone, DEFAULT_LOCALE);
}

export function clinicalDateTime(value: string, timezone = DEFAULT_TIMEZONE) {
  return formatClinicDateTime(value, timezone, DEFAULT_LOCALE);
}

export function clinicalVisitDate(value: string, timezone = DEFAULT_TIMEZONE) {
  return formatClinicDate(value, timezone, DEFAULT_LOCALE);
}

export function clinicalSpecies(value: string) {
  return ({ DOG: "Perro", CAT: "Gato", BIRD: "Ave", RABBIT: "Conejo", OTHER: "Otro" } as Record<string, string>)[value] ?? value;
}

export function clinicalSex(value: string) {
  return ({ MALE: "Macho", FEMALE: "Hembra", UNKNOWN: "Desconocido" } as Record<string, string>)[value] ?? value;
}

export function clinicalRangeLabel(range: ClinicalReportData["range"]) {
  if (range.mode === "today") return "Hoy";
  if (range.mode === "date") return range.date ?? range.label;
  if (range.mode === "range") return `${range.from ?? ""} a ${range.to ?? ""}`;
  return "Todo el historial";
}
