import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MedicalAttachmentCreateSchema } from "@/lib/validators/attachments";

export async function GET(_: Request, { params }: { params: { visitId: string } }) {
  const visitId = Number(params.visitId);
  if (!Number.isFinite(visitId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const attachments = await prisma.medicalAttachment.findMany({
    where: { visitId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(req: Request, { params }: { params: { visitId: string } }) {
  const visitId = Number(params.visitId);
  if (!Number.isFinite(visitId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = MedicalAttachmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validación fallida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const visit = await prisma.clinicalVisit.findUnique({ where: { id: visitId } });
  if (!visit) return NextResponse.json({ message: "Visita no encontrada" }, { status: 404 });

  const { fileName, fileType, url } = parsed.data;

  const created = await prisma.medicalAttachment.create({
    data: {
      clinicId: visit.clinicId,
      visitId,
      fileName,
      fileType: fileType || null,
      url,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
