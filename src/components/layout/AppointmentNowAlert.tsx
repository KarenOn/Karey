"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APPOINTMENT_GRACE_PERIOD_MS, getAppointmentGraceDeadline } from "@/lib/appointment-time";
import ModalDelete from "@/components/shared/ModalDelete";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import EncounterWorkflow from "@/components/shared/EncounterWorkflow";

type AppointmentNow = {
  id: number;
  petId: number;
  startAt: string;
  status: "SCHEDULED" | "CONFIRMED";
  type: string;
  pet: { name: string };
  client: { id: number; fullName: string };
};

function isEligible(appointment: AppointmentNow, now: number) {
  const start = new Date(appointment.startAt).getTime();
  return start <= now && now < getAppointmentGraceDeadline(new Date(appointment.startAt)).getTime();
}

export default function AppointmentNowAlert() {
  const [appointments, setAppointments] = useState<AppointmentNow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [encounter, setEncounter] = useState<AppointmentNow | null>(null);
  const reconcilingId = useRef<number | null>(null);

  async function load() {
    const response = await fetch("/api/appointments", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as AppointmentNow[];
    setAppointments(data);
  }

  useEffect(() => {
    void load().catch(() => undefined);
    const poll = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const queue = useMemo(
    () => appointments.filter((appointment) => isEligible(appointment, now)).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [appointments, now]
  );
  const current = queue[0];
  const remaining = current ? Math.max(0, getAppointmentGraceDeadline(new Date(current.startAt)).getTime() - now) : 0;
  const seconds = Math.ceil(remaining / 1000);
  const progress = Math.max(0, Math.min(1, remaining / APPOINTMENT_GRACE_PERIOD_MS));

  useEffect(() => {
    if (!current || remaining > 0 || reconcilingId.current === current.id) return;
    reconcilingId.current = current.id;
    void (async () => {
      const response = await fetch(`/api/appointments/${current.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "NO_SHOW" }) });
      if (response.ok) toast.info("La cita se estableció como No asistió.");
      setAppointments((items) => items.filter((item) => item.id !== current.id));
    })().catch(() => undefined).finally(() => { reconcilingId.current = null; });
  }, [current, remaining]);

  if (!current) return null;

  async function attend() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/appointments/${current.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (!response.ok) return;
      setAppointments((items) => items.filter((item) => item.id !== current.id));
      setEncounter(current);
      toast.success("Cita puesta en atención.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/appointments/${current.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELLED" }) });
      if (!response.ok) throw new Error();
      setAppointments((items) => items.filter((item) => item.id !== current.id));
      setCancelOpen(false);
      toast.success("Cita cancelada correctamente.");
    } catch { toast.error("No se pudo cancelar la cita."); }
    finally { setBusy(false); }
  }

  async function reschedule() {
    if (busy || !rescheduleDate || !rescheduleTime) return;
    setBusy(true);
    try {
      const startAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const response = await fetch(`/api/appointments/${current.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startAt: startAt.toISOString(), status: "SCHEDULED" }) });
      if (!response.ok) throw new Error();
      setAppointments((items) => items.filter((item) => item.id !== current.id));
      setRescheduleOpen(false);
      toast.success("Cita reprogramada correctamente.");
    } catch { toast.error("No se pudo reprogramar la cita."); }
    finally { setBusy(false); }
  }

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <>
    <aside className="fixed right-4 top-20 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-primary/25 bg-card p-4 shadow-[0_0_0_1px_rgba(13,148,136,0.08),0_12px_36px_rgba(13,148,136,0.22)] motion-safe:animate-[appointment-glow_2s_ease-in-out_infinite]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarClock className="h-4 w-4 text-primary" />Tu cita es ahora</p>
          <p className="mt-1 text-xs text-muted-foreground">{current.type} · {new Date(current.startAt).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <span className="text-xs text-muted-foreground">{queue.length > 1 ? `1 de ${queue.length}` : ""}</span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button type="button" className="relative h-24 w-24 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => void attend()} disabled={busy} aria-label="Atender cita">
          <svg className="h-full w-full overflow-visible" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/70" />
            <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-primary transition-[stroke-dashoffset] duration-500" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 40 40)" />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full text-xs font-semibold text-foreground"><span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span><span className="text-[10px] text-primary">Atender</span></span>
        </button>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{current.pet.name}</p>
          <p className="truncate text-sm text-muted-foreground">{current.client.fullName}</p>
          <p className="mt-2 text-xs text-muted-foreground">{busy ? "Actualizando cita..." : "Selecciona el círculo para iniciar la atención."}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-border pt-3"><Button variant="outline" size="sm" className="flex-1" onClick={() => setCancelOpen(true)} disabled={busy}>Cancelar cita</Button><Button variant="outline" size="sm" className="flex-1" onClick={() => { const date = new Date(current.startAt); setRescheduleDate(date.toISOString().slice(0, 10)); setRescheduleTime(date.toTimeString().slice(0, 5)); setRescheduleOpen(true); }} disabled={busy}>Reprogramar</Button></div>
      <button type="button" className={cn("absolute right-2 top-2 text-muted-foreground hover:text-foreground")} aria-label="Cerrar aviso temporalmente" onClick={() => setAppointments((items) => items.filter((item) => item.id !== current.id))}><X className="h-4 w-4" /></button>
    </aside>
    <ModalDelete open={cancelOpen} onOpenChange={setCancelOpen} title="Cancelar cita" itemName={current.pet.name} description="¿Estás seguro de que deseas cancelar esta cita?" dangerText="Cancelar cita" loading={busy} onConfirm={cancel} />
    <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}><DialogContent><DialogHeader><DialogTitle>Reprogramar cita</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="alert-reschedule-date">Nueva fecha</Label><Input id="alert-reschedule-date" type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="alert-reschedule-time">Nueva hora</Label><Input id="alert-reschedule-time" type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancelar</Button><Button onClick={() => void reschedule()} disabled={busy || !rescheduleDate || !rescheduleTime}>{busy ? "Guardando..." : "Guardar"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!encounter} onOpenChange={(open) => { if (!open) setEncounter(null); }}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Atención clínica</DialogTitle></DialogHeader>{encounter ? <EncounterWorkflow petId={encounter.petId} clientId={Number(encounter.client.id)} onFinish={async () => { await fetch(`/api/appointments/${encounter.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) }); setEncounter(null); toast.success("Cita marcada como atendida."); }} /> : null}</DialogContent></Dialog>
    </>
  );
}
