import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
// import { zodDetails } from "@/lib/zodDetails";
import { AppointmentUpdateSchema } from "@/lib/validators/appointments";

function zodDetails(err: any) {
  return err.issues?.map((i: any) => ({ path: i.path?.join("."), message: i.message })) ?? [];
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await ctx.params).id);

  const row = await prisma.appointment.findFirst({
    where: { id, clinicId },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, fullName: true, phone: true } },
      vet: { select: { id: true, name: true } },
    },
  });

  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await ctx.params).id);

  const body = await req.json().catch(() => null);
  const parsed = AppointmentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: zodDetails(parsed.error) }, { status: 422 });
  }

  // validar existe y es de la clínica
  const exists = await prisma.appointment.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const input = parsed.data;

  // si vienen petId/clientId, valida pertenencia a clinic y coherencia
  if (input.petId || input.clientId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId },
      select: { petId: true, clientId: true },
    });

    const newPetId = input.petId ?? appointment!.petId;
    const newClientId = input.clientId ?? appointment!.clientId;

    const pet = await prisma.pet.findFirst({ where: { id: newPetId, clinicId }, select: { id: true, clientId: true } });
    const client = await prisma.client.findFirst({ where: { id: newClientId, clinicId }, select: { id: true } });

    if (!pet) return NextResponse.json({ error: "Mascota inválida" }, { status: 404 });
    if (!client) return NextResponse.json({ error: "Cliente inválido" }, { status: 404 });
    if (pet.clientId !== newClientId) return NextResponse.json({ error: "La mascota no pertenece a ese cliente" }, { status: 409 });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...input,
      endAt: input.endAt === undefined ? undefined : input.endAt, // mantiene null si viene null
    } as any,
    include: {
      pet: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, fullName: true, phone: true } },
      vet: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await ctx.params).id);

  const exists = await prisma.appointment.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
