import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { VaccinationRecordCreateSchema } from "@/lib/validators/vaccination";

function getFirstIssueMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "No pudimos registrar la vacuna.";
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("pets.read");
  const petId = Number((await params).id);

  if (!Number.isFinite(petId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const records = await prisma.vaccinationRecord.findMany({
    where: { petId, clinicId },
    orderBy: { appliedAt: "desc" },
    include: { vaccine: true, visit: true },
  });

  return NextResponse.json(records);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("pets.update");
  const petId = Number((await params).id);

  if (!Number.isFinite(petId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = VaccinationRecordCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: getFirstIssueMessage(parsed.error),
        issues: parsed.error.issues,
      },
      { status: 422 }
    );
  }

  const pet = await prisma.pet.findFirst({
    where: { id: petId, clinicId },
    select: { id: true },
  });

  if (!pet) {
    return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 });
  }

  const selectedVaccine = parsed.data.vaccineId
    ? await prisma.vaccineCatalog.findFirst({
        where: {
          id: parsed.data.vaccineId,
          clinicId,
        },
        select: { id: true, name: true },
      })
    : null;

  if (parsed.data.vaccineId && !selectedVaccine) {
    return NextResponse.json(
      { message: "La vacuna seleccionada no pertenece a esta clínica." },
      { status: 404 }
    );
  }

  const created = await prisma.vaccinationRecord.create({
    data: {
      clinicId,
      petId,
      vaccineId: selectedVaccine?.id ?? null,
      vaccineName: selectedVaccine?.name ?? parsed.data.vaccineName,
      appliedAt: parsed.data.appliedAt,
      nextDueAt: parsed.data.nextDueAt,
      batchNumber: parsed.data.batchNumber ?? null,
      notes: parsed.data.notes ?? null,
    },
    include: { vaccine: true, visit: true },
  });

  return NextResponse.json(created, { status: 201 });
}
