"use client";

import { Monitor, Printer, ReceiptText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type PrintFormat,
  type LocalPrintSettings,
} from "@/lib/printing/settings";
import { usePrintSettings } from "@/lib/printing/usePrintSettings";

const formatOptions: Array<{
  value: PrintFormat;
  label: string;
  hint: string;
}> = [
  { value: "80", label: "80 mm", hint: "Recomendado para impresora térmica POS." },
  { value: "58", label: "58 mm", hint: "Versión compacta para rollos estrechos." },
  { value: "A4", label: "A4", hint: "Útil cuando este equipo imprime en hoja normal." },
];

function updateLocalSettings(
  current: LocalPrintSettings,
  patch: Partial<LocalPrintSettings>
) {
  return {
    ...current,
    ...patch,
  };
}

export default function PrintSettingsCard() {
  const { hydrated, settings, updateSettings } = usePrintSettings();

  return (
    <section className="rounded-[1.5rem] border border-border bg-muted/20 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Printer className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            Impresión
          </h3>
          <p className="text-sm text-muted-foreground">
            Esta configuración se guarda en este dispositivo para no mezclar
            impresoras distintas entre recepción, caja o laptops.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        <div className="space-y-3">
          <Label className="font-semibold">Formato del recibo</Label>
          <div className="grid gap-3 md:grid-cols-3">
            {formatOptions.map((option) => {
              const active = settings.receiptFormat === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!hydrated}
                  onClick={() =>
                    updateSettings((current) =>
                      updateLocalSettings(current, {
                        receiptFormat: option.value,
                      })
                    )
                  }
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-primary bg-primary/8 text-foreground"
                      : "border-border bg-background hover:border-primary/40",
                    !hydrated && "cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{option.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {option.hint}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Si eliges `A4`, la impresión automática después de cobrar abrirá la
            factura en tamaño carta. El botón `Imprimir recibo` seguirá usando
            el formato térmico.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="font-semibold">
                Abrir impresión automáticamente después de registrar el pago
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo abre el diálogo de impresión cuando el pago ya quedó
                guardado correctamente.
              </p>
            </div>
            <Switch
              checked={settings.autoOpenReceiptAfterPayment}
              disabled={!hydrated}
              onCheckedChange={(checked) =>
                updateSettings((current) =>
                  updateLocalSettings(current, {
                    autoOpenReceiptAfterPayment: checked,
                  })
                )
              }
            />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Monitor className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Karey Vet no guarda aquí el nombre físico de la impresora porque el
            navegador no puede seleccionarla automáticamente con `window.print()`.
            La elección de impresora sigue ocurriendo en Chrome o Edge.
          </p>
        </div>
      </div>
    </section>
  );
}
