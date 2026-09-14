import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  clinicalDate,
  clinicalDateTime,
  clinicalRangeLabel,
  clinicalSex,
  clinicalSpecies,
} from "@/lib/clinical-report-formatters";
import type { ClinicalReportData } from "@/types/clinical-report";

const colors = { ink: "#172033", navy: "#2D3A66", teal: "#0D9488", muted: "#657084", border: "#DFE4EB", soft: "#F4F7F8" };

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.45, color: colors.ink },
  header: { borderBottomWidth: 3, borderBottomColor: colors.teal, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", gap: 16 },
  eyebrow: { color: colors.teal, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, marginBottom: 3 },
  clinicName: { color: colors.navy, fontSize: 18, fontFamily: "Helvetica-Bold" },
  clinicData: { color: colors.muted, fontSize: 8, textAlign: "right", maxWidth: 220 },
  logo: { width: 52, height: 52, objectFit: "contain", marginRight: 10 },
  title: { color: colors.navy, fontSize: 21, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 2 },
  range: { color: colors.muted, marginBottom: 14 },
  patient: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 12 },
  patientHeading: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  patientName: { color: colors.navy, fontSize: 16, fontFamily: "Helvetica-Bold" },
  patientMeta: { color: colors.muted, textAlign: "right" },
  species: { color: colors.teal, fontFamily: "Helvetica-Bold", fontSize: 10 },
  owner: { backgroundColor: colors.soft, borderLeftWidth: 3, borderLeftColor: colors.teal, padding: 8, marginTop: 10, marginBottom: 12 },
  sectionTitle: { color: colors.navy, fontSize: 11, fontFamily: "Helvetica-Bold", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4, marginTop: 13, marginBottom: 7 },
  visit: { borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 9, marginBottom: 7 },
  visitTop: { flexDirection: "row", justifyContent: "space-between", color: colors.navy },
  muted: { color: colors.muted },
  paragraph: { marginTop: 4 },
  table: { borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { backgroundColor: colors.soft },
  cell: { padding: 6, flex: 1 },
  headerCell: { color: colors.navy, fontFamily: "Helvetica-Bold", fontSize: 8 },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 18, paddingTop: 7, color: colors.muted, fontSize: 8, flexDirection: "row", justifyContent: "space-between" },
});

function clinicContactLines(data: ClinicalReportData["clinic"]) {
  return [data.address, data.phone, data.email, data.taxId ? `RNC/NIT: ${data.taxId}` : null].filter(Boolean) as string[];
}

export default function ClinicalReportPdfDocument({ data }: { data: ClinicalReportData }) {
  return (
    <Document title="Historial clínico" author={data.clinic.name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image has no alt prop. */}
            {data.clinic.logoUrl ? <Image src={data.clinic.logoUrl} style={styles.logo} /> : null}
            <View><Text style={styles.eyebrow}>Karey Vet · Informe clínico</Text><Text style={styles.clinicName}>{data.clinic.name}</Text></View>
          </View>
          <View>{clinicContactLines(data.clinic).map((line) => <Text key={line} style={styles.clinicData}>{line}</Text>)}</View>
        </View>
        <Text style={styles.title}>Historial clínico</Text>
        <Text style={styles.range}>Rango: {clinicalRangeLabel(data.range)} · Generado: {clinicalDateTime(new Date().toISOString(), data.clinic.timezone)}</Text>
        {data.patients.length ? data.patients.map((patient, index) => (
          <View key={patient.id} style={styles.patient} break={index > 0}>
            <View style={styles.patientHeading}>
              <View><Text style={styles.eyebrow}>Paciente</Text><Text style={styles.patientName}>{patient.name}</Text></View>
              <View style={styles.patientMeta}><Text style={styles.species}>{clinicalSpecies(patient.species)}</Text><Text>{patient.breed || "Sin raza"} · {clinicalSex(patient.sex)}{patient.age !== null ? ` · ${patient.age} año${patient.age === 1 ? "" : "s"}` : ""}</Text></View>
            </View>
            <Text style={styles.owner}>Propietario: {patient.client.fullName}{patient.client.phone ? ` · ${patient.client.phone}` : ""}{patient.client.email ? ` · ${patient.client.email}` : ""}</Text>
            <Text style={styles.sectionTitle}>Visitas clínicas</Text>
            {patient.visits.length ? patient.visits.map((visit) => (
              <View key={visit.id} style={styles.visit} wrap={false}>
                <View style={styles.visitTop}><Text style={{ fontFamily: "Helvetica-Bold" }}>{clinicalDateTime(visit.visitAt, data.clinic.timezone)}</Text><Text style={styles.muted}>Veterinario: {visit.vet?.name ?? "Veterinario no registrado"}</Text></View>
                {visit.weightKg !== null || visit.temperatureC !== null ? <Text style={[styles.paragraph, styles.muted]}>{visit.weightKg !== null ? `Peso: ${visit.weightKg} kg` : ""}{visit.weightKg !== null && visit.temperatureC !== null ? " · " : ""}{visit.temperatureC !== null ? `Temperatura: ${visit.temperatureC} °C` : ""}</Text> : null}
                {visit.diagnosis ? <Text style={styles.paragraph}>Diagnóstico: {visit.diagnosis}</Text> : null}
                {visit.treatment ? <Text style={styles.paragraph}>Tratamiento: {visit.treatment}</Text> : null}
                {visit.notes ? <Text style={styles.paragraph}>Notas: {visit.notes}</Text> : null}
                {visit.attachments.length ? <Text style={[styles.paragraph, styles.muted]}>Anexos: {visit.attachments.map((attachment) => `${attachment.fileName}${attachment.fileType ? ` (${attachment.fileType})` : ""}`).join(", ")}</Text> : null}
              </View>
            )) : <Text style={styles.muted}>No hay visitas en el rango solicitado.</Text>}
            <Text style={styles.sectionTitle}>Vacunas</Text>
            {patient.vaccinations.length ? <View style={styles.table} wrap={false}>
              <View style={[styles.row, styles.headerRow]}><Text style={[styles.cell, styles.headerCell]}>Vacuna</Text><Text style={[styles.cell, styles.headerCell]}>Aplicación</Text><Text style={[styles.cell, styles.headerCell]}>Próxima dosis</Text><Text style={[styles.cell, styles.headerCell]}>Lote</Text></View>
              {patient.vaccinations.map((record) => <View key={record.id} style={styles.row}><Text style={styles.cell}>{record.vaccineName}</Text><Text style={styles.cell}>{clinicalDate(record.appliedAt, data.clinic.timezone)}</Text><Text style={styles.cell}>{clinicalDate(record.nextDueAt, data.clinic.timezone)}</Text><Text style={styles.cell}>{record.batchNumber || "-"}</Text></View>)}
            </View> : <Text style={styles.muted}>No hay vacunas en el rango solicitado.</Text>}
            {patient.vaccinations.filter((record) => record.notes).map((record) => <Text key={`note-${record.id}`} style={[styles.paragraph, styles.muted]}>{record.vaccineName}: {record.notes}</Text>)}
          </View>
        )) : <Text style={styles.muted}>No se encontraron pacientes para generar el informe.</Text>}
        <View style={styles.footer} fixed><Text>{data.clinic.name}</Text><Text>Documento clínico confidencial</Text></View>
      </Page>
    </Document>
  );
}
