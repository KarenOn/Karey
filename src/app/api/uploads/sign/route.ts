import { NextResponse } from "next/server";
import { z } from "zod";
import { getClinicIdOrFail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSignedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

const UploadSignSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("clinic-logo"),
    fileName: z.string().trim().min(1).max(255),
    fileType: z.string().trim().max(120).optional(),
  }),
  z.object({
    scope: z.literal("medical-attachment"),
    fileName: z.string().trim().min(1).max(255),
    fileType: z.string().trim().max(120).optional(),
    visitId: z.coerce.number().int().positive(),
  }),
]);

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();
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
    if (parsed.data.scope === "medical-attachment") {
      const visit = await prisma.clinicalVisit.findFirst({
        where: { id: parsed.data.visitId, clinicId },
        select: { id: true },
      });

      if (!visit) {
        return NextResponse.json(
          { error: "La visita no existe o no pertenece a la clínica activa" },
          { status: 404 }
        );
      }
    }

    const signed = await createSignedUploadUrl({
      clinicId,
      fileName: parsed.data.fileName,
      fileType: parsed.data.fileType,
      scope: parsed.data.scope,
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
