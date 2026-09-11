import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredFileUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("pets.viewClinicalHistory");
  const id = Number((await params).id);
  const job = await prisma.clinicalReportJob.findFirst({ where: { id, clinicId, status: "COMPLETED" }, select: { storageRef: true } });
  if (!job?.storageRef) return NextResponse.json({ error: "El informe todavía no está listo." }, { status: 409 });
  const url = await resolveStoredFileUrl(job.storageRef, { download: true, fileName: `historial-clinico-${id}.pdf` });
  return url ? NextResponse.redirect(url) : NextResponse.json({ error: "Informe no disponible." }, { status: 404 });
}
