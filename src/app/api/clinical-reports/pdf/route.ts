import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { getClinicalReportData } from "@/lib/clinical-report";
import { renderClinicalReportPdf } from "@/lib/print/renderClinicalReportPdf";

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
  const pdf = await renderClinicalReportPdf(data);
  return new NextResponse(pdf as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="historial-clinico-${data.patients.length}-paciente${data.patients.length === 1 ? "" : "s"}.pdf"` } });
}
