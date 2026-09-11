"use client";

import { useEffect } from "react";
import {
  clinicalDate,
  clinicalDateTime,
  clinicalRangeLabel,
  clinicalSex,
  clinicalSpecies,
} from "@/lib/clinical-report-formatters";
import type { ClinicalReportData } from "@/types/clinical-report";

export default function ClinicalReportDocument({
  data,
  autoPrint = false,
}: {
  data: ClinicalReportData;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);
  const downloadUrl = `/api/clinical-reports/pdf?${new URLSearchParams({ ...(data.scope.clientId ? { clientId: String(data.scope.clientId) } : { petIds: data.scope.petIds.join(",") }), rangeMode: data.range.mode, ...(data.range.date ? { date: data.range.date } : {}), ...(data.range.from ? { from: data.range.from } : {}), ...(data.range.to ? { to: data.range.to } : {}) }).toString()}`;
  return (
    <main className="clinical-report-screen">
      <style>{`@page{size:A4;margin:15mm}html,body{margin:0;padding:0;background:#fff;color:#172033;font-family:Arial,sans-serif}.clinical-report-toolbar{display:flex;gap:8px;justify-content:flex-end;margin:0 auto 16px;max-width:800px}.clinical-report-toolbar button,.clinical-report-toolbar a{border:1px solid #d7dce5;border-radius:7px;background:#fff;color:#2d3a66;padding:8px 12px;text-decoration:none;font-weight:700}.clinical-report{max-width:800px;margin:0 auto}.clinic-header{display:flex;justify-content:space-between;border-bottom:3px solid #0d9488;padding-bottom:14px}.clinic-name{color:#2d3a66;font-size:22px;font-weight:800;margin:0}.clinic-data{text-align:right;color:#657084;font-size:10px}.eyebrow{color:#0d9488;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin:0 0 4px}.report-title{margin:18px 0 2px;color:#2d3a66;font-size:25px}.range{color:#657084;margin:0 0 20px}.patient{border-top:1px solid #dfe4eb;padding-top:18px;margin-top:22px}.patient-break{break-before:page}.patient-heading{display:flex;justify-content:space-between}.patient-heading h2{font-size:20px;color:#2d3a66;margin:0}.patient-meta{text-align:right;color:#657084}.patient-meta strong{display:block;color:#0d9488;font-size:12px}.owner{background:#f4f7f8;border-left:3px solid #0d9488;padding:8px 10px}.clinical-visit{border:1px solid #e1e5eb;border-radius:7px;padding:10px 12px;margin:8px 0;break-inside:avoid}.visit-top{display:flex;justify-content:space-between;color:#2d3a66}.clinical-visit p{margin:5px 0}.muted{color:#657084}h3{color:#2d3a66;font-size:14px;border-bottom:1px solid #dfe4eb;padding-bottom:5px;margin:18px 0 9px}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #e1e5eb;padding:7px 6px}th{background:#f4f7f8;color:#2d3a66;font-size:10px}.report-footer{border-top:1px solid #dfe4eb;margin-top:25px;padding-top:8px;color:#657084;font-size:9px;display:flex;justify-content:space-between}@media print{.clinical-report-toolbar{display:none}.clinical-report{max-width:none}}`}</style>
      <div className="clinical-report-toolbar">
        <button type="button" onClick={() => window.print()}>
          Imprimir
        </button>
        <a href={downloadUrl}>Descargar PDF</a>
      </div>
      <article className="clinical-report">
        <header className="clinic-header">
          <div>
            <p className="eyebrow">Karey Vet · Informe clínico</p>
            <p className="clinic-name">{data.clinic.name}</p>
          </div>
          <div className="clinic-data">
            {[
              data.clinic.address,
              data.clinic.phone,
              data.clinic.email,
              data.clinic.taxId ? `RNC/NIT: ${data.clinic.taxId}` : null,
            ]
              .filter(Boolean)
              .map((value, index) => (
                <span key={index}>
                  {value}
                  <br />
                </span>
              ))}
          </div>
        </header>
        <h1 className="report-title">Historial clínico</h1>
        <p className="range">
          <strong>Rango:</strong> {clinicalRangeLabel(data.range)} · Generado:{" "}
          {clinicalDateTime(new Date().toISOString(), data.clinic.timezone)}
        </p>
        {data.patients.map((patient) => (
          <section
            className={`patient ${data.patients.length > 1 ? "patient-break" : ""}`}
            key={patient.id}
          >
            <div className="patient-heading">
              <div>
                <p className="eyebrow">Paciente</p>
                <h2>{patient.name}</h2>
              </div>
              <div className="patient-meta">
                <strong>{clinicalSpecies(patient.species)}</strong>
                <span>
                  {patient.breed || "Sin raza"} · {clinicalSex(patient.sex)}
                  {patient.age !== null
                    ? ` · ${patient.age} año${patient.age === 1 ? "" : "s"}`
                    : ""}
                </span>
              </div>
            </div>
            <p className="owner">
              <strong>Propietario:</strong> {patient.client.fullName}
            </p>
            <h3>Visitas clínicas</h3>
            {patient.visits.length ? (
              patient.visits.map((visit) => (
                <article className="clinical-visit" key={visit.id}>
                  <div className="visit-top">
                    <strong>
                      {clinicalDateTime(visit.visitAt, data.clinic.timezone)}
                    </strong>
                    <span>
                      Veterinario: {visit.vet?.name ?? "Veterinario no registrado"}
                    </span>
                  </div>
                  {visit.weightKg !== null || visit.temperatureC !== null ? (
                    <p className="muted">
                      {visit.weightKg !== null
                        ? `Peso: ${visit.weightKg} kg`
                        : ""}
                      {visit.weightKg !== null && visit.temperatureC !== null
                        ? " · "
                        : ""}
                      {visit.temperatureC !== null
                        ? `Temperatura: ${visit.temperatureC} °C`
                        : ""}
                    </p>
                  ) : null}
                  {visit.diagnosis ? (
                    <p>
                      <b>Diagnóstico:</b> {visit.diagnosis}
                    </p>
                  ) : null}
                  {visit.treatment ? (
                    <p>
                      <b>Tratamiento:</b> {visit.treatment}
                    </p>
                  ) : null}
                  {visit.notes ? (
                    <p>
                      <b>Notas:</b> {visit.notes}
                    </p>
                  ) : null}
                  {visit.attachments.length ? (
                    <p className="muted">
                      <b>Anexos:</b>{" "}
                      {visit.attachments
                        .map((attachment) => attachment.fileName)
                        .join(", ")}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="muted">No hay visitas en el rango solicitado.</p>
            )}
            <h3>Vacunas</h3>
            {patient.vaccinations.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Vacuna</th>
                    <th>Aplicación</th>
                    <th>Próxima dosis</th>
                    <th>Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.vaccinations.map((record) => (
                    <tr key={record.id}>
                      <td>{record.vaccineName}</td>
                      <td>
                        {clinicalDate(record.appliedAt, data.clinic.timezone)}
                      </td>
                      <td>
                        {clinicalDate(record.nextDueAt, data.clinic.timezone)}
                      </td>
                      <td>{record.batchNumber || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">
                No hay vacunas en el rango solicitado.
              </p>
            )}
          </section>
        ))}
        <footer className="report-footer">
          <span>{data.clinic.name}</span>
          <span>Documento clínico confidencial</span>
        </footer>
      </article>
    </main>
  );
}
