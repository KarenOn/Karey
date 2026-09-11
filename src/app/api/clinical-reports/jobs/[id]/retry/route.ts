import { NextResponse } from "next/server";
import { ClinicalReportJobStatus } from "@/generated/prisma/client";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("pets.viewClinicalHistory");
  const id = Number((await params).id);
  const updated = await prisma.clinicalReportJob.updateMany({ where: { id, clinicId, status: ClinicalReportJobStatus.FAILED }, data: { status: ClinicalReportJobStatus.PENDING, error: null } });
  return updated.count ? NextResponse.json({ ok: true }, { status: 202 }) : NextResponse.json({ error: "El informe no se puede reintentar." }, { status: 409 });
}
