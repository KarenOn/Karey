import type { ClinicalReportData } from "@/types/clinical-report";

export function clinicalDate(value: string | null, _timezone: string) {
  void _timezone;
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export function clinicalDateTime(value: string, _timezone: string) {
  void _timezone;
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function clinicalVisitDate(value: string) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
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
