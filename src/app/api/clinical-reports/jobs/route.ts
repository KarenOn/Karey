import { NextResponse } from "next/server";
import { ClinicalReportJobStatus } from "@/generated/prisma/client";
import { requireClinicPermission } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import type { ClinicalReportRange } from "@/types/clinical-report";

export const runtime = "nodejs";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const petIds = Array.isArray(value.petIds) ? value.petIds.filter((id): id is number => Number.isInteger(id) && id > 0) : [];
  const clientId = Number.isInteger(value.clientId) && (value.clientId as number) > 0 ? value.clientId as number : undefined;
  const range = value.range && typeof value.range === "object" ? value.range as ClinicalReportRange : null;
  if ((petIds.length && clientId) || (!petIds.length && !clientId) || !range || !["today", "date", "range", "all"].includes(range.mode)) return null;
  return { petIds: [...new Set(petIds)].sort((a, b) => a - b), clientId, range };
}

export async function POST(req: Request) {
  try {
    const { clinicId, session } = await requireClinicPermission("pets.viewClinicalHistory");
    const input = parseBody(await req.json().catch(() => null));
    if (!input) return NextResponse.json({ error: "Selecciona pacientes, cliente y rango válidos." }, { status: 422 });
    const dedupeKey = JSON.stringify(input);
    const job = await prisma.clinicalReportJob.upsert({
      where: { clinicId_dedupeKey: { clinicId, dedupeKey } },
      create: { clinicId, requestedById: session.user.id, dedupeKey, petIds: input.petIds, clientId: input.clientId ?? null, range: input.range, status: ClinicalReportJobStatus.PENDING },
      update: {},
      select: { id: true, status: true },
    });
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo solicitar el informe.";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    if (["FORBIDDEN", "ACCESS_REVOKED", "CLINIC_INACTIVE"].includes(message)) {
      return NextResponse.json({ error: "No tienes permiso para generar informes clínicos." }, { status: 403 });
    }
    console.error("[clinical-reports/jobs] request failed", message);
    return NextResponse.json({ error: "No se pudo solicitar el informe." }, { status: 500 });
  }
}
