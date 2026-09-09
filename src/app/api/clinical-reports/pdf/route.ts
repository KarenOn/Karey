import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { requireClinicPermission } from "@/lib/server-auth";
import { getClinicalReportData } from "@/lib/clinical-report";
import { renderClinicalReportHtml } from "@/lib/print/renderClinicalReportHtml";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { clinicId } = await requireClinicPermission("pets.viewClinicalHistory");
  const query = new URL(req.url).searchParams;
  const petIds = (query.get("petIds") ?? "").split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const clientId = Number(query.get("clientId"));
  if ((Number.isInteger(clientId) && clientId > 0 && petIds.length) || (!petIds.length && !(Number.isInteger(clientId) && clientId > 0))) {
    return NextResponse.json({ error: "Selecciona pacientes o un cliente para generar el informe." }, { status: 422 });
  }
  const data = await getClinicalReportData({ clinicId, petIds, clientId: Number.isInteger(clientId) && clientId > 0 ? clientId : undefined, range: { mode: (query.get("rangeMode") ?? "all") as "today" | "date" | "range" | "all", date: query.get("date") ?? undefined, from: query.get("from") ?? undefined, to: query.get("to") ?? undefined } });
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.emulateTimezone(data.clinic.timezone);
    await page.setContent(renderClinicalReportHtml(data), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" } });
    return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="historial-clinico-${data.patients.length}-paciente${data.patients.length === 1 ? "" : "s"}.pdf"` } });
  } finally { await browser.close(); }
}
