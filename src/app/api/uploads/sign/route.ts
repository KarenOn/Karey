import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { createSignedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

const optionalPositiveId = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const UploadSignSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("clinic-logo"),
    fileName: z.string().trim().min(1).max(255),
    fileType: z.string().trim().max(120).optional(),
  }),
  z.object({
    scope: z.literal("user-avatar"),
    fileName: z.string().trim().min(1).max(255),
    fileType: z.string().trim().max(120).optional(),
  }),
  z.object({
    scope: z.literal("medical-attachment"),
    fileName: z.string().trim().min(1).max(255),
    fileType: z.string().trim().max(120).optional(),
    visitId: optionalPositiveId,
    petId: optionalPositiveId,
  }),
]);

export async function POST(req: Request) {
  const { clinicId } = await requireClinicPermission("visits.attachDocuments");
  if (!clinicId) {
    return NextResponse.json(
      { error: "No se pudo identificar la clínica activa" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = UploadSignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Solicitud inválida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    let resolvedPetId: number | undefined;
    if (parsed.data.scope === "medical-attachment") {
      const visit = parsed.data.visitId ? await prisma.clinicalVisit.findFirst({
        where: { id: parsed.data.visitId, clinicId },
        select: { id: true, petId: true },
      }) : null;

      if (parsed.data.visitId && !visit) {
        return NextResponse.json(
          { error: "La visita no existe o no pertenece a la clínica activa" },
          { status: 404 }
        );
      }
      if (!parsed.data.visitId && !parsed.data.petId) {
        return NextResponse.json({ error: "El paciente es obligatorio para documentos generales" }, { status: 422 });
      }
      if (parsed.data.petId) {
        const pet = await prisma.pet.findFirst({ where: { id: parsed.data.petId, clinicId }, select: { id: true } });
        if (!pet) return NextResponse.json({ error: "El paciente no existe o no pertenece a la clínica activa" }, { status: 404 });
      }
      if (visit && parsed.data.petId && visit.petId !== parsed.data.petId) {
        return NextResponse.json({ error: "La visita no corresponde al paciente" }, { status: 409 });
      }
      resolvedPetId = parsed.data.petId ?? visit?.petId;
    }

    const signed = await createSignedUploadUrl({
      clinicId,
      fileName: parsed.data.fileName,
      fileType: parsed.data.fileType,
      scope: parsed.data.scope,
      petId: resolvedPetId,
      visitId: "visitId" in parsed.data ? parsed.data.visitId : undefined,
    });

    return NextResponse.json(signed);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo firmar la subida del archivo",
      },
      { status: 500 }
    );
  }
}
