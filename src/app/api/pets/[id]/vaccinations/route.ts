import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { VaccinationRecordCreateSchema } from "@/lib/validators/vaccination";

function getFirstIssueMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "No pudimos registrar la vacuna.";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("vaccines.read");
  const petId = Number((await params).id);

  if (!Number.isFinite(petId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const query = new URL(req.url).searchParams;
  const date = query.get("date");
  const page = Math.max(0, Number(query.get("page") ?? 0));
  const pageSize = Math.min(50, Math.max(1, Number(query.get("pageSize") ?? 5)));
  const dateFilter = date ? { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T00:00:00.000Z`).getTime() + 86400000 } : undefined;
  const where = { petId, clinicId, ...(dateFilter ? { appliedAt: { gte: dateFilter.gte, lt: new Date(dateFilter.lt) } } : {}) };
  const [total, records] = await Promise.all([
    prisma.vaccinationRecord.count({ where }),
    prisma.vaccinationRecord.findMany({
    where,
    orderBy: { appliedAt: "desc" },
    include: { vaccine: true, visit: true },
    skip: page * pageSize,
    take: pageSize,
  })]);

  return query.has("page") || query.has("date")
    ? NextResponse.json({ data: records, total, page, pageSize })
    : NextResponse.json(records);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; recordId?: string }> }) {
  const { clinicId } = await requireClinicPermission("vaccines.update");
  const { id, recordId } = await params;
  const petId = Number(id);
  const vaccinationId = Number(recordId);
  if (!Number.isFinite(petId) || !Number.isFinite(vaccinationId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  const parsed = VaccinationRecordCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: getFirstIssueMessage(parsed.error), issues: parsed.error.issues }, { status: 422 });
  const existing = await prisma.vaccinationRecord.findFirst({ where: { id: vaccinationId, petId, clinicId } });
  if (!existing) return NextResponse.json({ message: "Vacuna no encontrada" }, { status: 404 });
  const vaccine = parsed.data.vaccineId ? await prisma.vaccineCatalog.findFirst({ where: { id: parsed.data.vaccineId, clinicId }, select: { id: true, name: true } }) : null;
  if (parsed.data.vaccineId && !vaccine) return NextResponse.json({ message: "La vacuna seleccionada no pertenece a esta clínica." }, { status: 404 });
  const updated = await prisma.vaccinationRecord.update({ where: { id: vaccinationId }, data: { vaccineId: vaccine?.id ?? null, vaccineName: vaccine?.name ?? parsed.data.vaccineName, appliedAt: parsed.data.appliedAt, nextDueAt: parsed.data.nextDueAt, batchNumber: parsed.data.batchNumber ?? null, notes: parsed.data.notes ?? null }, include: { vaccine: true, visit: true } });
  return NextResponse.json(updated);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("vaccines.create");
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
