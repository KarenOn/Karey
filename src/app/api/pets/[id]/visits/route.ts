import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { serializeAttachment } from "@/lib/storage";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { clinicId } = await requireClinicPermission("visits.read");
  if (!clinicId) {
    return NextResponse.json(
      { message: "No se pudo identificar la clínica activa" },
      { status: 400 }
    );
  }

  const petId = Number((await params).id);
  if (!Number.isFinite(petId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const query = new URL(req.url).searchParams;
  const date = query.get("date");
  const visitId = Number(query.get("visitId"));
  const page = Math.max(0, Number(query.get("page") ?? 0));
  const pageSize = Math.min(50, Math.max(1, Number(query.get("pageSize") ?? 5)));
  const where = { petId, clinicId, ...(Number.isFinite(visitId) && visitId > 0 ? { id: visitId } : {}), ...(date ? { visitAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(new Date(`${date}T00:00:00.000Z`).getTime() + 86400000) } } : {}) };
  const [total, visits] = await Promise.all([
    prisma.clinicalVisit.count({ where }),
    prisma.clinicalVisit.findMany({
    where,
    orderBy: { visitAt: "desc" },
    include: {
      attachments: true,
      vet: { select: { id: true, name: true, email: true } },
      appointment: { select: { reason: true } },
    },
    skip: page * pageSize,
    take: pageSize,
  })]);

  const serializedVisits = await Promise.all(
    visits.map(async (visit) => ({
      ...visit,
      attachments: await Promise.all(visit.attachments.map(serializeAttachment)),
    }))
  );

  return query.has("page") || query.has("date")
    ? NextResponse.json({ data: serializedVisits, total, page, pageSize })
    : NextResponse.json(serializedVisits);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { clinicId, member, session } = await requireClinicPermission("visits.create");
  const petId = Number((await params).id);
  if (!Number.isFinite(petId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ClinicalVisitCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validación fallida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const pet = await prisma.pet.findFirst({ where: { id: petId, clinicId } });
  if (!pet) {
    return NextResponse.json(
      { message: "Mascota no encontrada" },
      { status: 404 }
    );
  }

  if (parsed.data.appointmentId) {
    const appointment = await prisma.appointment.findFirst({ where: { id: parsed.data.appointmentId, clinicId }, select: { petId: true, clientId: true } });
    if (!appointment || appointment.petId !== petId || appointment.clientId !== pet.clientId) return NextResponse.json({ message: "La cita no corresponde al paciente." }, { status: 409 });
  }
  if (parsed.data.todayTurnId) {
    const turn = await prisma.todayTurn.findFirst({ where: { id: parsed.data.todayTurnId, clinicId }, select: { petId: true, clientId: true } });
    if (!turn || turn.petId !== petId || turn.clientId !== pet.clientId) return NextResponse.json({ message: "El turno no corresponde al paciente registrado." }, { status: 409 });
  }
  const sourceWhere = parsed.data.appointmentId ? { appointmentId: parsed.data.appointmentId } : parsed.data.todayTurnId ? { todayTurnId: parsed.data.todayTurnId } : null;
  if (sourceWhere) {
    const existing = await prisma.clinicalVisit.findFirst({ where: { clinicId, ...sourceWhere }, include: { attachments: true } });
    if (existing) return NextResponse.json(existing);
  }

  const data = { ...parsed.data, vetId: member?.role.key === "vet" ? session.user.id : parsed.data.vetId };

  const visit = await prisma.clinicalVisit.create({
    data: {
      clinicId,
      clientId: pet.clientId,
      petId,
      visitAt: data.visitAt,
      weightKg: data.weightKg,
      temperatureC: data.temperatureC,
      heartRateBpm: data.heartRateBpm,
      respiratoryRatePpm: data.respiratoryRatePpm,
      anamnesis: data.anamnesis || null,
      diagnosis: data.diagnosis || null,
      treatment: data.treatment || null,
      carePlan: data.carePlan || null,
      notes: data.notes || null,
      nextReviewAt: data.nextReviewAt ?? null,
      vetId: data.vetId ? data.vetId : null,
      appointmentId: data.appointmentId ?? null,
      todayTurnId: data.todayTurnId ?? null,
    },
  });

  if (data.attachment) {
    await prisma.medicalAttachment.create({
      data: {
        clinicId,
        visitId: visit.id,
        fileName: data.attachment.fileName,
        fileType: data.attachment.fileType || null,
        url: data.attachment.storageRef ?? data.attachment.url ?? "",
      },
    });
  }

  return NextResponse.json(await prisma.clinicalVisit.findUnique({ where: { id: visit.id }, include: { attachments: true } }), { status: 201 });
}
