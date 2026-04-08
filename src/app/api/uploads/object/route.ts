import { NextResponse } from "next/server";
import { z } from "zod";
import { getClinicIdOrFail } from "@/lib/auth";
import { deleteStoredFile, storageRefBelongsToClinic } from "@/lib/storage";

export const runtime = "nodejs";

const DeleteUploadObjectSchema = z.object({
  storageRef: z.string().trim().min(1).max(1000),
});

export async function DELETE(req: Request) {
  const clinicId = await getClinicIdOrFail();
  const body = await req.json().catch(() => null);
  const parsed = DeleteUploadObjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Solicitud invalida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  if (!storageRefBelongsToClinic(parsed.data.storageRef, clinicId)) {
    return NextResponse.json(
      { message: "El archivo no pertenece a la clinica activa" },
      { status: 403 }
    );
  }

  try {
    await deleteStoredFile(parsed.data.storageRef);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el archivo temporal",
      },
      { status: 500 }
    );
  }
}
