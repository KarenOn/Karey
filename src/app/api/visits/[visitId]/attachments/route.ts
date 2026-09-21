import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { serializeAttachment } from "@/lib/storage";
import { MedicalAttachmentCreateSchema } from "@/lib/validators/attachments";
import { deriveAttachmentDisplayName } from "@/lib/attachments";

export const runtime = "nodejs";

async function getVisitOrResponse(visitId: number, clinicId: number) {
  const visit = await prisma.clinicalVisit.findFirst({
    where: { id: visitId, clinicId },
    select: { id: true, clinicId: true },
  });

  if (!visit) {
    return NextResponse.json(
      { message: "Visita no encontrada" },
      { status: 404 }
    );
  }

  return visit;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { clinicId } = await requireClinicPermission("visits.read");
  if (!clinicId) {
    return NextResponse.json(
      { message: "No se pudo identificar la clínica activa" },
      { status: 400 }
    );
  }

  const visitId = Number((await params).visitId);
  if (!Number.isFinite(visitId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const visit = await getVisitOrResponse(visitId, clinicId);
  if (visit instanceof NextResponse) {
    return visit;
  }

  const attachments = await prisma.medicalAttachment.findMany({
    where: { clinicId: visit.clinicId, visitId },
    orderBy: { createdAt: "desc" },
  });

  const serialized = await Promise.all(attachments.map(serializeAttachment));
  return NextResponse.json(serialized);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { clinicId } = await requireClinicPermission("visits.attachDocuments");
  if (!clinicId) {
    return NextResponse.json(
      { message: "No se pudo identificar la clínica activa" },
      { status: 400 }
    );
  }

  const visitId = Number((await params).visitId);
  if (!Number.isFinite(visitId)) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = MedicalAttachmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validación fallida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const visit = await getVisitOrResponse(visitId, clinicId);
  if (visit instanceof NextResponse) {
    return visit;
  }

  const { fileName, displayName, originalFilename, fileType, fileSizeBytes, storageRef, url } = parsed.data;
  const resolvedOriginalFilename = originalFilename || fileName;
  const resolvedDisplayName = displayName || deriveAttachmentDisplayName(resolvedOriginalFilename);

  const created = await prisma.medicalAttachment.create({
    data: {
      clinicId: visit.clinicId,
      visitId,
      fileName: resolvedDisplayName,
      displayName: resolvedDisplayName,
      originalFilename: resolvedOriginalFilename,
      fileType: fileType || null,
      fileSizeBytes: fileSizeBytes ?? null,
      url: storageRef ?? url ?? "",
    },
  });

  return NextResponse.json(await serializeAttachment(created), { status: 201 });
}
