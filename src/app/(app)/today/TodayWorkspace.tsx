"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FormField from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import { AppAlert } from "@/components/shared/AppAlert";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { cn } from "@/lib/utils";

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

type NewTurnFormState = {
  estimatedDuration: string;
  notes: string;
  ownerName: string;
  ownerPhone: string;
  petName: string;
  service: TodayTurnService;
  serviceName: string;
  species: "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";
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
  AESTHETIC: "Estética",
  BATH: "Baño",
  CHECKUP: "Chequeo",
  CONSULTATION: "Consulta",
  DEWORMING: "Desparasitación",
  EMERGENCY: "Emergencia",
  GROOMING: "Peluquería",
  HOSPITALIZATION: "Hospitalización",
  OTHER: "Otro",
  SURGERY: "Cirugía",
  VACCINATION: "Vacunación",
};

const TURN_SERVICE_LABELS: Record<TodayTurnService, string> = {
  BATH: "Baño",
  GROOMING: "Peluquería",
  HOSPITALIZATION: "Hospitalización",
  OTHER: "Otro",
  SURGERY: "Cirugía",
};

const STATE_LABELS: Record<UnifiedState, string> = {
  done: "Atendido",
  in_progress: "En atención",
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

const TURN_SERVICE_OPTIONS: Array<{
  defaultName: string;
  label: string;
  value: TodayTurnService;
}> = [
  { value: "GROOMING", label: "Peluquería", defaultName: "Baño y corte" },
  { value: "BATH", label: "Baño", defaultName: "Baño completo" },
  { value: "SURGERY", label: "Cirugía", defaultName: "Procedimiento quirúrgico" },
  {
    value: "HOSPITALIZATION",
    label: "Hospitalización",
    defaultName: "Hospitalización",
  },
  { value: "OTHER", label: "Otro", defaultName: "Servicio general" },
];

const SPECIES_OPTIONS: Array<{ label: string; value: NewTurnFormState["species"] }> =
  [
    { value: "DOG", label: "Perro" },
    { value: "CAT", label: "Gato" },
    { value: "BIRD", label: "Ave" },
    { value: "RABBIT", label: "Conejo" },
    { value: "OTHER", label: "Otro" },
  ];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
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
    throw new Error(payload?.error ?? `Error en ${url}`);
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
  todayTurnId?: number | null;
}) {
  const params = new URLSearchParams();

  if (input.clientId) params.set("clientId", String(input.clientId));
  if (input.petId) params.set("petId", String(input.petId));
  if (input.appointmentId) params.set("appointmentId", String(input.appointmentId));
  if (input.todayTurnId) params.set("todayTurnId", String(input.todayTurnId));
  if (input.petName) params.set("petName", input.petName);
  if (input.ownerName) params.set("ownerName", input.ownerName);
  if (input.returnTo) params.set("returnTo", input.returnTo);

  return `/invoices/new?${params.toString()}`;
}

function TodayHeader({
  canCreateTurns,
  dateIso,
  onNewTurn,
}: {
  canCreateTurns: boolean;
  dateIso: string;
  onNewTurn: () => void;
}) {
  const date = new Date(dateIso);
  const weekday = capitalize(format(date, "EEEE", { locale: es }));
  const dayNumber = format(date, "d");
  const month = capitalize(format(date, "MMMM", { locale: es }));

  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] border border-border/70 bg-card px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Operación del día
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {weekday} {dayNumber}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {month}. Todo lo importante del día en una sola vista.
        </p>
      </div>

      {canCreateTurns ? (
        <Button onClick={onNewTurn} className="h-11 rounded-2xl px-5">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo turno
        </Button>
      ) : null}
    </div>
  );
}

function TodaySection({
  children,
  count,
  emptyMessage,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  count: number;
  emptyMessage: string;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {count} {count === 1 ? "paciente" : "pacientes"}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3 p-4 sm:p-5">
        {count === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-border bg-muted/35 px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
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

  return (
    <article
      className={cn(
        "group rounded-[1.4rem] border border-border/70 border-l-4 bg-background/80 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm",
        stateUi.border,
        typeof onCardClick === "function" && "cursor-pointer"
      )}
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCardClick();
        }
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {item.timeLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                {item.timeLabel}
              </span>
            ) : null}
            <Badge className={cn("border", stateUi.badge)}>
              <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", stateUi.dot)} />
              {STATE_LABELS[item.state]}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {item.source === "appointment" ? "Cita" : "Walk-in"}
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

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              {item.serviceLabel}
            </Badge>
          </div>
        </div>

        {item.primaryActionLabel && onPrimaryAction ? (
          <div className="sm:pl-4">
            <Button
              className={cn("h-10 rounded-2xl px-4", stateUi.button)}
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
  const [savingTurn, setSavingTurn] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [turnForm, setTurnForm] = useState<NewTurnFormState>({
    estimatedDuration: "60",
    notes: "",
    ownerName: "",
    ownerPhone: "",
    petName: "",
    service: "GROOMING",
    serviceName: "Baño y corte",
    species: "DOG",
  });
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    variant: "info",
    title: "",
  });

  const canCreateTurns = !!access?.actions.todayTurns.create;
  const canUpdateTurns = !!access?.actions.todayTurns.update;
  const canUpdateAppointments = !!access?.actions.appointments.update;
  const canCreateInvoices = !!access?.actions.invoices.create;

  function showAlert(
    variant: AlertState["variant"],
    title: string,
    description?: string
  ) {
    setAlert({ variant, title, description });
    setAlertOpen(true);
  }

  useEffect(() => {
    const createdInvoiceId = searchParams.get("createdInvoiceId");
    if (!createdInvoiceId) return;

    showAlert(
      "success",
      "Factura creada",
      `La factura ${createdInvoiceId} se registró y el paciente se movió a Atendidos.`
    );
    router.replace(pathname);
  }, [pathname, router, searchParams]);

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
      showAlert("warning", "Sin permisos", "No puedes actualizar citas.");
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
      showAlert("warning", "Sin permisos", "No puedes actualizar turnos.");
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
        "No se pudo iniciar el turno",
        getErrorMessage(error)
      );
    } finally {
      setBusyKey(null);
    }
  }

  function goToInvoiceFlow(input: {
    appointmentId?: number | null;
    clientId?: number | null;
    invoiceId?: number | null;
    ownerName?: string | null;
    petId?: number | null;
    petName?: string | null;
    todayTurnId?: number | null;
  }) {
    if (input.invoiceId) {
      router.push(`/invoices/${input.invoiceId}`);
      return;
    }

    if (!canCreateInvoices) {
      showAlert("warning", "Sin permisos", "No puedes crear facturas.");
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
        todayTurnId: input.todayTurnId,
      })
    );
  }

  async function submitNewTurn() {
    if (!canCreateTurns) {
      showAlert("warning", "Sin permisos", "No puedes crear turnos.");
      return;
    }

    if (!turnForm.petName.trim() || !turnForm.ownerName.trim()) {
      showAlert(
        "warning",
        "Datos requeridos",
        "Completa la mascota y el nombre del dueño para registrar el turno."
      );
      return;
    }

    setSavingTurn(true);

    try {
      const created = await requestJson<TodayTurnItem>("/api/today-turns", {
        method: "POST",
        body: JSON.stringify({
          estimatedDuration: Number(turnForm.estimatedDuration || 60),
          notes: turnForm.notes.trim() || null,
          ownerName: turnForm.ownerName.trim(),
          ownerPhone: turnForm.ownerPhone.trim() || null,
          petName: turnForm.petName.trim(),
          service: turnForm.service,
          serviceName: turnForm.serviceName.trim(),
          species: turnForm.species,
        }),
      });

      setTurns((current) =>
        [...current, created].sort((left, right) =>
          left.arrivalAt.localeCompare(right.arrivalAt)
        )
      );
      setTurnModalOpen(false);
      setTurnForm({
        estimatedDuration: "60",
        notes: "",
        ownerName: "",
        ownerPhone: "",
        petName: "",
        service: "GROOMING",
        serviceName: "Baño y corte",
        species: "DOG",
      });
      showAlert("success", "Turno creado", "El paciente quedó agregado en En espera.");
    } catch (error) {
      showAlert(
        "destructive",
        "No se pudo crear el turno",
        getErrorMessage(error)
      );
    } finally {
      setSavingTurn(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <TodayHeader
        canCreateTurns={canCreateTurns}
        dateIso={initialDateIso}
        onNewTurn={() => setTurnModalOpen(true)}
      />

      <TodaySection
        count={appointmentCards.length}
        emptyMessage="No hay citas pendientes para hoy."
        icon={CalendarClock}
        title="Próximas citas"
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
        emptyMessage="No hay walk-ins esperando en este momento."
        icon={ClipboardList}
        title="En espera"
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

      <TodaySection
        count={inProgressCards.length}
        emptyMessage="No hay pacientes en atención ahora mismo."
        icon={Stethoscope}
        title="En atención"
      >
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
                todayTurnId: turn.id,
              });
            }}
          />
        ))}
      </TodaySection>

      <TodaySection
        count={doneCards.length}
        emptyMessage="Todavía no hay pacientes atendidos hoy."
        icon={CheckCircle2}
        title="Atendidos"
      >
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
      </TodaySection>

      <Modal
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setTurnModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submitNewTurn()} disabled={savingTurn}>
              {savingTurn ? "Guardando..." : "Crear turno"}
            </Button>
          </div>
        }
        onClose={setTurnModalOpen}
        open={turnModalOpen}
        size="lg"
        title="Nuevo turno"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Mascota"
            name="petName"
            onChange={(event) =>
              setTurnForm((current) => ({ ...current, petName: String(event.target.value) }))
            }
            placeholder="Ej: Max"
            required
            value={turnForm.petName}
          />
          <FormField
            label="Especie"
            name="species"
            onChange={(event) =>
              setTurnForm((current) => ({
                ...current,
                species: event.target.value as NewTurnFormState["species"],
              }))
            }
            options={SPECIES_OPTIONS}
            type="select"
            value={turnForm.species}
          />
          <FormField
            label="Dueño"
            name="ownerName"
            onChange={(event) =>
              setTurnForm((current) => ({
                ...current,
                ownerName: String(event.target.value),
              }))
            }
            placeholder="Ej: María García"
            required
            value={turnForm.ownerName}
          />
          <FormField
            label="Teléfono"
            name="ownerPhone"
            onChange={(event) =>
              setTurnForm((current) => ({
                ...current,
                ownerPhone: String(event.target.value),
              }))
            }
            placeholder="Opcional"
            value={turnForm.ownerPhone}
          />
          <FormField
            label="Tipo de servicio"
            name="service"
            onChange={(event) => {
              const value = event.target.value as TodayTurnService;
              const currentDefault =
                TURN_SERVICE_OPTIONS.find((option) => option.value === turnForm.service)
                  ?.defaultName ?? turnForm.serviceName;
              const nextDefault =
                TURN_SERVICE_OPTIONS.find((option) => option.value === value)?.defaultName ??
                turnForm.serviceName;

              setTurnForm((current) => ({
                ...current,
                service: value,
                serviceName:
                  current.serviceName === currentDefault ? nextDefault : current.serviceName,
              }));
            }}
            options={TURN_SERVICE_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            type="select"
            value={turnForm.service}
          />
          <FormField
            label="Duración estimada"
            name="estimatedDuration"
            onChange={(event) =>
              setTurnForm((current) => ({
                ...current,
                estimatedDuration: String(event.target.value),
              }))
            }
            type="number"
            value={turnForm.estimatedDuration}
          />
          <FormField
            className="sm:col-span-2"
            label="Servicio"
            name="serviceName"
            onChange={(event) =>
              setTurnForm((current) => ({
                ...current,
                serviceName: String(event.target.value),
              }))
            }
            placeholder="Ej: Consulta rápida"
            value={turnForm.serviceName}
          />
          <FormField
            className="sm:col-span-2"
            label="Notas"
            name="notes"
            onChange={(event) =>
              setTurnForm((current) => ({
                ...current,
                notes: String(event.target.value),
              }))
            }
            placeholder="Detalles útiles para recepción o doctor"
            type="textarea"
            value={turnForm.notes}
          />
        </div>
      </Modal>

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
