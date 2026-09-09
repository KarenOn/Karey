import { notFound } from "next/navigation";
import { getClinicIdOrFail } from "@/lib/auth";
import { getClinicalReportData } from "@/lib/clinical-report";
import ClinicalReportDocument from "@/components/printing/ClinicalReportDocument";

export default async function ClinicalReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const clinicId = await getClinicIdOrFail();
  const query = await searchParams;
  const value = (key: string) => typeof query[key] === "string" ? query[key] as string : undefined;
  const petIds = (value("petIds") ?? "").split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const clientId = Number(value("clientId"));
  if (!petIds.length && !(Number.isInteger(clientId) && clientId > 0)) notFound();
  const data = await getClinicalReportData({ clinicId, petIds, clientId: Number.isInteger(clientId) && clientId > 0 ? clientId : undefined, range: { mode: (value("rangeMode") ?? "all") as "today" | "date" | "range" | "all", date: value("date"), from: value("from"), to: value("to") } });
  return <ClinicalReportDocument data={data} autoPrint={value("autoprint") === "1"} />;
}
