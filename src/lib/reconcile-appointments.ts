import "server-only";
import { AppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { APPOINTMENT_GRACE_PERIOD_MS } from "@/lib/appointment-time";

export async function reconcileOverdueAppointments(now = new Date()) {
  const cutoff = new Date(now.getTime() - APPOINTMENT_GRACE_PERIOD_MS);

  return prisma.appointment.updateMany({
    where: {
      startAt: { lte: cutoff },
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
    },
    data: { status: AppointmentStatus.NO_SHOW },
  });
}
