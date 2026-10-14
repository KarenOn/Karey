"use client";

import React from "react";
import PhoneInput from "@/components/shared/PhoneInput";
import SearchableSelect, { type SearchableSelectOption } from "@/components/shared/SearchableSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "textarea"
  | "date"
  | "time"
  | "select"
  | "switch";
type FieldValue = string | number | boolean | null | undefined;
type FormFieldPrimitiveValue = string | number | boolean;

export type FormFieldChangeEvent = {
  name: string;
  value: FormFieldPrimitiveValue;
  target: {
    name: string;
    value: FormFieldPrimitiveValue;
    type?: string;
    checked?: boolean;
  };
};

type FormFieldProps = {
  label?: string;
  name?: string;
  type?: FieldType;
  value?: FieldValue;
  onChange?: (event: FormFieldChangeEvent) => void;
  placeholder?: string;
  options?: Array<
    | { value: string | number; label: string }
    | SearchableSelectOption
  >;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  helperText?: string;
};

export default function FormField({
  label = "",
  name = "",
  type = "text",
  value,
  onChange,
  placeholder = "",
  options = [],
  required = false,
  disabled = false,
  className = "",
  error = "",
  searchPlaceholder,
  emptyMessage,
  helperText,
}: FormFieldProps) {
  const emitChange = (newValue: FormFieldPrimitiveValue, metadata?: { checked?: boolean; type?: string }) => {
    onChange?.({
      name,
      value: newValue,
      target: {
        name,
        value: newValue,
        checked: metadata?.checked,
        type: metadata?.type,
      },
    });
  };

  const normalizedOptions: SearchableSelectOption[] = options.map((option) => ({
    value: String(option.value),
    label: option.label,
    keywords: "keywords" in option ? option.keywords : undefined,
    disabled: "disabled" in option ? option.disabled : undefined,
  }));

  return (
    <div className={`min-w-0 space-y-2 ${className}`} data-field-name={name} data-invalid={error ? "true" : undefined}>
      {label ? (
        <Label htmlFor={name} className="text-sm font-semibold text-foreground" required={required}>
          {label}
        </Label>
      ) : null}

      {type === "textarea" ? (
        <Textarea
          id={name}
          name={name}
          value={typeof value === "boolean" ? "" : (value ?? "")}
          onChange={(event) =>
            emitChange(event.target.value, {
              type: event.target.type,
            })
          }
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn("bg-input", error && "border-destructive focus-visible:ring-destructive")}
        />
      ) : type === "select" ? (
        <SearchableSelect
          disabled={disabled}
          emptyMessage={emptyMessage}
          onValueChange={(nextValue) => emitChange(nextValue)}
          options={normalizedOptions}
          buttonClassName={cn("h-11 rounded-lg", error && "border-destructive focus-visible:ring-destructive")}
          placeholder={placeholder || "Seleccionar..."}
          searchPlaceholder={searchPlaceholder || `Buscar ${label.toLowerCase()}...`}
          value={value === undefined || value === null ? "" : String(value)}
        />
      ) : type === "switch" ? (
        <div className="flex items-center gap-2">
          <Switch
            id={name}
            checked={Boolean(value)}
            onCheckedChange={(checked) => emitChange(checked, { checked, type: "checkbox" })}
            disabled={disabled}
          />
          <Label htmlFor={name} className="text-sm text-muted-foreground">
            {placeholder}
          </Label>
        </div>
      ) : type === "tel" ? (
        <PhoneInput
          id={name}
          name={name}
          type="tel"
          value={typeof value === "boolean" ? "" : (value ?? "")}
          onChange={(event) =>
            emitChange(event.target.value, {
              checked: event.target.checked,
              type: event.target.type,
            })
          }
          disabled={disabled}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          value={typeof value === "boolean" ? "" : (value ?? "")}
          onChange={(event) =>
            emitChange(
              event.target.type === "checkbox" ? event.target.checked : event.target.value,
              {
                checked: event.target.checked,
                type: event.target.type,
              }
            )
          }
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn("bg-input", error && "border-destructive focus-visible:ring-destructive")}
        />
      )}

      {helperText && !error ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
      {error ? <p className="mt-1 text-sm font-medium text-red-500">{error}</p> : null}
    </div>
  );
}
