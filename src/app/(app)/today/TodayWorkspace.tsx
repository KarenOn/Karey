"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Plus,
  Receipt,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { AppAlert } from "@/components/shared/AppAlert";
import AppPageHero from "@/components/shared/AppPageHero";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NewTurnModal from "./NewTurnModal";
import EncounterWorkflow from "@/components/shared/EncounterWorkflow";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED";

type TodayTurnStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED";

type TodayTurnService =
  | "GROOMING"
  | "BATH"
  | "SURGERY"
  | "HOSPITALIZATION"
  | "OTHER";

export type TodayAppointmentItem = {
  id: number;
  clientId: number;
  clientName: string;
  invoiceId: number | null;
  petId: number;
  petName: string;
  startAt: string;
  status: AppointmentStatus;
  type: string;
  vetId: string | null;
};

export type TodayTurnItem = {
  arrivalAt: string;
  clientId: number | null;
  id: number;
  ownerName: string;
  ownerPhone: string | null;
  petId: number | null;
  petName: string;
  service: TodayTurnService;
  serviceName: string;
  status: TodayTurnStatus;
};

type UnifiedState = "waiting" | "in_progress" | "done";

type AlertState = {
  variant: "success" | "info" | "warning" | "destructive";
  title: string;
  description?: string;
};

type PatientCardItem = {
  clientId: number | null;
  detailHref: string | null;
  id: number;
  ownerLabel: string;
  petId: number | null;
  petName: string;
  primaryActionLabel: string | null;
  serviceLabel: string;
  source: "appointment" | "turn";
  state: UnifiedState;
  timeLabel: string | null;
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  AESTHETIC: "Estetica",
  BATH: "Bano",
  CHECKUP: "Chequeo",
  CONSULTATION: "Consulta",
  DEWORMING: "Desparasitacion",
  EMERGENCY: "Emergencia",
  GROOMING: "Peluqueria",
  HOSPITALIZATION: "Hospitalizacion",
  OTHER: "Otro",
  SURGERY: "Cirugia",
  VACCINATION: "Vacunacion",
};

const TURN_SERVICE_LABELS: Record<TodayTurnService, string> = {
  BATH: "Bano",
  GROOMING: "Peluqueria",
  HOSPITALIZATION: "Hospitalizacion",
  OTHER: "Otro",
  SURGERY: "Cirugia",
};

const STATE_LABELS: Record<UnifiedState, string> = {
  done: "Atendido",
  in_progress: "En atencion",
  waiting: "En espera",
};

const STATE_STYLES: Record<
  UnifiedState,
  { badge: string; border: string; button: string; dot: string }
> = {
  waiting: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    border: "border-l-amber-400",
    button: "bg-amber-500 text-white hover:bg-amber-600",
    dot: "bg-amber-500",
  },
  in_progress: {
    badge: "border-sky-200 bg-sky-50 text-sky-800",
    border: "border-l-sky-500",
    button: "bg-sky-600 text-white hover:bg-sky-700",
    dot: "bg-sky-500",
  },
  done: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    border: "border-l-emerald-500",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
    dot: "bg-emerald-500",
  },
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "No pudimos completar esta accion.");
  }

  return response.json();
}

function appointmentUnifiedState(status: AppointmentStatus): UnifiedState {
  if (status === "IN_PROGRESS") return "in_progress";
  if (status === "COMPLETED") return "done";
  return "waiting";
}

function turnUnifiedState(status: TodayTurnStatus): UnifiedState {
  if (status === "IN_PROGRESS") return "in_progress";
  if (status === "READY" || status === "DELIVERED") return "done";
  return "waiting";
}

function formatAppointmentType(value: string) {
  return APPOINTMENT_TYPE_LABELS[value] ?? value;
}

function formatTurnService(value: TodayTurnService) {
  return TURN_SERVICE_LABELS[value] ?? value;
}

function buildInvoiceUrl(input: {
  appointmentId?: number | null;
  clientId?: number | null;
  ownerName?: string | null;
  petId?: number | null;
  petName?: string | null;
  returnTo?: string;
  serviceName?: string | null;
  todayTurnId?: number | null;
}) {
  const params = new URLSearchParams();

  if (input.clientId) params.set("clientId", String(input.clientId));
  if (input.petId) params.set("petId", String(input.petId));
  if (input.appointmentId) params.set("appointmentId", String(input.appointmentId));
  if (input.todayTurnId) params.set("todayTurnId", String(input.todayTurnId));
  if (input.petName) params.set("petName", input.petName);
  if (input.ownerName) params.set("ownerName", input.ownerName);
  if (input.serviceName) params.set("serviceName", input.serviceName);
  if (input.returnTo) params.set("returnTo", input.returnTo);

  return `/invoices/new?${params.toString()}`;
}

function TodaySection({
  children,
  count,
  description,
  emptyMessage,
  icon: Icon,
  priority = false,
  title,
}: {
  children: React.ReactNode;
  count: number;
  description: string;
  emptyMessage: string;
  icon: React.ElementType;
  priority?: boolean;
  title: string;
}) {
  return (
    <section
      className={cn(
        "app-panel-strong overflow-hidden p-0",
        priority && "border-primary/20"
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="app-stat-icon mt-0.5 h-10 w-10">
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {count} {count === 1 ? "paciente" : "pacientes"}
        </Badge>
      </header>

      <div className="space-y-3 p-4 sm:p-5">
        {count === 0 ? <div className="app-empty">{emptyMessage}</div> : children}
      </div>
    </section>
  );
}

function PatientCard({
  busy,
  item,
  onCardClick,
  onPrimaryAction,
}: {
  busy: boolean;
  item: PatientCardItem;
  onCardClick: () => void;
  onPrimaryAction?: (() => void) | null;
}) {
  const stateUi = STATE_STYLES[item.state];
  const interactive = typeof onCardClick === "function";

  return (
    <article
      className={cn(
        "rounded-xl border border-border/70 border-l-4 bg-background px-4 py-4 transition",
        stateUi.border,
        interactive && "cursor-pointer hover:border-primary/30 hover:bg-muted/20"
      )}
      onClick={onCardClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCardClick();
        }
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {item.timeLabel ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                {item.timeLabel}
              </span>
            ) : null}
            <Badge className={cn("border", stateUi.badge)}>
              <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", stateUi.dot)} />
              {STATE_LABELS[item.state]}
            </Badge>
            <Badge variant="outline">
              {item.source === "appointment" ? "Cita" : "Sin cita"}
            </Badge>
          </div>

          <div>
            <p className="text-lg font-semibold leading-tight text-foreground">
              {item.petName}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4" />
              {item.ownerLabel}
            </p>
          </div>

          <Badge variant="secondary" className="w-fit">
            {item.serviceLabel}
          </Badge>
        </div>

        {item.primaryActionLabel && onPrimaryAction ? (
          <div className="lg:pl-4">
            <Button
              className={cn("h-10 rounded-lg px-4", stateUi.button)}
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                onPrimaryAction();
              }}
            >
              {busy ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ReceiptOrStethoscope actionLabel={item.primaryActionLabel} />
              )}
              {item.primaryActionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ReceiptOrStethoscope({ actionLabel }: { actionLabel: string }) {
  if (actionLabel === "Facturar" || actionLabel === "Ver factura") {
    return <Receipt className="mr-2 h-4 w-4" />;
  }

  return <Stethoscope className="mr-2 h-4 w-4" />;
}

export default function TodayWorkspace({
  initialAppointments,
  initialDateIso,
  initialTurns,
}: {
  initialAppointments: TodayAppointmentItem[];
  initialDateIso: string;
  initialTurns: TodayTurnItem[];
}) {
  const access = useCurrentUserAccess();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] =
    useState<TodayAppointmentItem[]>(initialAppointments);
  const [turns, setTurns] = useState<TodayTurnItem[]>(initialTurns);
  const [turnModalOpen, setTurnModalOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [encounter, setEncounter] = useState<{ appointmentId: number; petId: number; clientId: number } | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    variant: "info",
    title: "",
  });

  const canCreateTurns = !!access?.actions.todayTurns.create;
  const canUpdateTurns = !!access?.actions.todayTurns.update;
  const canUpdateAppointments = !!access?.actions.appointments.update;
  const canCreateInvoices = !!access?.actions.invoices.create;

  const showAlert = useCallback(
    (
      variant: AlertState["variant"],
      title: string,
      description?: string
    ) => {
      setAlert({ variant, title, description });
      setAlertOpen(true);
    },
    []
  );

  const showTurnModalError = useCallback(
    (title: string, description?: string) => {
      showAlert("destructive", title, description);
    },
    [showAlert]
  );

  useEffect(() => {
    const createdInvoiceId = searchParams.get("createdInvoiceId");
    if (!createdInvoiceId) return;

    showAlert(
      "success",
      "Factura creada",
      // `La factura ${createdInvoiceId} se registro y el paciente paso a Atendidos.`
      `La factura se registro y el paciente paso a Atendidos.`
    );
    router.replace(pathname);
  }, [pathname, router, searchParams, showAlert]);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) => appointmentUnifiedState(appointment.status) === "waiting"
        )
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [appointments]
  );

  const waitingTurns = useMemo(
    () =>
      turns
        .filter((turn) => turnUnifiedState(turn.status) === "waiting")
        .sort((left, right) => left.arrivalAt.localeCompare(right.arrivalAt)),
    [turns]
  );

  const appointmentCards = useMemo(
    () =>
      upcomingAppointments.map<PatientCardItem>((appointment) => ({
        clientId: appointment.clientId,
        detailHref: appointment.petId ? `/pets/${appointment.petId}` : null,
        id: appointment.id,
        ownerLabel: appointment.clientName,
        petId: appointment.petId,
        petName: appointment.petName,
        primaryActionLabel: canUpdateAppointments ? "Atender" : null,
        serviceLabel: formatAppointmentType(appointment.type),
        source: "appointment",
        state: "waiting",
        timeLabel: format(new Date(appointment.startAt), "HH:mm"),
      })),
    [canUpdateAppointments, upcomingAppointments]
  );

  const waitingTurnCards = useMemo(
    () =>
      waitingTurns.map<PatientCardItem>((turn) => ({
        clientId: turn.clientId,
        detailHref: turn.petId ? `/pets/${turn.petId}` : null,
        id: turn.id,
        ownerLabel: turn.ownerName,
        petId: turn.petId,
        petName: turn.petName,
        primaryActionLabel: canUpdateTurns ? "Atender" : null,
        serviceLabel: turn.serviceName || formatTurnService(turn.service),
        source: "turn",
        state: "waiting",
        timeLabel: format(new Date(turn.arrivalAt), "HH:mm"),
      })),
    [canUpdateTurns, waitingTurns]
  );

  const inProgressCards = useMemo(
    () =>
      [
        ...appointments
          .filter(
            (appointment) =>
              appointmentUnifiedState(appointment.status) === "in_progress"
          )
          .map<PatientCardItem>((appointment) => ({
            clientId: appointment.clientId,
            detailHref: appointment.petId ? `/pets/${appointment.petId}` : null,
            id: appointment.id,
            ownerLabel: appointment.clientName,
            petId: appointment.petId,
            petName: appointment.petName,
            primaryActionLabel: appointment.invoiceId
              ? "Ver factura"
              : canCreateInvoices
                ? "Facturar"
                : null,
            serviceLabel: formatAppointmentType(appointment.type),
            source: "appointment",
            state: "in_progress",
            timeLabel: format(new Date(appointment.startAt), "HH:mm"),
          })),
        ...turns
          .filter((turn) => turnUnifiedState(turn.status) === "in_progress")
          .map<PatientCardItem>((turn) => ({
            clientId: turn.clientId,
            detailHref: turn.petId ? `/pets/${turn.petId}` : null,
            id: turn.id,
            ownerLabel: turn.ownerName,
            petId: turn.petId,
            petName: turn.petName,
            primaryActionLabel: canCreateInvoices ? "Facturar" : null,
            serviceLabel: turn.serviceName || formatTurnService(turn.service),
            source: "turn",
            state: "in_progress",
            timeLabel: format(new Date(turn.arrivalAt), "HH:mm"),
          })),
      ].sort((left, right) =>
        (left.timeLabel ?? "").localeCompare(right.timeLabel ?? "")
      ),
    [appointments, canCreateInvoices, turns]
  );

  const doneCards = useMemo(
    () =>
      [
        ...appointments
          .filter((appointment) => appointmentUnifiedState(appointment.status) === "done")
          .map<PatientCardItem>((appointment) => ({
            clientId: appointment.clientId,
            detailHref: appointment.petId ? `/pets/${appointment.petId}` : null,
            id: appointment.id,
            ownerLabel: appointment.clientName,
            petId: appointment.petId,
            petName: appointment.petName,
            primaryActionLabel: null,
            serviceLabel: formatAppointmentType(appointment.type),
            source: "appointment",
            state: "done",
            timeLabel: format(new Date(appointment.startAt), "HH:mm"),
          })),
        ...turns
          .filter((turn) => turnUnifiedState(turn.status) === "done")
          .map<PatientCardItem>((turn) => ({
            clientId: turn.clientId,
            detailHref: turn.petId ? `/pets/${turn.petId}` : null,
            id: turn.id,
            ownerLabel: turn.ownerName,
            petId: turn.petId,
            petName: turn.petName,
            primaryActionLabel: null,
            serviceLabel: turn.serviceName || formatTurnService(turn.service),
            source: "turn",
            state: "done",
            timeLabel: format(new Date(turn.arrivalAt), "HH:mm"),
          })),
      ].sort((left, right) =>
        (right.timeLabel ?? "").localeCompare(left.timeLabel ?? "")
      ),
    [appointments, turns]
  );

  async function markAppointmentInProgress(appointment: TodayAppointmentItem) {
    if (!canUpdateAppointments) {
      showAlert("warning", "Sin permisos", "No tienes permiso para actualizar citas.");
      return;
    }

    const actionKey = `appointment-${appointment.id}`;
    setBusyKey(actionKey);

    try {
      await requestJson(`/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id ? { ...item, status: "IN_PROGRESS" } : item
        )
      );
      setEncounter({ appointmentId: appointment.id, petId: appointment.petId, clientId: appointment.clientId });
      showAlert("success", "Cita puesta en atención", "La cita está en progreso.");
    } catch (error) {
      showAlert(
        "destructive",
        "No se pudo iniciar la cita",
        getErrorMessage(error)
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function markTurnInProgress(turn: TodayTurnItem) {
    if (!canUpdateTurns) {
      showAlert(
        "warning",
        "Sin permisos",
        "No tienes permiso para actualizar atenciones sin cita."
      );
      return;
    }

    const actionKey = `turn-${turn.id}`;
    setBusyKey(actionKey);

    try {
      await requestJson(`/api/today-turns/${turn.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

      setTurns((current) =>
        current.map((item) =>
          item.id === turn.id ? { ...item, status: "IN_PROGRESS" } : item
        )
      );
    } catch (error) {
      showAlert(
        "destructive",
        "No se pudo iniciar la atencion",
        getErrorMessage(error)
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function finishEncounter() {
    if (!encounter) return;
    const target = appointments.find((appointment) => appointment.id === encounter.appointmentId && appointment.status === "IN_PROGRESS");
    if (target) {
      await requestJson(`/api/appointments/${target.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "COMPLETED" }) });
      setAppointments((current) => current.map((item) => item.id === target.id ? { ...item, status: "COMPLETED" } : item));
    }
    setEncounter(null);
  }

  function goToInvoiceFlow(input: {
    appointmentId?: number | null;
    clientId?: number | null;
    invoiceId?: number | null;
    ownerName?: string | null;
    petId?: number | null;
    petName?: string | null;
    serviceName?: string | null;
    todayTurnId?: number | null;
  }) {
    if (input.invoiceId) {
      router.push(`/invoices/${input.invoiceId}`);
      return;
    }

    if (!canCreateInvoices) {
      showAlert("warning", "Sin permisos", "No tienes permiso para crear facturas.");
      return;
    }

    router.push(
      buildInvoiceUrl({
        appointmentId: input.appointmentId,
        clientId: input.clientId,
        ownerName: input.ownerName,
        petId: input.petId,
        petName: input.petName,
        returnTo: "/today",
        serviceName: input.serviceName,
        todayTurnId: input.todayTurnId,
      })
    );
  }

  const date = useMemo(() => new Date(initialDateIso), [initialDateIso]);
  const weekday = capitalize(format(date, "EEEE", { locale: es }));
  const monthLabel = capitalize(format(date, "MMMM", { locale: es }));
  const dayNumber = format(date, "d");
  const totalTracked = appointments.length + turns.length;

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<Sparkles className="size-3.5" />}
        badgeLabel="Centro operativo"
        title={`Hoy · ${weekday} ${dayNumber}`}
        description={`Revisa la agenda, las llegadas sin cita y la atencion activa de ${monthLabel} desde una sola vista.`}
        actions={
          canCreateTurns ? (
            <Button className="gap-2" onClick={() => setTurnModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar paciente sin cita
            </Button>
          ) : null
        }
        stats={[
          {
            label: "Proximas citas",
            value: appointmentCards.length,
            hint: "Pendientes por atender",
          },
          {
            label: "Sin cita",
            value: waitingTurnCards.length,
            hint: "Pacientes en espera",
          },
          {
            label: "En atencion",
            value: inProgressCards.length,
            hint: "Casos activos",
          },
          {
            label: "Atendidos",
            value: doneCards.length,
            hint: `${totalTracked} movimientos registrados hoy`,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <TodaySection
          count={appointmentCards.length}
          description="Agenda confirmada para la jornada actual."
          emptyMessage="No hay citas pendientes para hoy."
          icon={CalendarClock}
          title="Proximas citas"
        >
          {appointmentCards.map((item) => (
            <PatientCard
              key={`appointment-${item.id}`}
              busy={busyKey === `appointment-${item.id}`}
              item={item}
              onCardClick={() => {
                const appointment = upcomingAppointments.find((entry) => entry.id === item.id);
                if (!appointment || !canUpdateAppointments) return;
                void markAppointmentInProgress(appointment);
              }}
              onPrimaryAction={
                canUpdateAppointments
                  ? () => {
                      const appointment = upcomingAppointments.find((entry) => entry.id === item.id);
                      if (!appointment) return;
                      void markAppointmentInProgress(appointment);
                    }
                  : null
              }
            />
          ))}
        </TodaySection>

        <TodaySection
          count={waitingTurnCards.length}
          description="Pacientes que llegaron sin una cita agendada."
          emptyMessage="No hay pacientes sin cita en espera en este momento."
          icon={ClipboardList}
          title="Sin cita en espera"
        >
          {waitingTurnCards.map((item) => (
            <PatientCard
              key={`turn-${item.id}`}
              busy={busyKey === `turn-${item.id}`}
              item={item}
              onCardClick={() => {
                const turn = waitingTurns.find((entry) => entry.id === item.id);
                if (!turn || !canUpdateTurns) return;
                void markTurnInProgress(turn);
              }}
              onPrimaryAction={
                canUpdateTurns
                  ? () => {
                      const turn = waitingTurns.find((entry) => entry.id === item.id);
                      if (!turn) return;
                      void markTurnInProgress(turn);
                    }
                  : null
              }
            />
          ))}
        </TodaySection>
      </div>

      <TodaySection
        count={inProgressCards.length}
        description="Pacientes que ya estan siendo atendidos o listos para facturar."
        emptyMessage="No hay pacientes en atencion ahora mismo."
        icon={Stethoscope}
        priority
        title="En atencion"
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {inProgressCards.map((item) => (
            <PatientCard
              key={`${item.source}-${item.id}-progress`}
              busy={busyKey === `${item.source}-${item.id}-progress`}
              item={item}
              onCardClick={() => {
                if (item.source === "appointment") {
                  const appointment = appointments.find((entry) => entry.id === item.id);
                  if (!appointment) return;
                  goToInvoiceFlow({
                    appointmentId: appointment.id,
                    clientId: appointment.clientId,
                    invoiceId: appointment.invoiceId,
                    petId: appointment.petId,
                    petName: appointment.petName,
                  });
                  return;
                }

                const turn = turns.find((entry) => entry.id === item.id);
                if (!turn) return;
                goToInvoiceFlow({
                  clientId: turn.clientId,
                  ownerName: turn.ownerName,
                  petId: turn.petId,
                  petName: turn.petName,
                  serviceName: turn.serviceName,
                  todayTurnId: turn.id,
                });
              }}
              onPrimaryAction={() => {
                if (item.source === "appointment") {
                  const appointment = appointments.find((entry) => entry.id === item.id);
                  if (!appointment) return;
                  goToInvoiceFlow({
                    appointmentId: appointment.id,
                    clientId: appointment.clientId,
                    invoiceId: appointment.invoiceId,
                    petId: appointment.petId,
                    petName: appointment.petName,
                  });
                  return;
                }

                const turn = turns.find((entry) => entry.id === item.id);
                if (!turn) return;
                goToInvoiceFlow({
                  clientId: turn.clientId,
                  ownerName: turn.ownerName,
                  petId: turn.petId,
                  petName: turn.petName,
                  serviceName: turn.serviceName,
                  todayTurnId: turn.id,
                });
              }}
            />
          ))}
        </div>
      </TodaySection>

      <TodaySection
        count={doneCards.length}
        description="Historico rapido de pacientes ya resueltos en la jornada."
        emptyMessage="Todavia no hay pacientes atendidos hoy."
        icon={CheckCircle2}
        title="Atendidos"
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {doneCards.map((item) => (
            <PatientCard
              key={`${item.source}-${item.id}-done`}
              busy={false}
              item={item}
              onCardClick={() => {
                if (item.detailHref) {
                  router.push(item.detailHref);
                }
              }}
            />
          ))}
        </div>
      </TodaySection>

      <NewTurnModal
        onCreated={(created) => {
          setTurns((current) =>
            [...current, created].sort((left, right) =>
              left.arrivalAt.localeCompare(right.arrivalAt)
            )
          );
          showAlert(
            "success",
            "Paciente agregado",
            "El paciente quedo agregado en la columna En espera."
          );
        }}
        onOpenChange={setTurnModalOpen}
        onShowError={showTurnModalError}
        open={turnModalOpen}
      />
      {encounter ? <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4"><div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-card p-6 shadow-xl"><div className="mb-4 flex items-center justify-between"><h2 className="app-heading text-3xl text-foreground">Atención clínica</h2><Button variant="outline" onClick={() => setEncounter(null)}>Cerrar</Button></div><EncounterWorkflow petId={encounter.petId} clientId={encounter.clientId} vets={[]} onFinish={() => void finishEncounter()} /></div></div> : null}

      <AppAlert
        description={alert.description}
        onOpenChange={setAlertOpen}
        open={alertOpen}
        title={alert.title}
        variant={alert.variant}
      />
    </div>
  );
}
