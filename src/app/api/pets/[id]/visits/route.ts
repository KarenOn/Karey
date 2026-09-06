import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { serializeAttachment } from "@/lib/storage";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";

export async function GET(
  _: Request,
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

  const visits = await prisma.clinicalVisit.findMany({
    where: { petId, clinicId },
    orderBy: { visitAt: "desc" },
    include: {
      attachments: true,
    },
  });

  const serializedVisits = await Promise.all(
    visits.map(async (visit) => ({
      ...visit,
      attachments: await Promise.all(visit.attachments.map(serializeAttachment)),
    }))
  );

  return NextResponse.json(serializedVisits);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { clinicId } = await requireClinicPermission("visits.create");
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

  const data = parsed.data;

  const visit = await prisma.clinicalVisit.create({
    data: {
      clinicId,
      clientId: pet.clientId,
      petId,
      visitAt: data.visitAt,
      weightKg: data.weightKg,
      temperatureC: data.temperatureC,
      diagnosis: data.diagnosis || null,
      treatment: data.treatment || null,
      notes: data.notes || null,
      vetId: data.vetId ? data.vetId : null,
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
