import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { serializeAttachment, storageRefBelongsToMedicalAttachment } from "@/lib/storage";
import { MedicalAttachmentCreateSchema } from "@/lib/validators/attachments";
import { deriveAttachmentDisplayName } from "@/lib/attachments";

export const runtime = "nodejs";

async function getPet(petId: number, clinicId: number) {
  return prisma.pet.findFirst({ where: { id: petId, clinicId }, select: { id: true, clinicId: true } });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("visits.read");
  const petId = Number((await params).id);
  if (!Number.isInteger(petId) || petId <= 0) return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  if (!await getPet(petId, clinicId)) return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 });
  const attachments = await prisma.medicalAttachment.findMany({
    where: { clinicId, petId },
    orderBy: { createdAt: "desc" },
    include: { visit: { select: { id: true, visitAt: true, diagnosis: true, appointment: { select: { reason: true } } } } },
  });
  return NextResponse.json(await Promise.all(attachments.map(serializeAttachment)));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("visits.attachDocuments");
  const petId = Number((await params).id);
  if (!Number.isInteger(petId) || petId <= 0) return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  const pet = await getPet(petId, clinicId);
  if (!pet) return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 });
  const parsed = MedicalAttachmentCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Validación fallida", issues: parsed.error.issues }, { status: 400 });

  const visitId = parsed.data.visitId;
  let visit: { id: number; petId: number } | null = null;
  if (visitId) {
    visit = await prisma.clinicalVisit.findFirst({ where: { id: visitId, clinicId, petId }, select: { id: true, petId: true } });
    if (!visit) return NextResponse.json({ message: "La visita no existe o no pertenece al paciente" }, { status: 409 });
  }
  if (!parsed.data.storageRef || !storageRefBelongsToMedicalAttachment(parsed.data.storageRef, { clinicId, petId, visitId })) {
    return NextResponse.json({ message: "El archivo no fue generado para este paciente" }, { status: 403 });
  }

  const originalFilename = parsed.data.originalFilename || parsed.data.fileName;
  const displayName = parsed.data.displayName || deriveAttachmentDisplayName(originalFilename);
  const created = await prisma.medicalAttachment.create({ data: { clinicId, petId, visitId, fileName: displayName, displayName, originalFilename, fileType: parsed.data.fileType || null, fileSizeBytes: parsed.data.fileSizeBytes ?? null, url: parsed.data.storageRef } });
  return NextResponse.json(await serializeAttachment(created), { status: 201 });
}
