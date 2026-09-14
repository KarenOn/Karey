import { renderToBuffer } from "@react-pdf/renderer";
import ClinicalReportPdfDocument from "@/components/printing/ClinicalReportPdfDocument";
import type { ClinicalReportData } from "@/types/clinical-report";

async function resolveOptionalLogo(logoUrl: string | null) {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderClinicalReportPdf(data: ClinicalReportData) {
  const logoUrl = await resolveOptionalLogo(data.clinic.logoUrl);
  return renderToBuffer(<ClinicalReportPdfDocument data={{ ...data, clinic: { ...data.clinic, logoUrl } }} />);
}
