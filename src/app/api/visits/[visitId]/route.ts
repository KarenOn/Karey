import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";

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
    data: { visitAt: data.visitAt, weightKg: data.weightKg, temperatureC: data.temperatureC, diagnosis: data.diagnosis || null, treatment: data.treatment || null, notes: data.notes || null, vetId: data.vetId || null },
    include: { attachments: true },
  });
  if (data.attachment) {
    await prisma.medicalAttachment.create({ data: { clinicId, visitId, fileName: data.attachment.fileName, fileType: data.attachment.fileType || null, url: data.attachment.storageRef ?? data.attachment.url ?? "" } });
  }
  return NextResponse.json(updated);
}
