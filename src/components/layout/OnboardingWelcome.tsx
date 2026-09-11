"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock3, Package, Settings2, Users } from "lucide-react";
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
  const ownerReady = user.isClinicOwner && Boolean(user.clinicId);
  const [open, setOpen] = useState(Boolean(!user.welcomeSeenAt && (ownerReady || employeeReady)));
  const ownerSteps = [
    { label: "Completa tu clínica", description: "Identidad y datos operativos.", icon: Settings2, href: "/clinic-profile" },
    { label: "Configura horarios", description: "Define cuándo atenderás.", icon: Clock3, href: "/clinic-profile?tab=schedule" },
    user.access.actions.services.read || user.access.actions.inventory.read ? { label: "Prepara servicios e inventario", description: "Deja lista tu operación diaria.", icon: Package, href: "/services" } : null,
    user.access.actions.employees.read ? { label: "Invita a tu equipo", description: "Organiza roles y permisos.", icon: Users, href: "/employees" } : null,
    user.access.actions.appointments.read ? { label: "Comienza con Agenda", description: "Crea tu primera cita.", icon: Calendar, href: "/appointments" } : null,
  ].filter(Boolean).slice(0, 5) as Array<{ label: string; description: string; icon: typeof Calendar; href: string }>;
  const employeeAreas = [
    user.access.actions.today.read ? { label: "Hoy", description: "Tu centro operativo para la jornada.", icon: Calendar, href: "/today" } : null,
    user.access.actions.clients.read ? { label: "Clientes", description: "Consulta propietarios y sus datos.", icon: Users, href: "/clients" } : null,
    user.access.actions.appointments.read ? { label: "Agenda", description: "Consulta y gestiona citas.", icon: Calendar, href: "/appointments" } : null,
  ].filter(Boolean).slice(0, 5) as Array<{ label: string; description: string; icon: typeof Calendar; href: string }>;
  const canOnlySendToBilling = user.access.actions.invoices.sendToBilling && !user.access.actions.invoices.issue;
  async function close(startTour = false) {
    if (!open) return;
    await fetch("/api/profile/welcome", { method: "POST" }).catch(() => undefined);
    setOpen(false);
    if (startTour) onStartTour?.();
  }
  if (!open) return null;
  const steps = ownerReady ? ownerSteps : employeeAreas;
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) void close(); }}><DialogContent><DialogHeader><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><CheckCircle2 className="h-6 w-6" /></div><DialogTitle className="pt-3 text-center">¡Bienvenido a Karey Vet, {user.name}!</DialogTitle></DialogHeader>{ownerReady ? <><p className="text-center text-sm text-muted-foreground">Este es el espacio de tu clínica. Vamos a dejarlo listo para trabajar.</p><div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Clínica</p><p className="mt-1 text-sm font-semibold text-foreground">{user.clinicName ?? "Tu clínica"}</p></div><p className="text-sm font-semibold text-foreground">Estos son tus próximos pasos</p><div className="space-y-2">{steps.map((step) => <Link key={step.label} href={step.href} onClick={() => void close()} className="flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/40"><step.icon className="h-4 w-4 shrink-0 text-primary" /><span><span className="block text-sm font-semibold text-foreground">{step.label}</span><span className="block text-xs text-muted-foreground">{step.description}</span></span></Link>)}</div></> : <><p className="text-center text-sm text-muted-foreground">Tu cuenta ya está lista. Estas son las áreas disponibles para ti.</p>{steps.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{steps.map((area) => <div key={area.label} className="flex items-start gap-3 rounded-lg border border-border/70 p-3"><area.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-sm font-semibold text-foreground">{area.label}</p><p className="text-xs text-muted-foreground">{area.description}</p></div></div>)}</div> : null}{canOnlySendToBilling ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Puedes enviar atenciones a facturación, pero no emitir facturas.</p> : null}</>}<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => void close(true)}>Ver recorrido rápido</Button>{ownerReady ? <><Button variant="ghost" onClick={() => void close()}>Explorar Karey</Button><Button asChild><Link href="/clinic-profile" onClick={() => void close()}>Configurar mi clínica</Link></Button></> : <Button onClick={() => void close()}>Comenzar</Button>}</DialogFooter></DialogContent></Dialog>;
}
