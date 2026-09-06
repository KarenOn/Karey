import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAppointmentReminderNotifications } from "@/lib/reminders";
import { requireClinicPermission } from "@/lib/server-auth";
// import { zodDetails } from "@/lib/zodDetails";
import { AppointmentStatusChangeSchema } from "@/lib/validators/appointments";
import { AppointmentStatus } from "@/generated/prisma/client";

function zodDetails(err: { issues?: Array<{ path?: PropertyKey[]; message: string }> }) {
  return err.issues?.map((issue) => ({ path: issue.path?.join("."), message: issue.message })) ?? [];
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("appointments.update");
  if (!clinicId) {
    return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
  }

  const id = Number((await ctx.params).id);

  const body = await req.json().catch(() => null);
  const parsed = AppointmentStatusChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const exists = await prisma.appointment.findFirst({ where: { id, clinicId }, select: { id: true, status: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const allowed = exists.status === AppointmentStatus.IN_PROGRESS
    ? parsed.data.status === AppointmentStatus.COMPLETED
    : ([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] as AppointmentStatus[]).includes(exists.status)
      ? ([AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED] as AppointmentStatus[]).includes(parsed.data.status)
      : false;
  if (!allowed) return NextResponse.json({ error: "La cita ya no permite ese cambio de estado." }, { status: 409 });

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await syncAppointmentReminderNotifications(updated.id);

  return NextResponse.json(updated);
}
