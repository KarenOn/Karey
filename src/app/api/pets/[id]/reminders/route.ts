import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission, isElevatedClinicRole } from "@/lib/permissions";
import { requireClinicPermissions } from "@/lib/server-auth";
import { resolveClinicalReminderKind, type ClinicalReminderKind } from "@/lib/clinical-reminder-rules";

export const runtime = "nodejs";

type ReminderRow = {
  id: string;
  type: "vaccine" | "visit";
  description: string;
  dueDate: string;
  kind: ClinicalReminderKind;
  sourceId: number;
  sourceHref: string;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, member } = await requireClinicPermissions(["visits.read", "vaccines.read", "pets.read"]);
  const petId = Number((await params).id);
  if (!Number.isInteger(petId) || petId <= 0) return NextResponse.json({ message: "ID inválido" }, { status: 400 });

  const elevated = isElevatedClinicRole(member.role.key);
  const canReadVisits = elevated || hasPermission(member.role.permissions, "visits.read") || hasPermission(member.role.permissions, "pets.read");
  const canReadVaccines = elevated || hasPermission(member.role.permissions, "vaccines.read") || hasPermission(member.role.permissions, "pets.read");
  const now = new Date();
  const [pet, visits, vaccinations] = await Promise.all([
    prisma.pet.findFirst({ where: { id: petId, clinicId }, select: { id: true } }),
    canReadVisits ? prisma.clinicalVisit.findMany({ where: { petId, clinicId, nextReviewAt: { not: null } }, select: { id: true, nextReviewAt: true, diagnosis: true, clinic: { select: { timezone: true } } } }) : [],
    canReadVaccines ? prisma.vaccinationRecord.findMany({ where: { petId, clinicId, nextDueAt: { not: null } }, select: { id: true, vaccineName: true, nextDueAt: true, clinic: { select: { timezone: true } } } }) : [],
  ]);
  if (!pet) return NextResponse.json({ message: "Mascota no encontrada" }, { status: 404 });

  const rows: ReminderRow[] = [];
  for (const visit of visits) {
    if (!visit.nextReviewAt) continue;
    const kind = resolveClinicalReminderKind({ source: "visit", dueDate: visit.nextReviewAt, now, timeZone: visit.clinic.timezone || "America/Santo_Domingo" });
    if (!kind) continue;
    rows.push({ id: `visit-${visit.id}`, type: "visit", description: visit.diagnosis ? `Control posterior a: ${visit.diagnosis}` : "Próximo control clínico", dueDate: visit.nextReviewAt.toISOString(), kind, sourceId: visit.id, sourceHref: `/pets/${petId}?visitId=${visit.id}` });
  }
  for (const vaccination of vaccinations) {
    if (!vaccination.nextDueAt) continue;
    const kind = resolveClinicalReminderKind({ source: "vaccine", dueDate: vaccination.nextDueAt, now, timeZone: vaccination.clinic.timezone || "America/Santo_Domingo" });
    if (!kind) continue;
    rows.push({ id: `vaccine-${vaccination.id}`, type: "vaccine", description: vaccination.vaccineName ? `Próxima dosis: ${vaccination.vaccineName}` : "Próxima dosis de vacuna", dueDate: vaccination.nextDueAt.toISOString(), kind, sourceId: vaccination.id, sourceHref: `/pets/${petId}?vaccinationId=${vaccination.id}` });
  }

  rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const searchParams = new URL(req.url).searchParams;
  const type = searchParams.get("type");
  const period = searchParams.get("period");
  const filtered = rows.filter((row) => (!type || type === "all" || row.type === type) && (!period || period === "all" || (period === "overdue" ? row.kind === "vaccine-overdue" : period === "upcoming" ? row.kind !== "vaccine-overdue" : true)));
  const rawPage = Number(searchParams.get("page") || 0);
  const rawPageSize = Number(searchParams.get("pageSize") || 10);
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const pageSize = Number.isInteger(rawPageSize) ? Math.min(50, Math.max(1, rawPageSize)) : 10;
  return NextResponse.json({ data: filtered.slice(page * pageSize, (page + 1) * pageSize), total: filtered.length, page, pageSize });
}
