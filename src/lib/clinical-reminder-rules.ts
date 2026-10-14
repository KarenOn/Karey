import { getClinicDateKey } from "@/lib/appointment-time";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const CLINICAL_REMINDER_WINDOW_DAYS = 30;

function localDayDistance(date: Date, now: Date, timeZone: string) {
  const due = Date.parse(`${getClinicDateKey(date, timeZone)}T00:00:00Z`);
  const today = Date.parse(`${getClinicDateKey(now, timeZone)}T00:00:00Z`);
  return Math.round((due - today) / DAY_IN_MS);
}

export type ClinicalReminderKind = "vaccine-upcoming" | "vaccine-overdue" | "clinical-follow-up";

export function resolveClinicalReminderKind(params: { source: "vaccine" | "visit"; dueDate: Date; now?: Date; timeZone: string }): ClinicalReminderKind | null {
  const distance = localDayDistance(params.dueDate, params.now ?? new Date(), params.timeZone || "America/Santo_Domingo");
  if (params.source === "vaccine") {
    if (distance < 0) return "vaccine-overdue";
    return distance <= CLINICAL_REMINDER_WINDOW_DAYS ? "vaccine-upcoming" : null;
  }
  return distance >= 0 && distance <= CLINICAL_REMINDER_WINDOW_DAYS ? "clinical-follow-up" : null;
}
