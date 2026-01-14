
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function safeDate(value: any): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEE d", { locale: es });
};

export function parseDateOrThrow(value: string, fieldName: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Fecha inválida en "${fieldName}"`);
  }
  return d;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}
