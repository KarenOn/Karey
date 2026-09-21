import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";
import { deriveAttachmentDisplayName } from "@/lib/attachments";

export async function PUT(req: Request, { params }: { params: Promise<{ visitId: string }> }) {
  const { clinicId } = await requireClinicPermission("visits.update");
  const visitId = Number((await params).visitId);
  const parsed = ClinicalVisitCreateSchema.safeParse(await req.json().catch(() => null));
  if (!Number.isFinite(visitId) || !parsed.success) return NextResponse.json({ message: "Datos de visita inválidos" }, { status: 422 });
  const visit = await prisma.clinicalVisit.findFirst({ where: { id: visitId, clinicId }, select: { id: true } });
  if (!visit) return NextResponse.json({ message: "Visita no encontrada" }, { status: 404 });
  const data = parsed.data;
  const updated = await prisma.clinicalVisit.update({
    where: { id: visitId },
    data: { visitAt: data.visitAt, weightKg: data.weightKg ?? null, temperatureC: data.temperatureC ?? null, heartRateBpm: data.heartRateBpm ?? null, respiratoryRatePpm: data.respiratoryRatePpm ?? null, anamnesis: data.anamnesis || null, diagnosis: data.diagnosis || null, treatment: data.treatment || null, carePlan: data.carePlan || null, notes: data.notes || null, nextReviewAt: data.nextReviewAt ?? null, vetId: data.vetId || null },
    include: { attachments: true, vet: { select: { id: true, name: true, email: true } }, appointment: { select: { reason: true } } },
  });
  if (data.attachment) {
    const originalFilename = data.attachment.originalFilename || data.attachment.fileName;
    const displayName = data.attachment.displayName || deriveAttachmentDisplayName(originalFilename);
    await prisma.medicalAttachment.create({ data: { clinicId, visitId, fileName: displayName, displayName, originalFilename, fileType: data.attachment.fileType || null, fileSizeBytes: data.attachment.fileSizeBytes ?? null, url: data.attachment.storageRef ?? data.attachment.url ?? "" } });
  }
  return NextResponse.json(updated);
}
