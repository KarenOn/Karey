import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
// import { zodDetails } from "@/lib/zodDetails";
import { AppointmentStatusChangeSchema } from "@/lib/validators/appointments";

function zodDetails(err: any) {
  return err.issues?.map((i: any) => ({ path: i.path?.join("."), message: i.message })) ?? [];
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number(ctx.params.id);

  const body = await req.json().catch(() => null);
  const parsed = AppointmentStatusChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const exists = await prisma.appointment.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}
