"use client";

import type { ClientFormValues } from "@/lib/validators/client";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";

type ClientFormProps = {
  values: ClientFormValues;
  errors?: Record<string, string>;
  onChange: (event: FormFieldChangeEvent) => void;
  lockName?: boolean;
};

export default function ClientForm({ values, errors = {}, onChange, lockName = false }: ClientFormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Nombre completo" name="fullName" value={values.fullName} onChange={onChange} required disabled={lockName} className="sm:col-span-2" error={errors.fullName} />
      <FormField label="Teléfono" name="phone" type="tel" value={values.phone} onChange={onChange} required error={errors.phone} />
      <FormField label="Email" name="email" type="email" value={values.email} onChange={onChange} error={errors.email} />
      <FormField label="Dirección" name="address" value={values.address} onChange={onChange} error={errors.address} />
      <FormField label="Notas" name="notes" type="textarea" value={values.notes} onChange={onChange} className="sm:col-span-2" error={errors.notes} />
    </div>
  );
}
