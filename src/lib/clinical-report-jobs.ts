import "server-only";

import puppeteer from "puppeteer";
import { ClinicalReportJobStatus, NotificationChannel, NotificationStatus } from "@/generated/prisma/client";
import { getClinicalReportData, type ClinicalReportRange } from "@/lib/clinical-report";
import { renderClinicalReportHtml } from "@/lib/print/renderClinicalReportHtml";
import { prisma } from "@/lib/prisma";
import { storeGeneratedReport } from "@/lib/storage";

type JobInput = { petIds: number[]; clientId?: number; range: ClinicalReportRange };
type ReportStage = "FETCH_DATA" | "RENDER_PDF" | "UPLOAD_S3" | "SAVE_RESULT" | "CREATE_NOTIFICATION";

function logStage(reportId: number, stage: ReportStage, status: ClinicalReportJobStatus) {
  console.info("[clinical-report]", { reportId, stage, status });
}

function logStageError(reportId: number, stage: ReportStage, error: unknown) {
  const normalized = error instanceof Error ? error : new Error("Error generando informe clínico");
  console.error("[clinical-report]", {
    reportId,
    stage,
    errorName: normalized.name,
    errorMessage: normalized.message,
    stack: normalized.stack,
  });
}

export async function processClinicalReportJobs(limit = 2) {
  await prisma.clinicalReportJob.updateMany({ where: { status: ClinicalReportJobStatus.PROCESSING, updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }, data: { status: ClinicalReportJobStatus.PENDING, error: "Reintentando trabajo interrumpido", storageRef: null, completedAt: null } });
  let found = 0;
  let completed = 0;
  let failed = 0;
  for (let index = 0; index < limit; index += 1) {
    const pending = await prisma.clinicalReportJob.findFirst({ where: { status: ClinicalReportJobStatus.PENDING }, orderBy: { createdAt: "asc" } });
    if (!pending) break;
    const claimed = await prisma.clinicalReportJob.updateMany({ where: { id: pending.id, status: ClinicalReportJobStatus.PENDING }, data: { status: ClinicalReportJobStatus.PROCESSING, error: null, failureStage: null, failedAt: null, storageRef: null, completedAt: null, attemptCount: { increment: 1 } } });
    if (!claimed.count) continue;
    found += 1;
    const succeeded = await processOne(pending.id).catch((error: unknown) => {
      logStageError(pending.id, "CREATE_NOTIFICATION", error);
      return false;
    });
    if (succeeded) completed += 1;
    else failed += 1;
  }
  return { reportJobsProcessed: found, reports: { found, completed, failed } };
}

async function processOne(jobId: number): Promise<boolean> {
  const job = await prisma.clinicalReportJob.findUniqueOrThrow({ where: { id: jobId } });
  const input = { petIds: Array.isArray(job.petIds) ? job.petIds.filter((id): id is number => typeof id === "number") : [], clientId: job.clientId ?? undefined, range: job.range as ClinicalReportRange } satisfies JobInput;
  let stage: ReportStage = "FETCH_DATA";
  try {
    logStage(job.id, stage, ClinicalReportJobStatus.PROCESSING);
    const data = await getClinicalReportData({ clinicId: job.clinicId, ...input });
    stage = "RENDER_PDF";
    logStage(job.id, stage, ClinicalReportJobStatus.PROCESSING);
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    let pdf: Uint8Array;
    try {
      const page = await browser.newPage();
      await page.emulateTimezone(data.clinic.timezone);
      await page.setContent(renderClinicalReportHtml(data), { waitUntil: "networkidle0" });
      pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" } });
    } finally { await browser.close(); }
    const firstName = data.patients[0]?.name ?? "paciente";
    stage = "UPLOAD_S3";
    logStage(job.id, stage, ClinicalReportJobStatus.PROCESSING);
    const storageRef = await storeGeneratedReport({ clinicId: job.clinicId, fileName: `historial-clinico-${firstName}.pdf`, body: pdf });
    stage = "SAVE_RESULT";
    logStage(job.id, stage, ClinicalReportJobStatus.PROCESSING);
    await prisma.clinicalReportJob.update({ where: { id: job.id }, data: { status: ClinicalReportJobStatus.COMPLETED, storageRef, completedAt: new Date(), error: null, failureStage: null, failedAt: null } });
    stage = "CREATE_NOTIFICATION";
    logStage(job.id, stage, ClinicalReportJobStatus.COMPLETED);
    await createReportNotification(job, "COMPLETED", `El informe clínico de ${firstName} está listo.`, "Informe clínico listo");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generando informe clínico";
    logStageError(job.id, stage, error);
    await prisma.clinicalReportJob.update({ where: { id: job.id }, data: { status: ClinicalReportJobStatus.FAILED, error: message, failureStage: stage, failedAt: new Date(), completedAt: null } });
    await createReportNotification(job, "FAILED", "No pudimos generar el informe clínico.", "Informe clínico no disponible");
    return false;
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
