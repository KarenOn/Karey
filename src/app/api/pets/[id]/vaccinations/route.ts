import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VaccinationRecordCreateSchema } from "@/lib/validators/vaccination";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const petId = Number((await params).id);
  if (!Number.isFinite(petId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const records = await prisma.vaccinationRecord.findMany({
    where: { petId },
    orderBy: { appliedAt: "desc" },
    include: { vaccine: true, visit: true },
  });

  return NextResponse.json(records);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const petId = Number((await params).id);
  if (!Number.isFinite(petId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = VaccinationRecordCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validación fallida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 });

  const data = parsed.data;

  const created = await prisma.vaccinationRecord.create({
    data: {
      clinicId: pet.clinicId,
      petId,
      vaccineId: data.vaccineId,
      appliedAt: data.appliedAt,
      nextDueAt: data.nextDueAt,
      batchNumber: data.batchNumber || null,
      notes: data.notes || null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
