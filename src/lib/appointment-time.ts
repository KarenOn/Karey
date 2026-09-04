export const APPOINTMENT_GRACE_PERIOD_MS = 5 * 60 * 1000;

export function getAppointmentGraceDeadline(startAt: Date) {
  return new Date(startAt.getTime() + APPOINTMENT_GRACE_PERIOD_MS);
}

export function getClinicDateKey(value: Date | string, timeZone = "America/Santo_Domingo") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getClinicDayRange(date: Date, timeZone = "America/Santo_Domingo") {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const localMidnight = Date.UTC(year, month - 1, day);
  const offsetParts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(localMidnight));
  const zonedAtGuess = Date.UTC(Number(offsetParts.find((part) => part.type === "year")?.value), Number(offsetParts.find((part) => part.type === "month")?.value) - 1, Number(offsetParts.find((part) => part.type === "day")?.value), Number(offsetParts.find((part) => part.type === "hour")?.value), Number(offsetParts.find((part) => part.type === "minute")?.value), Number(offsetParts.find((part) => part.type === "second")?.value));
  const offset = zonedAtGuess - localMidnight;
  const start = new Date(localMidnight - offset);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
