import { NextResponse } from "next/server";
import { getClinicIdOrFail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  _: Request,
  {
    params,
  }: { params: Promise<{ visitId: string; attachmentId: string }> }
) {
  const clinicId = await getClinicIdOrFail();
  const { visitId: rawVisitId, attachmentId: rawAttachmentId } = await params;

  const visitId = Number(rawVisitId);
  const attachmentId = Number(rawAttachmentId);

  if (!Number.isFinite(visitId) || !Number.isFinite(attachmentId)) {
    return NextResponse.json({ message: "ID invalido" }, { status: 400 });
  }

  const attachment = await prisma.medicalAttachment.findFirst({
    where: { id: attachmentId, visitId, clinicId },
    select: { id: true, url: true },
  });

  if (!attachment) {
    return NextResponse.json(
      { message: "Adjunto no encontrado" },
      { status: 404 }
    );
  }

  try {
    await deleteStoredFile(attachment.url);
    await prisma.medicalAttachment.delete({
      where: { id: attachment.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el adjunto",
      },
      { status: 500 }
    );
  }
}
