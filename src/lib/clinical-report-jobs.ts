import "server-only";

import puppeteer from "puppeteer";
import { ClinicalReportJobStatus, NotificationChannel, NotificationStatus } from "@/generated/prisma/client";
import { getClinicalReportData, type ClinicalReportRange } from "@/lib/clinical-report";
import { renderClinicalReportHtml } from "@/lib/print/renderClinicalReportHtml";
import { prisma } from "@/lib/prisma";
import { storeGeneratedReport } from "@/lib/storage";

type JobInput = { petIds: number[]; clientId?: number; range: ClinicalReportRange };

export async function processClinicalReportJobs(limit = 2) {
  await prisma.clinicalReportJob.updateMany({ where: { status: ClinicalReportJobStatus.PROCESSING, updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }, data: { status: ClinicalReportJobStatus.PENDING, error: "Reintentando trabajo interrumpido" } });
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const pending = await prisma.clinicalReportJob.findFirst({ where: { status: ClinicalReportJobStatus.PENDING }, orderBy: { createdAt: "asc" } });
    if (!pending) break;
    const claimed = await prisma.clinicalReportJob.updateMany({ where: { id: pending.id, status: ClinicalReportJobStatus.PENDING }, data: { status: ClinicalReportJobStatus.PROCESSING, error: null } });
    if (!claimed.count) continue;
    processed += 1;
    await processOne(pending.id).catch(() => undefined);
  }
  return { reportJobsProcessed: processed };
}

async function processOne(jobId: number) {
  const job = await prisma.clinicalReportJob.findUniqueOrThrow({ where: { id: jobId } });
  const input = { petIds: Array.isArray(job.petIds) ? job.petIds.filter((id): id is number => typeof id === "number") : [], clientId: job.clientId ?? undefined, range: job.range as ClinicalReportRange } satisfies JobInput;
  try {
    const data = await getClinicalReportData({ clinicId: job.clinicId, ...input });
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    let pdf: Uint8Array;
    try {
      const page = await browser.newPage();
      await page.emulateTimezone(data.clinic.timezone);
      await page.setContent(renderClinicalReportHtml(data), { waitUntil: "networkidle0" });
      pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" } });
    } finally { await browser.close(); }
    const firstName = data.patients[0]?.name ?? "paciente";
    const storageRef = await storeGeneratedReport({ clinicId: job.clinicId, fileName: `historial-clinico-${firstName}.pdf`, body: pdf });
    await prisma.clinicalReportJob.update({ where: { id: job.id }, data: { status: ClinicalReportJobStatus.COMPLETED, storageRef, completedAt: new Date(), error: null } });
    await createReportNotification(job, "COMPLETED", `El informe clínico de ${firstName} está listo.`, "Informe clínico listo");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generando informe clínico";
    await prisma.clinicalReportJob.update({ where: { id: job.id }, data: { status: ClinicalReportJobStatus.FAILED, error: message, completedAt: null } });
    await createReportNotification(job, "FAILED", "No pudimos generar el informe clínico.", "Informe clínico no disponible");
  }
}

async function createReportNotification(job: { id: number; clinicId: number; requestedById: string }, status: "COMPLETED" | "FAILED", message: string, title: string) {
  await prisma.notification.create({
    data: {
      clinicId: job.clinicId, channel: NotificationChannel.IN_APP, status: NotificationStatus.SENT,
      type: `CLINICAL_REPORT_${status}`, eventKey: `clinical-report:${job.id}:${status}`, title, message,
      targetUrl: status === "COMPLETED" ? `/api/clinical-reports/jobs/${job.id}/download` : `/api/clinical-reports/jobs/${job.id}/retry`, sentAt: new Date(),
      recipients: { create: { userId: job.requestedById, status: NotificationStatus.SENT, sentAt: new Date() } },
    },
  }).catch((error: unknown) => { if ((error as { code?: string })?.code !== "P2002") throw error; });
}
