import "server-only";
import { AppointmentStatus, NotificationChannel, NotificationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { APPOINTMENT_GRACE_PERIOD_MS, getClinicDateKey, getClinicDayRange } from "@/lib/appointment-time";

const STALE_IN_PROGRESS_TITLE = (appointmentId: number) => `APPOINTMENT_IN_PROGRESS_OVERDUE:${appointmentId}`;

function minutesFromTime(value: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
}

function isAfterClinicDay(appointmentStart: Date, now: Date, timezone: string, close: string | null) {
  const appointmentDay = getClinicDateKey(appointmentStart, timezone);
  const nowDay = getClinicDateKey(now, timezone);
  if (nowDay > appointmentDay) return true;
  if (nowDay < appointmentDay) return false;
  const closeMinutes = minutesFromTime(close);
  if (closeMinutes === null) return false;
  const dayRange = getClinicDayRange(appointmentStart, timezone);
  return now.getTime() >= dayRange.start.getTime() + closeMinutes * 60_000;
}

async function notifyStaleInProgressAppointments(now: Date) {
  const appointments = await prisma.appointment.findMany({
    where: { status: AppointmentStatus.IN_PROGRESS },
    select: {
      id: true, startAt: true, clinicId: true, vetId: true,
      clinic: { select: { timezone: true, schedules: { select: { day: true, close: true, closed: true } } } },
      pet: { select: { name: true } },
    },
  });

  for (const appointment of appointments) {
    const timezone = appointment.clinic.timezone || "America/Santo_Domingo";
    const day = getClinicDateKey(appointment.startAt, timezone);
    const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(`${day}T12:00:00Z`).getUTCDay()];
    const schedule = appointment.clinic.schedules.find((item) => item.day === weekday);
    if (!schedule || schedule.closed || !isAfterClinicDay(appointment.startAt, now, timezone, schedule.close)) continue;

    const title = STALE_IN_PROGRESS_TITLE(appointment.id);
    const exists = await prisma.notification.findFirst({ where: { clinicId: appointment.clinicId, title }, select: { id: true } });
    if (exists) continue;

    const dateLabel = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: timezone }).format(appointment.startAt);
    const message = `La atención de ${appointment.pet.name} del ${dateLabel} continúa abierta. ¿Deseas revisarla?`;
    const admins = await prisma.clinicMember.findMany({
      where: { clinicId: appointment.clinicId, isActive: true, role: { is: { isActive: true, key: { in: ["owner", "admin"] } } } },
      select: { userId: true },
    });
    const recipientIds = [...new Set([...admins.map((item) => item.userId), ...(appointment.vetId ? [appointment.vetId] : [])])];
    if (!recipientIds.length) continue;

    await prisma.notification.create({
      data: {
        clinicId: appointment.clinicId, channel: NotificationChannel.IN_APP, status: NotificationStatus.SENT,
        type: "APPOINTMENT_IN_PROGRESS_OVERDUE", eventKey: title, targetUrl: `/appointments?appointment=${appointment.id}`,
        title, message, meta: { kind: "appointment-in-progress-overdue", appointmentId: appointment.id }, sentAt: now,
        recipients: { create: recipientIds.map((userId) => ({ userId, status: NotificationStatus.SENT, sentAt: now })) },
      },
    });
  }
}

/** Idempotent transition: eligible status + grace deadline elapsed => NO_SHOW. */
export async function reconcileOverdueAppointments(now = new Date()) {
  const cutoff = new Date(now.getTime() - APPOINTMENT_GRACE_PERIOD_MS);
  const updated = await prisma.appointment.updateMany({
    where: { startAt: { lte: cutoff }, status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] } },
    data: { status: AppointmentStatus.NO_SHOW },
  });
  await notifyStaleInProgressAppointments(now);
  return updated;
}
