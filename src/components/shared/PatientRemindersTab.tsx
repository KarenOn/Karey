"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarDays, ChevronRight, Syringe } from "lucide-react";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTablePagination from "@/components/shared/DataTablePagination";
import StatusBadge from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { apiListPetReminders, type PetReminder } from "@/lib/api/pet-reminders";

function reminderStatus(kind: PetReminder["kind"]) {
  if (kind === "vaccine-overdue") return { label: "Vencida", badge: "destructive" as const };
  if (kind === "vaccine-upcoming") return { label: "Próxima", badge: "info" as const };
  return { label: "Próximo control", badge: "warning" as const };
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

function relativeDateLabel(value: string) {
  const days = differenceInCalendarDays(startOfDay(new Date(value)), startOfDay(new Date()));
  if (days === 0) return "Hoy";
  if (days < 0) {
    const amount = Math.abs(days);
    return `Hace ${amount} ${amount === 1 ? "día" : "días"} de retraso`;
  }
  return `En ${days} ${days === 1 ? "día" : "días"}`;
}

export default function PatientRemindersTab({ petId }: { petId: number }) {
  const [items, setItems] = useState<PetReminder[]>([]);
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Request lifecycle state belongs to this query effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    apiListPetReminders(petId, { type, period, page, pageSize: 10 })
      .then((result) => { if (active) { setItems(result.data); setTotal(result.total); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "No se pudieron cargar los recordatorios"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, period, petId, type]);

  function changeType(value: string) { setType(value); setPage(0); }
  function changePeriod(value: string) { setPeriod(value); setPage(0); }

  return (
    <div className="app-panel-strong overflow-hidden">
      <div className="border-b border-border/70 p-5 sm:p-6">
        <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /><h2 className="app-heading text-2xl">Recordatorios</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">Próximos controles y dosis de vacunas según fechas clínicas registradas.</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Select value={type} onValueChange={changeType}><SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los tipos</SelectItem><SelectItem value="visit">Controles clínicos</SelectItem><SelectItem value="vaccine">Vacunas</SelectItem></SelectContent></Select>
          <Select value={period} onValueChange={changePeriod}><SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Período" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los períodos</SelectItem><SelectItem value="upcoming">Próximos</SelectItem><SelectItem value="overdue">Vacunas vencidas</SelectItem></SelectContent></Select>
        </div>
      </div>
      {error ? <div className="p-5 text-sm text-destructive">{error}</div> : loading ? <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <LoadingSkeleton key={item} className="h-44" />)}</div> : items.length === 0 ? <div className="p-12 text-center"><CalendarClock className="mx-auto mb-3 h-9 w-9 text-muted-foreground/45" /><p className="font-medium">No hay recordatorios</p><p className="mt-1 text-sm text-muted-foreground">Se mostrarán aquí cuando exista un próximo control o dosis dentro de la regla vigente.</p></div> : <>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{items.map((item) => { const status = reminderStatus(item.kind); return <article key={item.id} className="flex h-full min-h-[184px] flex-col rounded-lg border border-border/70 bg-background p-4 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="app-stat-icon h-10 w-10 shrink-0">{item.type === "vaccine" ? <Syringe className="h-5 w-5" aria-hidden="true" /> : <CalendarClock className="h-5 w-5" aria-hidden="true" />}</div><p className="pt-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{item.type === "vaccine" ? "Vacuna" : "Visita clínica"}</p></div><StatusBadge status={status.badge} label={status.label} /></div><p className="mt-4 line-clamp-2 min-h-10 font-semibold leading-5 text-foreground">{item.description}</p><div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><div><p>{dateLabel(item.dueDate)}</p><p className="text-xs text-muted-foreground/80">{relativeDateLabel(item.dueDate)}</p></div></div><Link className="mt-auto inline-flex w-fit items-center gap-1 pt-4 text-sm font-semibold text-primary transition-colors hover:text-primary/75 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href={item.sourceHref}>Ver origen <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></article>; })}</div>
        <DataTablePagination page={page} pageSize={10} total={total} onPageChange={setPage} />
      </>}
    </div>
  );
}
