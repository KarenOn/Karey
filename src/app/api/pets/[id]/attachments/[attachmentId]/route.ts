import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { clinicId } = await requireClinicPermission("visits.attachDocuments");
  const { id, attachmentId: rawAttachmentId } = await params;
  const petId = Number(id);
  const attachmentId = Number(rawAttachmentId);
  if (!Number.isInteger(petId) || !Number.isInteger(attachmentId)) return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  const attachment = await prisma.medicalAttachment.findFirst({ where: { id: attachmentId, petId, clinicId }, select: { id: true, url: true } });
  if (!attachment) return NextResponse.json({ message: "Adjunto no encontrado" }, { status: 404 });
  await prisma.medicalAttachment.delete({ where: { id: attachment.id } });
  try {
    await deleteStoredFile(attachment.url);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Registro eliminado; archivo pendiente de limpieza" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
