import {
  clinicalDate,
  clinicalDateTime,
  clinicalRangeLabel,
  clinicalSex,
  clinicalSpecies,
} from "@/lib/clinical-report-formatters";
import type { ClinicalReportData } from "@/types/clinical-report";

function esc(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
}

export function renderClinicalReportHtml(data: ClinicalReportData) {
  const { clinic, range, patients } = data;
  const sections = patients
    .map(
      (patient) => `
    <section class="patient ${patients.length > 1 ? "patient-break" : ""}">
      <div class="patient-heading"><div><p class="eyebrow">Paciente</p><h2>${esc(patient.name)}</h2></div><div class="patient-meta"><strong>${esc(clinicalSpecies(patient.species))}</strong><span>${esc(patient.breed || "Sin raza")} · ${esc(clinicalSex(patient.sex))}${patient.age !== null ? ` · ${patient.age} año${patient.age === 1 ? "" : "s"}` : ""}</span></div></div>
      <p class="owner"><strong>Propietario:</strong> ${esc(patient.client.fullName)}${patient.client.phone ? ` · ${esc(patient.client.phone)}` : ""}${patient.client.email ? ` · ${esc(patient.client.email)}` : ""}</p>
      <h3>Visitas clínicas</h3>
      ${patient.visits.length ? patient.visits.map((visit) => `<article class="visit"><div class="visit-top"><strong>${esc(clinicalDateTime(visit.visitAt, clinic.timezone))}</strong><span>Veterinario: ${esc(visit.vet?.name ?? "Veterinario no registrado")}</span></div>${visit.weightKg !== null || visit.temperatureC !== null ? `<p class="vitals">${visit.weightKg !== null ? `Peso: ${esc(visit.weightKg)} kg` : ""}${visit.weightKg !== null && visit.temperatureC !== null ? " · " : ""}${visit.temperatureC !== null ? `Temperatura: ${esc(visit.temperatureC)} °C` : ""}</p>` : ""}${visit.diagnosis ? `<p><b>Diagnóstico:</b> ${esc(visit.diagnosis)}</p>` : ""}${visit.treatment ? `<p><b>Tratamiento:</b> ${esc(visit.treatment)}</p>` : ""}${visit.notes ? `<p><b>Notas:</b> ${esc(visit.notes)}</p>` : ""}${visit.attachments.length ? `<p class="attachment"><b>Anexos:</b> ${visit.attachments.map((attachment) => `${esc(attachment.fileName)}${attachment.fileType ? ` (${esc(attachment.fileType)})` : ""}`).join(", ")}</p>` : ""}</article>`).join("") : `<p class="muted">No hay visitas en el rango solicitado.</p>`}
      <h3>Vacunas</h3>
      ${
        patient.vaccinations.length
          ? `<table><thead><tr><th>Vacuna</th><th>Aplicación</th><th>Próxima dosis</th><th>Lote</th></tr></thead><tbody>${patient.vaccinations.map((record) => `<tr><td>${esc(record.vaccineName)}</td><td>${esc(clinicalDate(record.appliedAt, clinic.timezone))}</td><td>${esc(clinicalDate(record.nextDueAt, clinic.timezone))}</td><td>${esc(record.batchNumber || "-")}</td></tr>`).join("")}</tbody></table>${
              patient.vaccinations.some((record) => record.notes)
                ? `<div class="vaccine-notes">${patient.vaccinations
                    .filter((record) => record.notes)
                    .map(
                      (record) =>
                        `<p><b>${esc(record.vaccineName)}:</b> ${esc(record.notes)}</p>`,
                    )
                    .join("")}</div>`
                : ""
            }`
          : `<p class="muted">No hay vacunas en el rango solicitado.</p>`
      }
    </section>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:A4;margin:15mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#172033;font-family:Arial,sans-serif;font-size:11px;line-height:1.45}.toolbar{display:flex;gap:8px;justify-content:flex-end;margin:0 auto 18px;max-width:800px}.toolbar button,.toolbar a{border:1px solid #d7dce5;border-radius:7px;background:#fff;color:#2d3a66;padding:8px 12px;text-decoration:none;font-weight:700}.report{max-width:800px;margin:0 auto}.clinic-header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #0d9488;padding-bottom:14px}.clinic-name{color:#2d3a66;font-size:22px;font-weight:800;margin:0}.clinic-data{text-align:right;color:#657084;font-size:10px}.eyebrow{color:#0d9488;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin:0 0 4px}.report-title{margin:18px 0 2px;color:#2d3a66;font-size:25px}.range{color:#657084;margin:0 0 20px}.patient{border-top:1px solid #dfe4eb;padding-top:18px;margin-top:22px}.patient-break{break-before:page}.patient-heading{display:flex;justify-content:space-between;gap:20px}.patient-heading h2{font-size:20px;color:#2d3a66;margin:0}.patient-meta{text-align:right;color:#657084}.patient-meta strong{display:block;color:#0d9488;font-size:12px}.owner{background:#f4f7f8;border-left:3px solid #0d9488;padding:8px 10px;margin:12px 0 18px}.patient h3{color:#2d3a66;font-size:14px;border-bottom:1px solid #dfe4eb;padding-bottom:5px;margin:18px 0 9px}.visit{border:1px solid #e1e5eb;border-radius:7px;padding:10px 12px;margin:8px 0;break-inside:avoid}.visit-top{display:flex;justify-content:space-between;color:#2d3a66}.visit-top span{color:#657084}.visit p{margin:5px 0}.vitals,.muted,.attachment{color:#657084}.attachment{font-size:10px}table{width:100%;border-collapse:collapse;break-inside:avoid}th,td{text-align:left;border-bottom:1px solid #e1e5eb;padding:7px 6px}th{background:#f4f7f8;color:#2d3a66;font-size:10px}.vaccine-notes{margin-top:8px;color:#657084}.footer{border-top:1px solid #dfe4eb;margin-top:25px;padding-top:8px;color:#657084;font-size:9px;display:flex;justify-content:space-between}@media print{.toolbar{display:none}.report{max-width:none}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir</button><a href="/api/clinical-reports/pdf?${new URLSearchParams({ petIds: patients.map((patient) => String(patient.id)).join(","), rangeMode: range.mode, ...(range.date ? { date: range.date } : {}), ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) }).toString()}">Descargar PDF</a></div><main class="report"><header class="clinic-header"><div><p class="eyebrow">Karey Vet · Informe clínico</p><p class="clinic-name">${esc(clinic.name)}</p></div><div class="clinic-data">${[clinic.address, clinic.phone, clinic.email, clinic.taxId ? `RNC/NIT: ${clinic.taxId}` : null].filter(Boolean).map(esc).join("<br>")}</div></header><h1 class="report-title">Historial clínico</h1><p class="range"><strong>Rango:</strong> ${esc(clinicalRangeLabel(range))} · Generado: ${esc(clinicalDateTime(new Date().toISOString(), clinic.timezone))}</p>${sections || `<p class="muted">No se encontraron pacientes para generar el informe.</p>`}<footer class="footer"><span>${esc(clinic.name)}</span><span>Documento clínico confidencial</span></footer></main></body></html>`;
}
