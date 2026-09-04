"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { ClinicalVisitCreateSchema } from "@/lib/validators/visits";

type VisitValues = {
  visitAt: string;
  vetId: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  weightKg: string | number;
  temperatureC: string | number;
};

type ClinicalVisitFormProps = {
  petId: number;
  vets: Array<{ id: string; name: string; email?: string }>;
  initialValues?: Partial<VisitValues>;
  onSaved: () => void | Promise<void>;
  onCancel?: () => void;
};

const emptyValues: VisitValues = { visitAt: new Date().toISOString().slice(0, 10), vetId: "", diagnosis: "", treatment: "", notes: "", weightKg: "", temperatureC: "" };

export default function ClinicalVisitForm({ petId, vets, initialValues, onSaved, onCancel }: ClinicalVisitFormProps) {
  const [values, setValues] = useState<VisitValues>({ ...emptyValues, ...initialValues });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = (event: FormFieldChangeEvent) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const parsed = ClinicalVisitCreateSchema.safeParse({ ...values, visitAt: values.visitAt ? new Date(values.visitAt) : undefined, weightKg: values.weightKg === "" ? undefined : Number(values.weightKg), temperatureC: values.temperatureC === "" ? undefined : Number(values.temperatureC) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisa los datos de la visita."); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/pets/${petId}/visits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(data?.message ?? "No se pudo guardar la visita.");
      await onSaved();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la visita."); }
    finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2"><FormField label="Fecha" name="visitAt" type="date" value={values.visitAt} onChange={change} required /><FormField label="Veterinario" name="vetId" type="select" value={values.vetId} options={vets.map((vet) => ({ value: vet.id, label: vet.name, keywords: vet.email ? [vet.email] : [] }))} onChange={change} placeholder="Selecciona el veterinario" required /><FormField label="Peso en visita (kg)" name="weightKg" type="number" value={values.weightKg} onChange={change} /><FormField label="Temperatura (°C)" name="temperatureC" type="number" value={values.temperatureC} onChange={change} /><FormField label="Diagnóstico" name="diagnosis" type="textarea" value={values.diagnosis} onChange={change} className="sm:col-span-2" /><FormField label="Tratamiento" name="treatment" type="textarea" value={values.treatment} onChange={change} className="sm:col-span-2" /><FormField label="Notas" name="notes" type="textarea" value={values.notes} onChange={change} className="sm:col-span-2" />{error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}<div className="flex justify-end gap-3 sm:col-span-2">{onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button> : null}<Button disabled={saving}>{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}{saving ? "Guardando..." : "Guardar visita"}</Button></div></form>;
}
