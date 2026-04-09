"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMinutes, format, isToday, isTomorrow, parse, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppAlert } from "@/components/shared/AppAlert";
import DataTable, { type DataTableColumn } from "@/components/shared/Datatable";
import FormField from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import ModalDelete from "@/components/shared/ModalDelete";
import AppPageHero from "@/components/shared/AppPageHero";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { safeDate } from "@/lib/utility";
import { cn } from "@/lib/utils";

type PetDTO = { id: number; name: string; species: string; clientId: number };
type ClientDTO = { id: number; fullName: string; phone?: string | null };
type VetDTO = { id: string; name: string; email: string };
type ScheduleDTO = { day: string; open: string | null; close: string | null; closed: boolean };

type AppointmentDTO = {
  id: number;
  clientId: number;
  petId: number;
  type: string;
  startAt: string;
  endAt: string | null;
  status: string;
  reason: string | null;
  notes: string | null;
  vetId: string | null;
  pet: PetDTO;
  client: ClientDTO;
  vet: VetDTO | null;
};

type AppointmentMetaResponse = {
  clients: ClientDTO[];
  pets: PetDTO[];
  vets: VetDTO[];
  schedules: ScheduleDTO[];
  appointmentTypes: string[];
  appointmentStatuses: string[];
};

type AppointmentTableRow = AppointmentDTO & { searchText: string };

type AppointmentFormState = {
  petId: string;
  type: string;
  date: string;
  time: string;
  endTime: string;
  status: string;
  vetId: string;
  reason: string;
  notes: string;
};

type DeleteTarget = { id: number; label: string };

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Consulta",
  VACCINATION: "Vacunación",
  SURGERY: "Cirugía",
  AESTHETIC: "Estética",
  CHECKUP: "Chequeo",
  EMERGENCY: "Emergencia",
  GROOMING: "Peluquería",
  BATH: "Baño",
  HOSPITALIZATION: "Hospitalización",
  DEWORMING: "Desparasitación",
  OTHER: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Atendida",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const TYPE_STYLES: Record<string, { dot: string; badge: string; bar: string }> = {
  CONSULTATION: { dot: "bg-emerald-500", badge: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" },
  VACCINATION: { dot: "bg-sky-500", badge: "bg-sky-500/12 text-sky-700 dark:text-sky-300", bar: "bg-sky-500" },
  SURGERY: { dot: "bg-rose-500", badge: "bg-rose-500/12 text-rose-700 dark:text-rose-300", bar: "bg-rose-500" },
  AESTHETIC: { dot: "bg-amber-500", badge: "bg-amber-500/12 text-amber-700 dark:text-amber-300", bar: "bg-amber-500" },
  CHECKUP: { dot: "bg-violet-500", badge: "bg-violet-500/12 text-violet-700 dark:text-violet-300", bar: "bg-violet-500" },
  EMERGENCY: { dot: "bg-red-500", badge: "bg-red-500/12 text-red-700 dark:text-red-300", bar: "bg-red-500" },
  GROOMING: { dot: "bg-cyan-500", badge: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300", bar: "bg-cyan-500" },
  BATH: { dot: "bg-blue-500", badge: "bg-blue-500/12 text-blue-700 dark:text-blue-300", bar: "bg-blue-500" },
  HOSPITALIZATION: { dot: "bg-indigo-500", badge: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300", bar: "bg-indigo-500" },
  DEWORMING: { dot: "bg-lime-500", badge: "bg-lime-500/12 text-lime-700 dark:text-lime-300", bar: "bg-lime-500" },
  OTHER: { dot: "bg-zinc-500", badge: "bg-zinc-500/12 text-zinc-700 dark:text-zinc-300", bar: "bg-zinc-500" },
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "border-blue-500/20 bg-blue-500/12 text-blue-700 dark:text-blue-300",
  CONFIRMED: "border-green-500/20 bg-green-500/12 text-green-700 dark:text-green-300",
  IN_PROGRESS: "border-yellow-500/20 bg-yellow-500/12 text-yellow-700 dark:text-yellow-300",
  COMPLETED: "border-teal-500/20 bg-teal-500/12 text-teal-700 dark:text-teal-300",
  CANCELLED: "border-red-500/20 bg-red-500/12 text-red-700 dark:text-red-300",
  NO_SHOW: "border-border bg-muted/70 text-muted-foreground",
};

const SPECIES_LABELS: Record<string, string> = {
  DOG: "Perro",
  CAT: "Gato",
  BIRD: "Ave",
  RABBIT: "Conejo",
  OTHER: "Otra",
};

const WEEKDAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DEFAULT_SCHEDULE: ScheduleDTO = { day: "monday", open: "09:00", close: "17:00", closed: false };
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
const NON_BLOCKING_STATUSES = new Set(["CANCELLED", "NO_SHOW"]);
const TIMELINE_SLOT_HEIGHT = 86;
const TIMELINE_CARD_GAP = 8;

function formatAppointmentType(type: string) {
  return TYPE_LABELS[type] ?? type;
}

function formatAppointmentStatus(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function formatSpecies(species: string) {
  return SPECIES_LABELS[species] ?? species;
}

function getWeekdayKey(date: Date) {
  return WEEKDAY_ORDER[date.getDay()];
}

function combineDateAndTime(date: string, time: string) {
  return parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
}

function buildTimeSlots(open: string | null, close: string | null, stepMinutes = 30) {
  const startDate = parse(open ?? "09:00", "HH:mm", new Date());
  const endDate = parse(close ?? "17:00", "HH:mm", new Date());
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return [];

  const slots: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    slots.push(format(current, "HH:mm"));
    current = addMinutes(current, stepMinutes);
  }
  return slots;
}

function getAppointmentEnd(appointment: Pick<AppointmentDTO, "startAt" | "endAt">) {
  const start = safeDate(appointment.startAt);
  if (!start) return null;
  return safeDate(appointment.endAt) ?? addMinutes(start, DEFAULT_APPOINTMENT_DURATION_MINUTES);
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

function diffMinutes(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
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
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? `Error en ${url}`);
  }

  return response.json();
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}

export default function AppointmentsPage() {
  const access = useCurrentUserAccess();
  const [view, setView] = useState<"agenda" | "list">("agenda");
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [pets, setPets] = useState<PetDTO[]>([]);
  const [vets, setVets] = useState<VetDTO[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDTO[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);
  const [appointmentStatuses, setAppointmentStatuses] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentDTO | null>(null);
  const [formData, setFormData] = useState<AppointmentFormState>({
    petId: "",
    type: "",
    date: "",
    time: "",
    endTime: "",
    status: "",
    vetId: "__NONE__",
    reason: "",
    notes: "",
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<{
    variant: "success" | "info" | "warning" | "destructive";
    title: string;
    description?: string;
  }>({ variant: "info", title: "" });
  const canCreateAppointments = !!access?.actions.appointments.create;
  const canUpdateAppointments = !!access?.actions.appointments.update;
  const canDeleteAppointments = !!access?.actions.appointments.delete;

  const showAlert = useCallback((
    variant: "success" | "info" | "warning" | "destructive",
    title: string,
    description?: string
  ) => {
    setAlert({ variant, title, description });
    setAlertOpen(true);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [appointmentRows, meta] = await Promise.all([
        requestJson<AppointmentDTO[]>("/api/appointments"),
        requestJson<AppointmentMetaResponse>("/api/appointments/meta"),
      ]);

      setAppointments(appointmentRows);
      setClients(meta.clients);
      setPets(meta.pets);
      setVets(meta.vets);
      setSchedules(meta.schedules);
      setAppointmentTypes(meta.appointmentTypes);
      setAppointmentStatuses(meta.appointmentStatuses);
    } catch (refreshError) {
      console.error(refreshError);
      const message = getErrorMessage(refreshError);
      setError(message);
      showAlert("destructive", "No se pudo cargar la agenda", message);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const selectedDayStr = useMemo(() => format(selectedDay, "yyyy-MM-dd"), [selectedDay]);
  const scheduleByDay = useMemo(() => new Map(schedules.map((schedule) => [schedule.day, schedule])), [schedules]);
  const selectedSchedule = useMemo(
    () => scheduleByDay.get(getWeekdayKey(selectedDay)) ?? DEFAULT_SCHEDULE,
    [scheduleByDay, selectedDay]
  );
  const isClosedDay = Boolean(selectedSchedule.closed);
  const timeSlots = useMemo(
    () => (isClosedDay ? [] : buildTimeSlots(selectedSchedule.open, selectedSchedule.close)),
    [isClosedDay, selectedSchedule.close, selectedSchedule.open]
  );

  const petById = useMemo(() => new Map(pets.map((pet) => [pet.id, pet])), [pets]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const petOptions = useMemo(
    () =>
      pets.map((pet) => ({
        value: String(pet.id),
        label: `${pet.name} · ${formatSpecies(pet.species)}`,
      })),
    [pets]
  );

  const typeOptions = useMemo(
    () => appointmentTypes.map((type) => ({ value: type, label: formatAppointmentType(type) })),
    [appointmentTypes]
  );

  const statusOptions = useMemo(
    () => appointmentStatuses.map((status) => ({ value: status, label: formatAppointmentStatus(status) })),
    [appointmentStatuses]
  );

  const vetOptions = useMemo(
    () => [{ value: "__NONE__", label: "Sin asignar" }, ...vets.map((vet) => ({ value: vet.id, label: vet.name }))],
    [vets]
  );

  const selectedPet = formData.petId ? petById.get(Number(formData.petId)) ?? null : null;
  const selectedClient = selectedPet ? clientById.get(selectedPet.clientId) ?? null : null;

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const start = safeDate(appointment.startAt);
          return start ? format(start, "yyyy-MM-dd") === selectedDayStr : false;
        })
        .slice()
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [appointments, selectedDayStr]
  );

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => !NON_BLOCKING_STATUSES.has(appointment.status)),
    [appointments]
  );

  const activeDayAppointments = useMemo(
    () => dayAppointments.filter((appointment) => !NON_BLOCKING_STATUSES.has(appointment.status)),
    [dayAppointments]
  );

  const calendarDotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const appointment of activeAppointments) {
      const start = safeDate(appointment.startAt);
      if (!start) continue;

      const dayKey = format(start, "yyyy-MM-dd");
      const dotColor = TYPE_STYLES[appointment.type]?.dot ?? TYPE_STYLES.OTHER.dot;
      const currentDots = map.get(dayKey) ?? [];

      if (!currentDots.includes(dotColor)) {
        currentDots.push(dotColor);
      }

      map.set(dayKey, currentDots.slice(0, 4));
    }

    return map;
  }, [activeAppointments]);

  const occupiedSlots = useMemo(() => {
    const occupied = new Set<string>();

    for (const appointment of activeDayAppointments) {
      const start = safeDate(appointment.startAt);
      const end = getAppointmentEnd(appointment);
      if (!start || !end) continue;

      for (const slot of timeSlots) {
        const slotStart = combineDateAndTime(selectedDayStr, slot);
        const slotEnd = addMinutes(slotStart, DEFAULT_APPOINTMENT_DURATION_MINUTES);
        if (rangesOverlap(slotStart, slotEnd, start, end)) {
          occupied.add(slot);
        }
      }
    }

    return occupied;
  }, [activeDayAppointments, selectedDayStr, timeSlots]);

  const appointmentLayouts = useMemo(() => {
    const timelineStart = timeSlots[0] ? combineDateAndTime(selectedDayStr, timeSlots[0]) : null;
    if (!timelineStart) return [];

    return activeDayAppointments
      .map((appointment) => {
        const start = safeDate(appointment.startAt);
        const end = getAppointmentEnd(appointment);
        if (!start || !end) return null;

        const top = (diffMinutes(timelineStart, start) / DEFAULT_APPOINTMENT_DURATION_MINUTES) * TIMELINE_SLOT_HEIGHT;
        const height = Math.max(
          (diffMinutes(start, end) / DEFAULT_APPOINTMENT_DURATION_MINUTES) * TIMELINE_SLOT_HEIGHT - TIMELINE_CARD_GAP,
          TIMELINE_SLOT_HEIGHT - TIMELINE_CARD_GAP
        );

        return {
          appointment,
          top,
          height,
        };
      })
      .filter((item): item is { appointment: AppointmentDTO; top: number; height: number } => Boolean(item));
  }, [activeDayAppointments, selectedDayStr, timeSlots]);

  const renderCalendarDayButton = React.useCallback(
    (props: React.ComponentProps<typeof CalendarDayButton>) => {
      const dayKey = format(props.day.date, "yyyy-MM-dd");
      const dots = calendarDotsByDay.get(dayKey) ?? [];

      return (
        <CalendarDayButton
          {...props}
          className={cn(props.className, dots.length > 0 && "gap-0.5 pb-1")}
        >
          <span>{props.children}</span>
          {dots.length > 0 ? (
            <span className="flex items-center justify-center gap-0.5">
              {dots.map((dot, index) => (
                <span key={`${dayKey}-${dot}-${index}`} className={cn("h-1.5 w-1.5 rounded-full", dot)} />
              ))}
            </span>
          ) : null}
        </CalendarDayButton>
      );
    },
    [calendarDotsByDay]
  );

  const tableRows = useMemo<AppointmentTableRow[]>(
    () =>
      appointments.map((appointment) => ({
        ...appointment,
        searchText: [
          appointment.pet?.name,
          appointment.client?.fullName,
          appointment.vet?.name,
          appointment.reason,
          formatAppointmentType(appointment.type),
          formatAppointmentStatus(appointment.status),
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [appointments]
  );

  const legendItems = useMemo(
    () =>
      appointmentTypes.slice(0, 6).map((type) => ({
        label: formatAppointmentType(type),
        color: TYPE_STYLES[type]?.dot ?? "bg-zinc-400",
      })),
    [appointmentTypes]
  );

  function getScheduleForDate(date: Date) {
    return scheduleByDay.get(getWeekdayKey(date)) ?? null;
  }

  function resetForm(day = selectedDay, time = "09:00") {
    const defaultEndTime = format(
      addMinutes(combineDateAndTime(format(day, "yyyy-MM-dd"), time), DEFAULT_APPOINTMENT_DURATION_MINUTES),
      "HH:mm"
    );

    setFormData({
      petId: "",
      type: appointmentTypes[0] ?? "",
      date: format(day, "yyyy-MM-dd"),
      time,
      endTime: defaultEndTime,
      status: appointmentStatuses[0] ?? "",
      vetId: "__NONE__",
      reason: "",
      notes: "",
    });
  }

  function openCreateAt(day: Date, time: string) {
    if (!canCreateAppointments) return;
    setEditing(null);
    resetForm(day, time);
    setModalOpen(true);
  }

  function openEdit(appointment: AppointmentDTO) {
    if (!canUpdateAppointments) return;
    const start = safeDate(appointment.startAt);
    const end = safeDate(appointment.endAt);

    setEditing(appointment);
    setFormData({
      petId: String(appointment.petId),
      type: appointment.type,
      date: start ? format(start, "yyyy-MM-dd") : format(selectedDay, "yyyy-MM-dd"),
      time: start ? format(start, "HH:mm") : "09:00",
      endTime: format(end ?? addMinutes(start ?? selectedDay, DEFAULT_APPOINTMENT_DURATION_MINUTES), "HH:mm"),
      status: appointment.status,
      vetId: appointment.vetId ?? "__NONE__",
      reason: appointment.reason ?? "",
      notes: appointment.notes ?? "",
    });
    setModalOpen(true);
  }

  function askDelete(appointment: AppointmentDTO) {
    if (!canDeleteAppointments) return;
    setDeleteTarget({
      id: appointment.id,
      label: `${appointment.pet?.name ?? "Cita"} · ${formatAppointmentType(appointment.type)}`,
    });
    setDeleteOpen(true);
  }

  function handleChange(event: { target: { name: string; value: string } }) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function submitAppointment() {
    if ((editing && !canUpdateAppointments) || (!editing && !canCreateAppointments)) {
      showAlert("warning", "No tienes permisos para guardar citas");
      return;
    }
    const petId = Number(formData.petId);
    const pet = petById.get(petId);

    if (!pet) {
      showAlert("warning", "Mascota requerida", "Selecciona una mascota válida para la cita.");
      return;
    }

    if (!formData.type || !formData.status || !formData.date || !formData.time) {
      showAlert("warning", "Campos obligatorios", "Completa los datos requeridos de la cita.");
      return;
    }

    const startAt = combineDateAndTime(formData.date, formData.time);
    if (Number.isNaN(startAt.getTime())) {
      showAlert("warning", "Hora inválida", "La fecha u hora inicial no es válida.");
      return;
    }

    const endDate = formData.endTime
      ? combineDateAndTime(formData.date, formData.endTime)
      : addMinutes(startAt, DEFAULT_APPOINTMENT_DURATION_MINUTES);

    if (Number.isNaN(endDate.getTime())) {
      showAlert("warning", "Hora inválida", "La hora final no es válida.");
      return;
    }

    if (endDate < startAt) {
      showAlert("warning", "Rango inválido", "La hora final no puede ser menor que la inicial.");
      return;
    }

    const daySchedule = getScheduleForDate(startAt);
    if (!daySchedule || daySchedule.closed || !daySchedule.open || !daySchedule.close) {
      showAlert("warning", "Clínica cerrada", "Ese día la clínica no tiene horario disponible para citas.");
      return;
    }

    const openAt = combineDateAndTime(formData.date, daySchedule.open);
    const closeAt = combineDateAndTime(formData.date, daySchedule.close);
    if (startAt < openAt || endDate > closeAt) {
      showAlert(
        "warning",
        "Fuera de horario",
        `Las citas para ese día deben estar entre ${daySchedule.open} y ${daySchedule.close}.`
      );
      return;
    }

    const conflictingAppointment = activeAppointments.find((appointment) => {
      if (editing && appointment.id === editing.id) return false;

      const appointmentStart = safeDate(appointment.startAt);
      const appointmentEnd = getAppointmentEnd(appointment);
      if (!appointmentStart || !appointmentEnd) return false;

      return rangesOverlap(startAt, endDate, appointmentStart, appointmentEnd);
    });

    if (conflictingAppointment) {
      showAlert(
        "warning",
        "Horario ocupado",
        `La cita se solapa con ${conflictingAppointment.pet?.name ?? "otra cita"} de ${conflictingAppointment.client?.fullName ?? "otro cliente"}.`
      );
      return;
    }

    const payload = {
      clientId: pet.clientId,
      petId: pet.id,
      type: formData.type,
      startAt: startAt.toISOString(),
      endAt: endDate.toISOString(),
      status: formData.status,
      vetId: formData.vetId === "__NONE__" ? null : formData.vetId,
      reason: formData.reason.trim() || null,
      notes: formData.notes.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await requestJson(`/api/appointments/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showAlert("success", "Cita actualizada", "Los cambios de la cita se guardaron correctamente.");
      } else {
        await requestJson("/api/appointments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showAlert("success", "Cita creada", "La cita se registró correctamente.");
      }

      setModalOpen(false);
      setEditing(null);
      resetForm();
      await refreshAll();
    } catch (submitError) {
      console.error(submitError);
      showAlert("destructive", editing ? "No se pudo actualizar la cita" : "No se pudo crear la cita", getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!canDeleteAppointments) {
      showAlert("warning", "No tienes permisos para eliminar citas");
      return;
    }

    setDeleting(true);
    try {
      await requestJson(`/api/appointments/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await refreshAll();
      showAlert("success", "Cita eliminada", "La cita se eliminó correctamente.");
    } catch (deleteError) {
      console.error(deleteError);
      showAlert("destructive", "No se pudo eliminar la cita", getErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<AppointmentTableRow>[] = [
    {
      header: "Fecha/Hora",
      cell: (row: AppointmentTableRow) => {
        const start = safeDate(row.startAt);
        if (!start) return <span className="text-muted-foreground/70">-</span>;

        const dayLabel = isToday(start)
          ? "Hoy"
          : isTomorrow(start)
            ? "Mañana"
            : format(start, "EEE d MMM", { locale: es });

        return (
          <div>
            <p className="font-semibold capitalize text-foreground">{dayLabel}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(start, "HH:mm")}
            </p>
          </div>
        );
      },
    },
    {
      header: "Paciente",
      cell: (row: AppointmentTableRow) => (
        <div>
          <p className="font-medium text-foreground">{row.pet?.name ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{formatSpecies(row.pet?.species ?? "")}</p>
        </div>
      ),
    },
    { header: "Propietario", cell: (row: AppointmentTableRow) => <span className="text-muted-foreground">{row.client?.fullName ?? "-"}</span> },
    { header: "Veterinario", cell: (row: AppointmentTableRow) => <span className="text-muted-foreground">{row.vet?.name ?? "Sin asignar"}</span> },
    { header: "Tipo", cell: (row: AppointmentTableRow) => formatAppointmentType(row.type) },
    {
      header: "Estado",
      cell: (row: AppointmentTableRow) => (
        <Badge className={`${STATUS_COLORS[row.status] ?? "border-border bg-muted/70 text-muted-foreground"} border`}>
          {formatAppointmentStatus(row.status)}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      cell: (row: AppointmentTableRow) => (
        <div className="flex items-center gap-2">
          {canUpdateAppointments ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : null}
          {canDeleteAppointments ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => askDelete(row)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="app-empty flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-panel-strong p-6">
        <p className="font-semibold text-foreground">No se pudo cargar la agenda</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void refreshAll()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<CalendarIcon className="size-3.5" />}
        badgeLabel="Agenda clínica"
        title="Agenda y seguimiento diario"
        description="Organiza citas, horarios y disponibilidad en un solo lugar."
        actions={
          canCreateAppointments ? (
            <Button onClick={() => openCreateAt(selectedDay, timeSlots[0] ?? "09:00")}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cita
            </Button>
          ) : null
        }
        stats={[
          { label: "Del día", value: dayAppointments.length, hint: "Citas registradas" },
          { label: "Activas", value: activeDayAppointments.length, hint: "Sin canceladas ni no-show" },
          { label: "Veterinarios", value: vets.length, hint: "Disponibles para asignación" },
        ]}
      />
      <div className="hidden">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agenda de Citas</h2>
          <p className="text-muted-foreground">Gestiona las citas según mascotas, clientes, veterinarios y horario de la clínica</p>
        </div>

        {canCreateAppointments ? (
          <Button onClick={() => openCreateAt(selectedDay, timeSlots[0] ?? "09:00")}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        ) : null}
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as "agenda" | "list")}>
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="app-panel-strong p-4">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={(day) => day && setSelectedDay(startOfDay(day))}
                  disabled={(day) => Boolean(scheduleByDay.get(getWeekdayKey(day))?.closed)}
                  components={{ DayButton: renderCalendarDayButton }}
                  className="rounded-xl w-full border border-border/70"
                />

                <div className="mt-4 border-t border-border/70 pt-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Tipos de cita</p>
                  <div className="space-y-2">
                    {legendItems.map((item) => (
                      <LegendItem key={item.label} colorClass={item.color} label={item.label} />
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/70 bg-muted/45 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Horario del día</p>
                  <p>{isClosedDay ? "La clínica está cerrada este día" : `${selectedSchedule.open ?? "09:00"} - ${selectedSchedule.close ?? "17:00"}`}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="app-panel-strong overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSelectedDay((current) => addDays(current, -1))} className="rounded-xl">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="px-2">
                      <p className="font-semibold capitalize text-foreground">{format(selectedDay, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        {dayAppointments.length} cita(s)
                      </p>
                    </div>

                    <Button variant="outline" size="icon" onClick={() => setSelectedDay((current) => addDays(current, 1))} className="rounded-xl">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button variant="outline" onClick={() => setSelectedDay(startOfDay(new Date()))} className="rounded-xl">
                    Hoy
                  </Button>
                </div>

                {isClosedDay ? (
                  <div className="p-8 text-center text-muted-foreground">No hay agenda disponible porque la clínica está cerrada este día.</div>
                ) : (
                  <div className="flex">
                    <div className="w-20 border-r border-border/70">
                      {timeSlots.map((slot) => (
                        <div
                          key={slot}
                          className="flex items-start px-4 py-3 text-sm text-muted-foreground"
                          style={{ height: `${TIMELINE_SLOT_HEIGHT}px` }}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>

                    <div
                      className="relative flex-1"
                      style={{ height: `${timeSlots.length * TIMELINE_SLOT_HEIGHT}px` }}
                    >
                      <div className="absolute inset-0">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot}
                            className="border-b border-border/70 px-3 py-3"
                            style={{ height: `${TIMELINE_SLOT_HEIGHT}px` }}
                          >
                            {!occupiedSlots.has(slot) && canCreateAppointments ? (
                              <button
                                type="button"
                                onClick={() => openCreateAt(selectedDay, slot)}
                                className="flex h-full w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition hover:border-primary/30 hover:bg-muted/45"
                              >
                                <Plus className="h-4 w-4" />
                                Agendar cita
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="pointer-events-none absolute inset-0 px-3 py-3">
                        {appointmentLayouts.map(({ appointment, top }) => {
                          const styles = TYPE_STYLES[appointment.type] ?? TYPE_STYLES.OTHER;

                          return (
                            <div
                              key={appointment.id}
                              className="pointer-events-auto absolute left-3 right-3 cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-card/94 transition hover:-translate-y-0.5"
                              style={{
                                top: `${top + 4}px`,
                                // height: `${height}px`,
                              }}
                              onClick={() => openEdit(appointment)}
                            >
                              <div className={`absolute left-0 top-0 h-full w-1.5 ${styles.bar}`} />

                              <div className="flex h-full items-start justify-between gap-3 p-4 pl-5">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-foreground">{appointment.pet?.name ?? "Paciente"}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
                                      {formatAppointmentType(appointment.type)}
                                    </span>
                                    <Badge className={`${STATUS_COLORS[appointment.status] ?? "border-border bg-muted/70 text-muted-foreground"} border`}>
                                      {formatAppointmentStatus(appointment.status)}
                                    </Badge>
                                  </div>

                                  <p className="mt-1 truncate text-sm text-muted-foreground">{appointment.client?.fullName ?? "Propietario"}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">{appointment.reason || "Sin motivo registrado"}</p>
                                  <p className="mt-2 text-xs text-muted-foreground/80">
                                    {format(safeDate(appointment.startAt) ?? combineDateAndTime(selectedDayStr, timeSlots[0] ?? "09:00"), "HH:mm")} -{" "}
                                    {format(getAppointmentEnd(appointment) ?? combineDateAndTime(selectedDayStr, timeSlots[0] ?? "09:30"), "HH:mm")}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground/80">Veterinario: {appointment.vet?.name ?? "Sin asignar"}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {canUpdateAppointments ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openEdit(appointment);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  ) : null}
                                  {canDeleteAppointments ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        askDelete(appointment);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <DataTable
            columns={columns}
            data={tableRows}
            searchKey="searchText"
            searchPlaceholder="Buscar por mascota, cliente, veterinario o motivo..."
            emptyMessage="No hay citas registradas"
          />
        </TabsContent>
      </Tabs>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Cita" : "Nueva Cita"}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            {(editing ? canUpdateAppointments : canCreateAppointments) ? (
              <Button onClick={() => void submitAppointment()} disabled={saving}>
                {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Cita"}
              </Button>
            ) : null}
          </div>
        }
      >
        <form onSubmit={(event) => { event.preventDefault(); void submitAppointment(); }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Paciente" name="petId" type="select" value={formData.petId} onChange={handleChange} options={petOptions} placeholder="Selecciona una mascota" required />

            <div className="space-y-2">
              <label className="text-[0.78rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Propietario</label>
              <div className="flex min-h-10 items-center rounded-2xl border border-border/70 bg-muted/45 px-3 text-sm text-foreground">
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                {selectedClient?.fullName ?? "Se asigna según la mascota"}
              </div>
            </div>

            <FormField label="Tipo de Cita" name="type" type="select" value={formData.type} onChange={handleChange} options={typeOptions} placeholder="Selecciona un tipo" required />
            <FormField label="Estado" name="status" type="select" value={formData.status} onChange={handleChange} options={statusOptions} placeholder="Selecciona un estado" required />
            <FormField label="Fecha" name="date" type="date" value={formData.date} onChange={handleChange} required />
            <FormField label="Hora inicial" name="time" type="time" value={formData.time} onChange={handleChange} required />
            <FormField label="Hora final" name="endTime" type="time" value={formData.endTime} onChange={handleChange} />
            <FormField label="Veterinario" name="vetId" type="select" value={formData.vetId} onChange={handleChange} options={vetOptions} />
            <FormField label="Motivo" name="reason" type="textarea" value={formData.reason} onChange={handleChange} className="sm:col-span-2" />
            <FormField label="Notas" name="notes" type="textarea" value={formData.notes} onChange={handleChange} className="sm:col-span-2" />
          </div>
        </form>
      </Modal>

      <ModalDelete open={deleteOpen} onOpenChange={setDeleteOpen} title="Eliminar cita" itemName={deleteTarget?.label} loading={deleting} onConfirm={handleDelete} />

      <AppAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        variant={alert.variant}
        title={alert.title}
        description={alert.description}
      />
    </div>
  );
}
