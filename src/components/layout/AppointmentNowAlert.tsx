"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APPOINTMENT_GRACE_PERIOD_MS, formatAppointmentCountdown, getAppointmentGraceDeadline } from "@/lib/appointment-time";
import { isAppointmentEligibleForNowAlert } from "@/lib/appointment-helpers";
import ModalDelete from "@/components/shared/ModalDelete";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import EncounterWorkflow from "@/components/shared/EncounterWorkflow";
import SearchableSelect, { type SearchableSelectOption } from "@/components/shared/SearchableSelect";
import { useCurrentUserAccess, useCurrentUserProfile } from "@/components/layout/current-user-context";

type AppointmentNow = {
  id: number;
  petId: number;
  startAt: string;
  endAt?: string | null;
  status: string;
  type: string;
  pet: { name: string; species: string };
  client: { id: number; fullName: string };
  vet: { id: string; name: string; email?: string } | null;
};

function isEligible(appointment: AppointmentNow, now: number) {
  // Only show alert for pre-attention statuses
  if (!isAppointmentEligibleForNowAlert(appointment.status)) {
    return false;
  }
  
  const start = new Date(appointment.startAt).getTime();
  return start <= now && now < getAppointmentGraceDeadline(new Date(appointment.startAt)).getTime();
}

export default function AppointmentNowAlert() {
  const router = useRouter();
  const profile = useCurrentUserProfile();
  const access = useCurrentUserAccess();
  const [appointments, setAppointments] = useState<AppointmentNow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [encounter, setEncounter] = useState<AppointmentNow | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [frozenRemaining, setFrozenRemaining] = useState<Map<number, number>>(new Map());
  const [reconciledIds, setReconciledIds] = useState<Set<number>>(new Set());
  const [assignmentVets, setAssignmentVets] = useState<SearchableSelectOption[]>([]);
  const [assigning, setAssigning] = useState(false);
  const reconcilingId = useRef<number | null>(null);
  const knownStatuses = useRef<Map<number, string>>(new Map());
  const noShowToasts = useRef<Set<number>>(new Set());
  function invalidateAppointmentSurfaces() {
    window.dispatchEvent(new Event("karey:appointments-invalidated"));
  }

  async function load() {
    const response = await fetch("/api/appointments?surface=now-alert", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as AppointmentNow[];
    const newlyReconciled = data.filter((appointment) =>
      appointment.status === "NO_SHOW" && knownStatuses.current.get(appointment.id) !== undefined &&
      knownStatuses.current.get(appointment.id) !== "NO_SHOW" && !noShowToasts.current.has(appointment.id)
    );
    for (const appointment of newlyReconciled) {
      noShowToasts.current.add(appointment.id);
      toast.info(`La cita de ${appointment.pet.name} se estableció como No asistió.`);
    }
    if (newlyReconciled.length) invalidateAppointmentSurfaces();
    knownStatuses.current = new Map(data.map((appointment) => [appointment.id, appointment.status]));
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
  useEffect(() => {
    if (selectedId && queue.some((appointment) => appointment.id === selectedId)) return;
    setSelectedId(queue[0]?.id ?? null);
  }, [queue, selectedId]);

  const current = queue.find((appointment) => appointment.id === selectedId) ?? queue[0];
  const currentProcessing = current ? processingIds.has(current.id) : false;
  const canReceiveUnassignedAlerts = Boolean(access?.actions.appointments.receiveUnassignedNowAlerts);
  const canAssignAppointments = Boolean(access?.actions.appointments.assign);
  const canAssignSelf = Boolean(current && !current.vet && profile?.roleKey === "vet" && canReceiveUnassignedAlerts);

  useEffect(() => {
    if (!current || current.vet || !canAssignAppointments) {
      setAssignmentVets([]);
      return;
    }
    void fetch(`/api/appointments/${current.id}/assign`, { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json() as { vets: Array<{ id: string; name: string; email: string }> }).vets : [])
      .then((vets) => setAssignmentVets(vets.map((vet) => ({ value: vet.id, label: vet.name, keywords: [vet.email] }))))
      .catch(() => setAssignmentVets([]));
  }, [canAssignAppointments, current?.id, current?.vet]);

  async function assignVeterinarian(vetId: string) {
    if (!current || assigning) return;
    setAssigning(true);
    try {
      const response = await fetch(`/api/appointments/${current.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vetId }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; vet?: { id: string; name: string; email: string } } | null;
      if (!response.ok) throw new Error(payload?.error ?? "No se pudo asignar la cita.");
      setAppointments((items) => items.map((item) => item.id === current.id ? { ...item, vet: payload?.vet ?? { id: vetId, name: "Veterinario", email: "" } } : item));
      setAssignmentVets([]);
      invalidateAppointmentSurfaces();
      toast.success("Cita asignada correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo asignar la cita.");
      void load().catch(() => undefined);
    } finally {
      setAssigning(false);
    }
  }
  const remaining = current
    ? currentProcessing
      ? frozenRemaining.get(current.id) ?? 0
      : Math.max(0, getAppointmentGraceDeadline(new Date(current.startAt)).getTime() - now)
    : 0;
  const countdown = formatAppointmentCountdown(remaining);
  const progress = Math.max(0, Math.min(1, remaining / APPOINTMENT_GRACE_PERIOD_MS));

  useEffect(() => {
    const expired = appointments.filter((appointment) => {
      const deadline = getAppointmentGraceDeadline(new Date(appointment.startAt)).getTime();
      return isAppointmentEligibleForNowAlert(appointment.status) && new Date(appointment.startAt).getTime() <= now && deadline <= now && !reconciledIds.has(appointment.id);
    });
    if (!expired.length || reconcilingId.current !== null) return;
    const appointment = expired[0];
    reconcilingId.current = appointment.id;
    setReconciledIds((ids) => new Set(ids).add(appointment.id));
    void (async () => {
      const response = await fetch(`/api/appointments/${appointment.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "NO_SHOW" }) });
      if (response.ok) {
        noShowToasts.current.add(appointment.id);
        toast.info(`La cita de ${appointment.pet.name} se estableció como No asistió.`);
      }
      if (response.ok) {
        setAppointments((items) => items.filter((item) => item.id !== appointment.id));
        invalidateAppointmentSurfaces();
      }
    })().catch(() => undefined).finally(() => { reconcilingId.current = null; });
  }, [appointments, now, reconciledIds]);

  if (!current) return null;

  async function attend() {
    if (busy || !current) return;
    freeze(current.id);
    setBusy(true);
    try {
      const response = await fetch(`/api/appointments/${current.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (!response.ok) throw new Error();
      setAppointments((items) => items.filter((item) => item.id !== current.id));
      clearProcessing(current.id);
      setEncounter(current);
      invalidateAppointmentSurfaces();
      toast.success("Cita puesta en atención.");
    } catch {
      clearProcessing(current.id);
      toast.error("No se pudo poner la cita en atención.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy || !current) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/appointments/${current.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELLED" }) });
      if (!response.ok) throw new Error();
      setAppointments((items) => items.filter((item) => item.id !== current.id));
      invalidateAppointmentSurfaces();
      clearProcessing(current.id);
      setCancelOpen(false);
      toast.success("Cita cancelada correctamente.");
    } catch { clearProcessing(current.id); toast.error("No se pudo cancelar la cita."); }
    finally { setBusy(false); }
  }

  async function reschedule() {
    if (busy || !current || !rescheduleDate || !rescheduleTime) return;
    setBusy(true);
    try {
      const startAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const endAt = new Date(`${rescheduleDate}T${rescheduleEndTime}:00`);
      if (!(endAt > startAt)) throw new Error("La hora final debe ser posterior a la hora inicial.");
      const response = await fetch(`/api/appointments/${current.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), status: "SCHEDULED" }) });
      if (!response.ok) throw new Error();
      setAppointments((items) => items.filter((item) => item.id !== current.id));
      invalidateAppointmentSurfaces();
      clearProcessing(current.id);
      setRescheduleOpen(false);
      toast.success("Cita reprogramada correctamente.");
    } catch { clearProcessing(current.id); toast.error("No se pudo reprogramar la cita."); }
    finally { setBusy(false); }
  }

  function freeze(id: number) {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) return;
    const deadline = getAppointmentGraceDeadline(new Date(appointment.startAt)).getTime();
    setFrozenRemaining((values) => new Map(values).set(id, Math.max(0, deadline - Date.now())));
    setProcessingIds((values) => new Set(values).add(id));
  }

  function clearProcessing(id: number) {
    setProcessingIds((values) => {
      const next = new Set(values);
      next.delete(id);
      return next;
    });
    setFrozenRemaining((values) => {
      const next = new Map(values);
      next.delete(id);
      return next;
    });
  }

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <>
      <aside className="fixed right-4 top-20 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-primary/25 bg-card p-4 shadow-[0_0_0_1px_rgba(13,148,136,0.08),0_12px_36px_rgba(13,148,136,0.22)] motion-safe:animate-[appointment-glow_2s_ease-in-out_infinite]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              Tu cita es ahora
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {current.type} ·{" "}
              {new Date(current.startAt).toLocaleTimeString("es-DO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              - {new Date(current.endAt!).toLocaleTimeString("es-DO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {queue.length > 1 ? `1 de ${queue.length}` : ""}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            className="relative h-24 w-24 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:bg-accent disabled:cursor-wait"
            onClick={() => void attend()}
            disabled={busy || currentProcessing}
            aria-label="Atender cita"
          >
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 80 80"
              aria-hidden="true"
            >
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/70"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                className="text-primary transition-[stroke-dashoffset] duration-500"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full text-xs font-semibold text-foreground">
              <span>
                {countdown.minutes}:{String(countdown.seconds).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-primary">Atender</span>
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {current.pet.name} - {current.pet.species}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {current.client.fullName}
            </p>
            {current.vet && (
              <p className="truncate text-sm text-muted-foreground">
                Veterinario: {current.vet.name}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {currentProcessing
                ? "Procesando acción..."
                : "Se establecerá como No asistió si no se atiende a tiempo."}
            </p>
            {!current.vet && canAssignSelf ? (
              <Button className="mt-3" size="sm" onClick={() => void assignVeterinarian(profile!.userId)} disabled={assigning}>
                {assigning ? "Asignando..." : "Asignarme esta cita"}
              </Button>
            ) : null}
            {!current.vet && canAssignAppointments ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Asignar veterinario</p>
                <SearchableSelect
                  value={undefined}
                  options={assignmentVets}
                  onValueChange={(value) => void assignVeterinarian(value)}
                  disabled={assigning}
                  placeholder="Seleccionar veterinario disponible"
                  searchPlaceholder="Buscar veterinario..."
                  emptyMessage="No hay veterinarios disponibles para este horario."
                />
              </div>
            ) : null}
          </div>
        </div>
        {queue.length > 1 ? (
          <div className="mt-4 space-y-1 border-t border-border pt-3">
            {queue
              .filter((appointment) => appointment.id !== current.id)
              .map((appointment) => {
                const appointmentRemaining = Math.max(
                  0,
                  getAppointmentGraceDeadline(
                    new Date(appointment.startAt),
                  ).getTime() - now,
                );
                return (
                  <button
                    type="button"
                    key={appointment.id}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs hover:bg-accent"
                    onClick={() => setSelectedId(appointment.id)}
                  >
                    <span className="truncate font-medium">
                      {appointment.pet.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {Math.ceil(appointmentRemaining / 1000 / 60)}:
                      {String(
                        Math.ceil(appointmentRemaining / 1000) % 60,
                      ).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
          </div>
        ) : null}
        <div className="mt-4 flex gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              freeze(current.id);
              setCancelOpen(true);
            }}
            disabled={busy || currentProcessing}
          >
            Cancelar cita
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              freeze(current.id);
              const date = new Date(current.startAt);
              const end = current.endAt
                ? new Date(current.endAt)
                : new Date(date.getTime() + 30 * 60 * 1000);
              setRescheduleDate(date.toISOString().slice(0, 10));
              setRescheduleTime(date.toTimeString().slice(0, 5));
              setRescheduleEndTime(end.toTimeString().slice(0, 5));
              setRescheduleOpen(true);
            }}
            disabled={busy || currentProcessing}
          >
            Reprogramar
          </Button>
        </div>
        <button
          type="button"
          className={cn(
            "absolute right-2 top-2 text-muted-foreground hover:text-foreground",
          )}
          aria-label="Cerrar aviso temporalmente"
          onClick={() =>
            setAppointments((items) =>
              items.filter((item) => item.id !== current.id),
            )
          }
        >
          <X className="h-4 w-4" />
        </button>
      </aside>
      <ModalDelete
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open && current && !busy) clearProcessing(current.id);
        }}
        title="Cancelar cita"
        itemName={current.pet.name}
        description="¿Estás seguro de que deseas cancelar esta cita?"
        dangerText="Cancelar cita"
        loading={busy}
        onConfirm={cancel}
      />
      <Dialog
        open={rescheduleOpen}
        onOpenChange={(open) => {
          setRescheduleOpen(open);
          if (!open && current && !busy) clearProcessing(current.id);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar cita</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="alert-reschedule-date">Nueva fecha</Label>
              <Input
                id="alert-reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-reschedule-time">Hora inicial</Label>
              <Input
                id="alert-reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-reschedule-end-time">Hora final</Label>
              <Input
                id="alert-reschedule-end-time"
                type="time"
                value={rescheduleEndTime}
                onChange={(event) => setRescheduleEndTime(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void reschedule()}
              disabled={
                busy || !rescheduleDate || !rescheduleTime || !rescheduleEndTime
              }
            >
              {busy ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!encounter}
        onOpenChange={(open) => {
          if (!open) setEncounter(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atención clínica</DialogTitle>
          </DialogHeader>
          {encounter ? (
            <EncounterWorkflow
              petId={encounter.petId}
              clientId={Number(encounter.client.id)}
              appointmentId={encounter.id}
              onFinish={async () => {
                await fetch(`/api/appointments/${encounter.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "COMPLETED" }),
                });
                setEncounter(null);
              }}
              onBilling={() =>
                router.push(
                  `/invoices/new?clientId=${encounter.client.id}&petId=${encounter.petId}&appointmentId=${encounter.id}`,
                )
              }
              onViewInvoice={(invoiceId) =>
                router.push(`/invoices/${invoiceId}`)
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
