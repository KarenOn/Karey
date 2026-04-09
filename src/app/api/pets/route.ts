import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { PetCreateSchema } from "@/lib/validators/pet";

function zodDetails(err: { issues?: Array<{ path?: PropertyKey[]; message: string }> }) {
  return (
    err.issues?.map((issue) => ({
      path: issue.path?.map((part) => String(part)).join("."),
      message: issue.message,
    })) ?? []
  );
}

export async function GET() {
  const { clinicId } = await requireClinicPermission("pets.read");

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
  const { clinicId } = await requireClinicPermission("pets.create");
  const body = await req.json().catch(() => null);
  const parsed = PetCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, clinicId },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente invalido" }, { status: 404 });
  }

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
