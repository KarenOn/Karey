import { NextResponse } from "next/server";
import { requireClinicPermission } from "@/lib/server-auth";
import { getClinicalReportData, type ClinicalReportRange } from "@/lib/clinical-report";

function parseRequest(url: string) {
  const query = new URL(url).searchParams;
  const mode = (query.get("rangeMode") ?? "all") as ClinicalReportRange["mode"];
  const petIds = (query.get("petIds") ?? "").split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const clientId = Number(query.get("clientId"));
  return { petIds, clientId: Number.isInteger(clientId) && clientId > 0 ? clientId : undefined, range: { mode, date: query.get("date") ?? undefined, from: query.get("from") ?? undefined, to: query.get("to") ?? undefined } };
}

export async function GET(req: Request) {
  try {
    const { clinicId } = await requireClinicPermission("pets.viewClinicalHistory");
    const input = parseRequest(req.url);
    if (input.clientId && input.petIds.length) return NextResponse.json({ error: "Selecciona pacientes o un cliente, no ambos." }, { status: 422 });
    if (!input.clientId && !input.petIds.length) return NextResponse.json({ error: "Selecciona al menos un paciente o cliente." }, { status: 422 });
    return NextResponse.json(await getClinicalReportData({ clinicId, ...input }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el informe.";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    if (["FORBIDDEN", "ACCESS_REVOKED", "CLINIC_INACTIVE"].includes(message)) {
      return NextResponse.json({ error: "No tienes permiso para generar informes clínicos." }, { status: 403 });
    }
    if (message === "Rango de fechas inválido") return NextResponse.json({ error: message }, { status: 422 });
    console.error("[clinical-reports] request failed", message);
    return NextResponse.json({ error: "No se pudo generar el informe." }, { status: 500 });
  }
}
