"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUserProfile } from "@/components/layout/current-user-context";

type TourStep = { id: string; title: string; description: string; icon: typeof Search };

export default function ProductTour({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const profile = useCurrentUserProfile();
  const access = profile?.access ?? null;
  const [index, setIndex] = useState(0);
  const steps = useMemo<TourStep[]>(() => {
    if (profile?.isClinicOwner) {
      return [
        { id: "module-clinicProfile", title: "Mi Clínica", description: "Configura identidad, horarios y datos operativos.", icon: CheckCircle2 },
        ...(access?.actions.services.read || access?.actions.inventory.read ? [{ id: "module-services", title: "Servicios e inventario", description: "Prepara lo que tu clínica ofrece y utiliza diariamente.", icon: CheckCircle2 }] : []),
        ...(access?.actions.employees.read ? [{ id: "module-employees", title: "Equipo", description: "Invita empleados y controla sus permisos.", icon: CheckCircle2 }] : []),
        ...(access?.actions.appointments.read || access?.actions.today.read ? [{ id: "module-operation", title: "Agenda y Hoy", description: "Organiza citas y la operación diaria.", icon: CheckCircle2 }] : []),
        { id: "quick-help", title: "Ayuda", description: "Puedes volver a consultar estas guías cuando lo necesites.", icon: CircleHelp },
      ].slice(0, 5);
    }
    const result: TourStep[] = [
      { id: "global-search", title: "Busca en toda la clínica", description: "Encuentra clientes, pacientes y secciones rápidamente desde la búsqueda global.", icon: Search },
    ];
    if (access?.actions.clients.create || access?.actions.appointments.create || access?.actions.invoices.create) {
      result.push({ id: "quick-create", title: "Crea desde Nuevo", description: "Usa Nuevo para iniciar una acción permitida para tu cuenta.", icon: CheckCircle2 });
    }
    result.push({ id: "quick-help", title: "Ayuda cuando la necesites", description: "El botón ? muestra los primeros pasos y ayuda relacionada con la sección actual.", icon: CircleHelp });
    const mainModule = access?.actions.appointments.read
      ? { id: "module-appointments", title: "Agenda", description: "Consulta citas y usa las acciones disponibles para tu permiso.", icon: CheckCircle2 }
      : access?.actions.pets.read
        ? { id: "module-pets", title: "Pacientes", description: "Consulta pacientes y continúa con las acciones clínicas autorizadas.", icon: CheckCircle2 }
        : access?.actions.clients.read
          ? { id: "module-clients", title: "Clientes", description: "Consulta la información de propietarios desde Clientes.", icon: CheckCircle2 }
          : null;
    if (mainModule) result.push(mainModule);
    return result.slice(0, 5);
  }, [access, profile?.isClinicOwner]);
  const step = steps[index] ?? steps[0];
  const Icon = step.icon;

  function close() {
    setIndex(0);
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}><DialogContent aria-describedby="mini-tour-description"><DialogHeader><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></div><DialogTitle className="pt-2 text-center">Recorrido rápido</DialogTitle><DialogDescription id="mini-tour-description" className="text-center">Paso {index + 1} de {steps.length}</DialogDescription></DialogHeader><div className="rounded-lg border border-border/70 bg-muted/25 p-5 text-center"><h3 className="font-semibold text-foreground">{step.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p></div><div className="flex justify-center gap-1.5" aria-label="Progreso del recorrido">{steps.map((item, itemIndex) => <span key={item.id} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />)}</div><DialogFooter className="flex-row justify-between sm:justify-between"><Button variant="ghost" onClick={close}>Saltar</Button><div className="flex gap-2">{index > 0 ? <Button variant="outline" onClick={() => setIndex((current) => current - 1)}><ArrowLeft className="mr-2 h-4 w-4" />Atrás</Button> : null}<Button onClick={() => index === steps.length - 1 ? close() : setIndex((current) => current + 1)}>{index === steps.length - 1 ? "Comenzar" : "Siguiente"}{index < steps.length - 1 ? <ArrowRight className="ml-2 h-4 w-4" /> : null}</Button></div></DialogFooter></DialogContent></Dialog>;
}
