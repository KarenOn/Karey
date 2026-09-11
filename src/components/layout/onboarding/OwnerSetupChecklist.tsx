"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ChecklistState = {
  clinic: boolean;
  schedule: boolean;
  services: boolean;
  team: boolean;
  appointment: boolean;
};

const items = [
  { key: "clinic", label: "Completar información de la clínica", href: "/clinic-profile" },
  { key: "schedule", label: "Configurar horarios", href: "/clinic-profile?tab=schedule" },
  { key: "services", label: "Agregar servicios", href: "/services" },
  { key: "team", label: "Invitar al equipo", href: "/employees" },
  { key: "appointment", label: "Crear la primera cita", href: "/appointments" },
] as const;

export default function OwnerSetupChecklist({ state }: { state: ChecklistState }) {
  const [minimized, setMinimized] = useState(false);
  const [ready, setReady] = useState(false);
  const completed = items.filter((item) => state[item.key]).length;

  useEffect(() => {
    // Read browser-only preference after hydration to avoid server/client markup drift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinimized(window.localStorage.getItem("karey-owner-checklist-minimized") === "true");
    setReady(true);
  }, []);

  function toggle() {
    const next = !minimized;
    setMinimized(next);
    window.localStorage.setItem("karey-owner-checklist-minimized", String(next));
  }

  if (!ready || completed === items.length) return null;

  return (
    <Card className="app-panel-strong overflow-hidden shadow-none">
      <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Primeros pasos</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Deja tu clínica lista para operar</h2>
          <p className="mt-1 text-sm text-muted-foreground">{completed} de {items.length} pasos completados.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={minimized ? "Expandir checklist" : "Minimizar checklist"}>
          {minimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      {!minimized ? (
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {items.map((item) => {
            const done = state[item.key];
            return (
              <Link key={item.key} href={item.href} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3 text-sm transition-colors hover:bg-muted/40">
                {done ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={done ? "text-muted-foreground line-through" : "font-medium text-foreground"}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
