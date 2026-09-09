"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, FileText, PawPrint, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CurrentUserProfile } from "@/lib/current-user-profile";

export default function OnboardingWelcome({ user, onStartTour }: { user: CurrentUserProfile; onStartTour?: () => void }) {
  const employeeReady = Boolean(
    user.roleKey &&
      user.roleKey !== "owner" &&
      user.clinicId &&
      user.onboardingCompletedAt &&
      user.emailVerified &&
      !user.mustChangePassword
  );
  const ownerReady = user.roleKey === "owner" && Boolean(user.clinicId);
  const [open, setOpen] = useState(Boolean(!user.welcomeSeenAt && (ownerReady || employeeReady)));
  const areas = [
    user.access.actions.today.read ? { label: "Hoy", description: "Tu centro operativo para la jornada.", icon: Calendar } : null,
    user.access.actions.clients.read ? { label: "Clientes", description: "Consulta propietarios y sus datos.", icon: Users } : null,
    user.access.actions.pets.read ? { label: "Pacientes", description: "Accede a pacientes e historial clínico.", icon: PawPrint } : null,
    user.access.actions.appointments.read ? { label: "Agenda", description: "Consulta y gestiona citas.", icon: Calendar } : null,
    user.access.actions.invoices.viewDrafts ? { label: "Facturación", description: user.access.actions.invoices.issue ? "Revisa y emite facturas." : "Revisa facturas pendientes." , icon: FileText } : null,
  ].filter(Boolean).slice(0, 5) as Array<{ label: string; description: string; icon: typeof Calendar }>;
  const canOnlySendToBilling = user.access.actions.invoices.sendToBilling && !user.access.actions.invoices.issue;
  async function close(startTour = false) {
    if (!open) return;
    await fetch("/api/profile/welcome", { method: "POST" }).catch(() => undefined);
    setOpen(false);
    if (startTour) onStartTour?.();
  }
  if (!open) return null;
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) void close(); }}><DialogContent><DialogHeader><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><CheckCircle2 className="h-6 w-6" /></div><DialogTitle className="pt-3 text-center">¡Bienvenido a Karey Vet, {user.name}!</DialogTitle></DialogHeader><p className="text-center text-sm text-muted-foreground">Tu cuenta ya está lista. Estas son las áreas disponibles para ti.</p>{areas.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{areas.map((area) => <div key={area.label} className="flex items-start gap-3 rounded-lg border border-border/70 p-3"><area.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-sm font-semibold text-foreground">{area.label}</p><p className="text-xs text-muted-foreground">{area.description}</p></div></div>)}</div> : null}{canOnlySendToBilling ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Puedes enviar atenciones a facturación, pero no emitir facturas.</p> : null}<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => void close(true)}>Ver recorrido rápido</Button><Button onClick={() => void close()}>Comenzar</Button></DialogFooter></DialogContent></Dialog>;
}
