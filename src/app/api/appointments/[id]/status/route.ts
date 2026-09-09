import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAppointmentReminderNotifications } from "@/lib/reminders";
import { requireClinicPermission } from "@/lib/server-auth";
// import { zodDetails } from "@/lib/zodDetails";
import { AppointmentStatusChangeSchema } from "@/lib/validators/appointments";
import { AppointmentStatus } from "@/generated/prisma/client";
import { APPOINTMENT_GRACE_PERIOD_MS } from "@/lib/appointment-time";

function zodDetails(err: { issues?: Array<{ path?: PropertyKey[]; message: string }> }) {
  return err.issues?.map((issue) => ({ path: issue.path?.join("."), message: issue.message })) ?? [];
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);

  const body = await req.json().catch(() => null);
  const parsed = AppointmentStatusChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const permission = parsed.data.status === AppointmentStatus.IN_PROGRESS || parsed.data.status === AppointmentStatus.COMPLETED
    ? "appointments.attend"
    : parsed.data.status === AppointmentStatus.CANCELLED || parsed.data.status === AppointmentStatus.NO_SHOW
      ? "appointments.cancel"
      : "appointments.edit";
  const { clinicId } = await requireClinicPermission(permission);

  const exists = await prisma.appointment.findFirst({ where: { id, clinicId }, select: { id: true, status: true, startAt: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const allowed = exists.status === AppointmentStatus.IN_PROGRESS
    ? parsed.data.status === AppointmentStatus.COMPLETED
    : ([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] as AppointmentStatus[]).includes(exists.status)
      ? ([AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED] as AppointmentStatus[]).includes(parsed.data.status)
      : false;
  if (!allowed) return NextResponse.json({ error: "La cita ya no permite ese cambio de estado." }, { status: 409 });

  if (
    parsed.data.status === AppointmentStatus.NO_SHOW &&
    exists.startAt.getTime() + APPOINTMENT_GRACE_PERIOD_MS > Date.now()
  ) {
    return NextResponse.json({ error: "La cita todavía no ha vencido." }, { status: 409 });
  }

  const result = await prisma.appointment.updateMany({
    where: {
      id,
      clinicId,
      ...(parsed.data.status === AppointmentStatus.NO_SHOW
        ? { status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] } }
        : { status: exists.status }),
    },
    data: { status: parsed.data.status },
  });
  if (!result.count) {
    const current = await prisma.appointment.findFirst({ where: { id, clinicId }, select: { status: true } });
    if (current?.status === parsed.data.status) return NextResponse.json(current);
    return NextResponse.json({ error: "La cita ya no permite ese cambio de estado." }, { status: 409 });
  }
  const updated = await prisma.appointment.findUniqueOrThrow({ where: { id } });

  await syncAppointmentReminderNotifications(updated.id);

  return NextResponse.json(updated);
}
