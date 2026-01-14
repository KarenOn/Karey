import { prisma } from "@/lib/prisma";
import { PetCreateSchema } from "@/lib/validators/pet";
import { NextResponse } from "next/server";

function zodDetails(err: any) {
  return err.issues?.map((i: any) => ({ path: i.path?.join("."), message: i.message })) ?? [];
}

async function getClinicIdOrFail() {
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  return clinic?.id ?? null;
}

export async function GET() {
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) return NextResponse.json([], { status: 200 });

  const pets = await prisma.pet.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      species: true,
      sex: true,
      breed: true,
      color: true,
      birthDate: true,
      microchip: true,
      weightKg: true,
      notes: true,
      clientId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(pets, { status: 200 });
}

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();
  console.log("Creating pet for clinic ID:", clinicId);
  if (!clinicId) return NextResponse.json({ error: "No existe clínica configurada" }, { status: 409 });

  const body = await req.json().catch(() => null);
  const parsed = PetCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;

  const created = await prisma.pet.create({
    data: {
      clinicId,
      clientId: input.clientId,
      name: input.name,
      species: input.species,
      sex: input.sex,
      breed: input.breed ?? null,
      color: input.color ?? null,
      birthDate: input.birthDate ?? null,
      microchip: input.microchip ?? null,
      weightKg: input.weightKg ?? null,
      notes: input.notes ?? null,
    },
    select: {
      id: true,
      name: true,
      species: true,
      sex: true,
      breed: true,
      color: true,
      birthDate: true,
      microchip: true,
      weightKg: true,
      notes: true,
      clientId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
