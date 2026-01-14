import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
// import { zodDetails } from "@/lib/zodDetails";
import { AppointmentCreateSchema, APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "@/lib/validators/appointments";

function zodDetails(err: any) {
  return err.issues?.map((i: any) => ({ path: i.path?.join("."), message: i.message })) ?? [];
}

const ListQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  type: z.enum(APPOINTMENT_TYPES).optional(),
  petId: z.coerce.number().int().positive().optional(),
  clientId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();

  const url = new URL(req.url);
  const parsedQ = ListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsedQ.success) {
    return NextResponse.json({ error: "Query inválida", details: zodDetails(parsedQ.error) }, { status: 422 });
  }

  const q = parsedQ.data;

  const where: any = { clinicId };

  if (q.status) where.status = q.status;
  if (q.type) where.type = q.type;
  if (q.petId) where.petId = q.petId;
  if (q.clientId) where.clientId = q.clientId;

  if (q.from || q.to) {
    where.startAt = {};
    if (q.from) where.startAt.gte = new Date(q.from);
    if (q.to) where.startAt.lte = new Date(q.to);
  }

  const rows = await prisma.appointment.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, fullName: true, phone: true } },
      vet: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();

  const body = await req.json().catch(() => null);
  const parsed = AppointmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const input = parsed.data;

  // seguridad: validar que pet/client pertenecen a la clínica
  const [pet, client] = await Promise.all([
    prisma.pet.findFirst({ where: { id: input.petId, clinicId }, select: { id: true, clientId: true } }),
    prisma.client.findFirst({ where: { id: input.clientId, clinicId }, select: { id: true } }),
  ]);

  if (!pet) return NextResponse.json({ error: "Mascota inválida" }, { status: 404 });
  if (!client) return NextResponse.json({ error: "Cliente inválido" }, { status: 404 });

  // opcional: asegurar coherencia (pet.clientId debe coincidir con clientId)
  if (pet.clientId !== input.clientId) {
    return NextResponse.json({ error: "La mascota no pertenece a ese cliente" }, { status: 409 });
  }

  const created = await prisma.appointment.create({
    data: {
      clinicId,
      clientId: input.clientId,
      petId: input.petId,
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      status: input.status ?? undefined, // deja default si no viene
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      vetId: input.vetId ?? null,
    },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, fullName: true, phone: true } },
      vet: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
