import { format, parse } from "date-fns";
import { getClinicDateKey } from "./appointment-time";
import { safeDate, addMinutes as utilAddMinutes } from "./utility";

/**
 * Canonical helper: Get appointment end time
 * Handles missing endAt by using duration
 */
export function getAppointmentEnd(
  appointment: { startAt: string; endAt?: string | null },
  defaultDurationMinutes = 30
): Date | null {
  const start = safeDate(appointment.startAt);
  if (!start) return null;
  return safeDate(appointment.endAt) ?? utilAddMinutes(start, defaultDurationMinutes);
}

/**
 * Canonical helper: Check if appointment is on a specific clinic date
 * Uses timezone-aware date comparison
 */
export function isAppointmentOnClinicDate(
  appointment: { startAt: string },
  targetDateStr: string, // YYYY-MM-DD
  clinicTimezone: string
): boolean {
  const start = safeDate(appointment.startAt);
  if (!start) return false;
  return getClinicDateKey(start, clinicTimezone) === targetDateStr;
}

/**
 * Canonical helper: Get appointments for a specific clinic day
 * Ensures consistent filtering across all views
 */
export function filterAppointmentsByClinicDay<T extends { startAt: string; status?: string }>(
  appointments: T[],
  dayStr: string, // YYYY-MM-DD
  clinicTimezone: string,
  excludeStatuses?: Set<string>
): T[] {
  return appointments.filter((apt) => {
    if (!isAppointmentOnClinicDate(apt, dayStr, clinicTimezone)) return false;
    if (excludeStatuses?.has(apt.status ?? "")) return false;
    return true;
  });
}

/**
 * Canonical helper: Check if appointment is eligible for "Now" alert
 * Only pre-attention states show alert
 */
export function isAppointmentEligibleForNowAlert(status: string | undefined): boolean {
  const eligibleStatuses = new Set(["SCHEDULED", "CONFIRMED", "WAITING"]);
  return eligibleStatuses.has(status ?? "");
}

/**
 * Canonical helper: Check if appointment status allows certain actions
 */
export function canPerformAction(
  status: string,
  action: "attend" | "reschedule" | "cancel" | "finalize" | "view"
): boolean {
  switch (action) {
    case "attend":
      return ["SCHEDULED", "CONFIRMED", "WAITING"].includes(status);
    case "reschedule":
      return ["SCHEDULED", "CONFIRMED", "WAITING"].includes(status);
    case "cancel":
      return ["SCHEDULED", "CONFIRMED", "WAITING"].includes(status);
    case "finalize":
      return status === "IN_PROGRESS";
    case "view":
      return true;
    default:
      return false;
  }
}

/**
 * Canonical helper: Format appointment status in Spanish
 */
export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Atendida",
  ATTENDED: "Atendida",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
  WAITING: "En espera",
};

/**
 * Canonical helper: Format appointment type in Spanish
 */
export const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Consulta",
  VACCINATION: "Vacunación",
  SURGERY: "Cirugía",
  AESTHETIC: "Estética",
  CHECKUP: "Chequeo",
  EMERGENCY: "Emergencia",
  GROOMING: "Peluquería",
  BATH: "Baño",
  HOSPITALIZATION: "Hospitalización",
  DEWORMING: "Desparasitación",
  OTHER: "Otro",
};

/**
 * Canonical helper: Get all allowed statuses for new appointments
 * (should not include IN_PROGRESS)
 */
export function getInitialAppointmentStatuses(): string[] {
  return ["SCHEDULED", "CONFIRMED"];
}

/**
 * Canonical helper: Check if appointment is "active" (affects scheduling)
 */
export function isAppointmentActive(status: string): boolean {
  const nonBlockingStatuses = new Set(["CANCELLED", "NO_SHOW"]);
  return !nonBlockingStatuses.has(status);
}

/**
 * Canonical helper: Check if two time ranges overlap
 */
export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && startB < endA;
}

/** A vet is unavailable only when an active appointment overlaps the requested range. */
export function isVetAvailableForRange(
  appointments: Array<{ id?: number; vetId?: string | null; startAt: string | Date; endAt?: string | Date | null; status?: string }>,
  vetId: string,
  requestedStart: Date,
  requestedEnd: Date,
  ignoreId?: number,
): boolean {
  return !appointments.some((appointment) => {
    if (appointment.vetId !== vetId || !isAppointmentActive(appointment.status ?? "")) return false;
    if (ignoreId !== undefined && appointment.id === ignoreId) return false;
    const start = appointment.startAt instanceof Date ? appointment.startAt : safeDate(appointment.startAt);
    const endValue = appointment.endAt instanceof Date ? appointment.endAt : appointment.endAt ? safeDate(appointment.endAt) : null;
    const end = endValue ?? (start ? utilAddMinutes(start, 30) : null);
    return Boolean(start && end && rangesOverlap(requestedStart, requestedEnd, start, end));
  });
}

/**
 * Canonical helper: Parse ISO date string to Date
 */
export function parseISODate(dateStr: string): Date | null {
  return safeDate(dateStr);
}

/**
 * Canonical helper: Format Date to YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Canonical helper: Combine date string and time string into Date
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date());
}

/**
 * Canonical helper: Get available actions for appointment based on status
 */
export function getAppointmentActions(
  status: string
): Array<"attend" | "reschedule" | "cancel" | "finalize" | "view"> {
  switch (status) {
    case "SCHEDULED":
    case "CONFIRMED":
    case "WAITING":
      return ["attend", "reschedule", "cancel", "view"];
    case "IN_PROGRESS":
      return ["finalize", "view"];
    case "COMPLETED":
    case "ATTENDED":
      return ["view"];
    case "CANCELLED":
    case "NO_SHOW":
      return ["view"];
    default:
      return ["view"];
  }
}
