"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { VaccinationRecordCreateSchema } from "@/lib/validators/vaccination";

type VaccinationValues = { vaccineId: string; vaccineName: string; appliedAt: string; nextDueAt: string; batchNumber: string; notes: string };
type VaccinationFormProps = { petId: number; vaccines: Array<{ id: number; name: string; species?: string | null }>; onSaved: () => void | Promise<void>; onCancel?: () => void };
const initialValues: VaccinationValues = { vaccineId: "", vaccineName: "", appliedAt: new Date().toISOString().slice(0, 10), nextDueAt: "", batchNumber: "", notes: "" };

export default function VaccinationForm({ petId, vaccines, onSaved, onCancel }: VaccinationFormProps) {
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = (event: FormFieldChangeEvent) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const selected = vaccines.find((vaccine) => String(vaccine.id) === values.vaccineId);
    const parsed = VaccinationRecordCreateSchema.safeParse({ ...values, vaccineId: values.vaccineId ? Number(values.vaccineId) : undefined, vaccineName: selected?.name || values.vaccineName, appliedAt: values.appliedAt ? new Date(values.appliedAt) : undefined, nextDueAt: values.nextDueAt ? new Date(values.nextDueAt) : undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisa los datos de la vacuna."); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/pets/${petId}/vaccinations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(data?.message ?? "No se pudo guardar la vacuna.");
      await onSaved();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la vacuna."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2"><FormField label="Vacuna" name="vaccineId" type="select" value={values.vaccineId} options={vaccines.map((vaccine) => ({ value: String(vaccine.id), label: vaccine.species ? `${vaccine.name} (${vaccine.species})` : vaccine.name }))} onChange={change} required /><FormField label="Fecha de aplicación" name="appliedAt" type="date" value={values.appliedAt} onChange={change} required /><FormField label="Próxima dosis" name="nextDueAt" type="date" value={values.nextDueAt} onChange={change} /><FormField label="Número de lote" name="batchNumber" value={values.batchNumber} onChange={change} /><FormField label="Notas" name="notes" type="textarea" value={values.notes} onChange={change} className="sm:col-span-2" />{error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}<div className="flex justify-end gap-3 sm:col-span-2">{onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button> : null}<Button disabled={saving}>{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}{saving ? "Guardando..." : "Guardar vacuna"}</Button></div></form>;
}
