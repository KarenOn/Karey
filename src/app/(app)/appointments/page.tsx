"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMinutes, format, isToday, isTomorrow, parse, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  LoaderCircle,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppAlert } from "@/components/shared/AppAlert";
import DataTable, { type DataTableColumn } from "@/components/shared/Datatable";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import ModalDelete from "@/components/shared/ModalDelete";
import AppPageHero from "@/components/shared/AppPageHero";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { safeDate } from "@/lib/utility";
import { cn } from "@/lib/utils";
import DataTableSkeleton from "@/components/shared/DataTableSkeleton";
import EncounterWorkflow from "@/components/shared/EncounterWorkflow";
import { getClinicDateKey } from "@/lib/appointment-time";
import {
  filterAppointmentsByClinicDay,
  canPerformAction,
  isVetAvailableForRange,
  invalidateAppointmentSurfaces,
} from "@/lib/appointment-helpers";
import { useCurrentUserProfile } from "@/components/layout/current-user-context";

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
  reminderSent: boolean;
  reminderSentAt: string | null;
  pet: PetDTO;
  client: ClientDTO;
  vet: VetDTO | null;
  visit?: { id: number; _count: { vaccinations: number } } | null;
  encounterItems?: Array<{ id: number }>;
};

type AppointmentMetaResponse = {
  clients: ClientDTO[];
  pets: PetDTO[];
  vets: VetDTO[];
  schedules: ScheduleDTO[];
  appointmentTypes: string[];
  appointmentStatuses: string[];
  clinicTimezone: string;
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
const TIMELINE_SLOT_MINUTES = 30;
const TIMELINE_PIXELS_PER_MINUTE = TIMELINE_SLOT_HEIGHT / TIMELINE_SLOT_MINUTES;
const APPOINTMENT_HOVER_HEIGHT = 196;

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
  while (current < endDate) {
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

function hasAppointmentActivity(appointment: AppointmentDTO) {
  return Boolean(appointment.visit || appointment.encounterItems?.length);
}

function canStillSendReminder(status: string) {
  return status === "SCHEDULED" || status === "CONFIRMED";
}

function getReminderBadge(appointment: Pick<AppointmentDTO, "client" | "reminderSent" | "status">) {
  if (appointment.reminderSent) {
    return {
      className: "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      label: "Recordatorio enviado",
    };
  }

  if (!canStillSendReminder(appointment.status)) {
    return null;
  }

  if (!appointment.client?.phone) {
    return {
      className: "border-border bg-muted/70 text-muted-foreground",
      label: "Sin WhatsApp",
    };
  }

  return {
    className: "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    label: "WhatsApp pendiente",
  };
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

function AppointmentDetailDialog({
  appointment,
  onClose,
  canEdit,
  canManage,
  canAttend,
  canReschedule,
  canCancel,
  onEdit,
  onAttend,
  onManage,
  onReschedule,
  onCancel,
}: {
  appointment: AppointmentDTO | null;
  onClose: () => void;
  canEdit: boolean;
  canManage: boolean;
  canAttend: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  onEdit: (appointment: AppointmentDTO) => void;
  onAttend: (appointment: AppointmentDTO) => void;
  onManage: (appointment: AppointmentDTO) => void;
  onReschedule: (appointment: AppointmentDTO) => void;
  onCancel: (appointment: AppointmentDTO) => void;
}) {
  if (!appointment) return null;
  const start = safeDate(appointment.startAt);
  const end = getAppointmentEnd(appointment);
  const canCancelAppointment = canCancel && canPerformAction(appointment.status, "cancel") && (appointment.status !== "IN_PROGRESS" || !hasAppointmentActivity(appointment));
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Detalle de cita</DialogTitle></DialogHeader>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Paciente" value={appointment.pet?.name ?? "-"} />
          <DetailItem label="Cliente" value={appointment.client?.fullName ?? "-"} />
          <DetailItem label="Fecha" value={start ? format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "-"} />
          <DetailItem label="Inicio / fin" value={`${start ? format(start, "HH:mm") : "-"} - ${end ? format(end, "HH:mm") : "-"}`} />
          <DetailItem label="Tipo" value={formatAppointmentType(appointment.type)} />
          <DetailItem label="Estado" value={formatAppointmentStatus(appointment.status)} />
          <DetailItem label="Veterinario" value={appointment.vet?.name ?? "Sin asignar"} />
          <DetailItem label="Recordatorio" value={appointment.reminderSent ? "Enviado" : "Pendiente"} />
          <DetailItem label="Motivo" value={appointment.reason ?? "Sin motivo registrado"} className="sm:col-span-2" />
          <DetailItem label="Notas" value={appointment.notes ?? "Sin notas registradas"} className="sm:col-span-2" />
        </div>
        <DialogFooter className="flex-wrap sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {canEdit && canPerformAction(appointment.status, "reschedule") ? <Button variant="outline" onClick={() => onEdit(appointment)}><Edit className="mr-2 h-4 w-4" />Editar</Button> : null}
            {canAttend && canManage && canPerformAction(appointment.status, "attend") ? <Button variant="outline" onClick={() => onAttend(appointment)}>Atender</Button> : null}
            {canManage && appointment.status === "IN_PROGRESS" ? <Button variant="outline" onClick={() => onManage(appointment)}>Gestionar atención</Button> : null}
            {canReschedule && canPerformAction(appointment.status, "reschedule") ? <Button variant="ghost" onClick={() => onReschedule(appointment)}>Reprogramar</Button> : null}
            {canCancelAppointment ? <Button variant="ghost" className="text-destructive" onClick={() => onCancel(appointment)}>Cancelar</Button> : null}
          </div>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return <div className={className}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-foreground">{value}</p></div>;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const access = useCurrentUserAccess();
  const profile = useCurrentUserProfile();
  const [view, setView] = useState<"agenda" | "list">("agenda");
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [listViewSelectedDay, setListViewSelectedDay] = useState<string>("");
  const listDateInitialized = useRef(false);
  const [listStatusFilter, setListStatusFilter] = useState("ALL");
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
  const [clinicTimezone, setClinicTimezone] = useState("America/Santo_Domingo");
  const [slotVetId, setSlotVetId] = useState("__NONE__");
  // const [listViewSearchText, setListViewSearchText] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentDTO | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDTO | null>(null);
  const [hoveredAppointmentId, setHoveredAppointmentId] = useState<number | null>(null);
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
  const [encounter, setEncounter] = useState<{ appointmentId: number; petId: number; clientId: number } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AppointmentDTO | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentDTO | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<{
    variant: "success" | "info" | "warning" | "destructive";
    title: string;
    description?: string;
  }>({ variant: "info", title: "" });
  const canCreateAppointments = !!access?.actions.appointments.create;
  const canUpdateAppointments = !!access?.actions.appointments.update;
  const canEditAppointments = !!access?.actions.appointments.edit;
  const canAttendAppointments = !!access?.actions.appointments.attend;
  const canManageEncounter = !!access?.actions.encounters.manage;
  const canCancelAppointments = !!access?.actions.appointments.cancel;
  const canRescheduleAppointments = !!access?.actions.appointments.reschedule;
  const canDeleteAppointments = !!access?.actions.appointments.delete;
  const canAssignAppointments = !!access?.actions.appointments.assign;
  const canSelfAssignAppointments = canAssignAppointments && !!access?.actions.appointments.receiveUnassignedNowAlerts;

  const showAlert = useCallback((
    variant: "success" | "info" | "warning" | "destructive",
    title: string,
    description?: string
  ) => {
    setAlert({ variant, title, description });
    setAlertOpen(true);
  }, []);

  const refreshAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
      setClinicTimezone(meta.clinicTimezone || "America/Santo_Domingo");
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

  useEffect(() => {
    const handleInvalidation = () => void refreshAll(false);
    window.addEventListener("karey:appointments-invalidated", handleInvalidation);
    return () => window.removeEventListener("karey:appointments-invalidated", handleInvalidation);
  }, [refreshAll]);

  useEffect(() => {
    const interval = window.setInterval(() => void refreshAll(false), 30_000);
    return () => window.clearInterval(interval);
  }, [refreshAll]);

  // Initialize list view selected day when clinic timezone is set
  useEffect(() => {
    if (!listDateInitialized.current && clinicTimezone) {
      const today = new Date();
      const clinicDateKey = getClinicDateKey(today, clinicTimezone);
      setListViewSelectedDay(clinicDateKey);
      listDateInitialized.current = true;
    }
  }, [clinicTimezone]);

  // Compute selectedDayStr using clinic timezone instead of browser timezone
  const selectedDayStr = useMemo(() => {
    return getClinicDateKey(selectedDay, clinicTimezone);
  }, [selectedDay, clinicTimezone]);
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
  const timelineStart = selectedSchedule.open ? combineDateAndTime(selectedDayStr, selectedSchedule.open) : null;
  const timelineEnd = selectedSchedule.close ? combineDateAndTime(selectedDayStr, selectedSchedule.close) : null;
  const timelineMinutes = timelineStart && timelineEnd ? Math.max(0, diffMinutes(timelineStart, timelineEnd)) : 0;
  const gridHeight = Math.max(TIMELINE_SLOT_HEIGHT, timelineMinutes * TIMELINE_PIXELS_PER_MINUTE);

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

  const vetOptions = useMemo(() => {
    const start = formData.date && formData.time ? combineDateAndTime(formData.date, formData.time) : null;
    const end = formData.date && formData.endTime ? combineDateAndTime(formData.date, formData.endTime) : start ? addMinutes(start, DEFAULT_APPOINTMENT_DURATION_MINUTES) : null;
    if (!start || !end || end <= start) {
      return [{ value: "__NONE__", label: "Sin asignar" }, ...vets.map((vet) => ({ value: vet.id, label: vet.name }))];
    }
    const daySchedule = scheduleByDay.get(getWeekdayKey(start));
    const openAt = daySchedule?.open ? combineDateAndTime(formData.date, daySchedule.open) : null;
    const closeAt = daySchedule?.close ? combineDateAndTime(formData.date, daySchedule.close) : null;
    if (!daySchedule || daySchedule.closed || !openAt || !closeAt || start < openAt || end > closeAt) {
      return [{ value: "__NONE__", label: "Sin asignar" }];
    }
    const available = vets.filter((vet) => isVetAvailableForRange(appointments, vet.id, start, end, editing?.id));
    return [{ value: "__NONE__", label: "Sin asignar" }, ...available.map((vet) => ({ value: vet.id, label: vet.name }))];
  }, [appointments, editing?.id, formData.date, formData.endTime, formData.time, scheduleByDay, vets]);

  const currentUserIsVet = !!profile?.userId && vets.some((vet) => vet.id === profile.userId);
  const showSelfAssign = !!editing && formData.vetId === "__NONE__" && currentUserIsVet && canSelfAssignAppointments;
  const hideVetSelector = !!editing && formData.vetId === "__NONE__" && currentUserIsVet;

  async function assignEditingAppointmentToSelf() {
    if (!editing || !profile?.userId || !showSelfAssign) return;
    setSaving(true);
    try {
      const updated = await requestJson<AppointmentDTO>(`/api/appointments/${editing.id}/assign`, { method: "PATCH", body: JSON.stringify({ vetId: profile.userId }) });
      setFormData((current) => ({ ...current, vetId: updated.vetId ?? profile.userId }));
      setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(updated);
      invalidateAppointmentSurfaces({ appointmentId: updated.id, status: updated.status });
      showAlert("success", "Cita asignada", "La cita fue asignada a tu usuario.");
    } catch (error) {
      showAlert("destructive", "No se pudo asignar la cita", getErrorMessage(error));
    } finally { setSaving(false); }
  }

  const selectedPet = formData.petId ? petById.get(Number(formData.petId)) ?? null : null;
  const selectedClient = selectedPet ? clientById.get(selectedPet.clientId) ?? null : null;

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const start = safeDate(appointment.startAt);
          return start ? getClinicDateKey(start, clinicTimezone) === selectedDayStr : false;
        })
        .slice()
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [appointments, clinicTimezone, selectedDayStr]
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
      if (!start || !end || appointment.vetId !== (slotVetId === "__NONE__" ? null : slotVetId)) continue;

      for (const slot of timeSlots) {
        const slotStart = combineDateAndTime(selectedDayStr, slot);
        const slotEnd = addMinutes(slotStart, DEFAULT_APPOINTMENT_DURATION_MINUTES);
        if (rangesOverlap(slotStart, slotEnd, start, end)) {
          occupied.add(slot);
        }
      }
    }

    return occupied;
  }, [activeDayAppointments, selectedDayStr, slotVetId, timeSlots]);

  const isPastSlot = (slot: string) => combineDateAndTime(selectedDayStr, slot) <= new Date();
  const getTimelineSlotHeight = (slot: string) => {
    if (!timelineEnd) return TIMELINE_SLOT_HEIGHT;
    const remainingMinutes = diffMinutes(combineDateAndTime(selectedDayStr, slot), timelineEnd);
    return Math.max(1, Math.min(TIMELINE_SLOT_MINUTES, remainingMinutes) * TIMELINE_PIXELS_PER_MINUTE);
  };

  const appointmentLayouts = useMemo(() => {
    if (!timelineStart) return [];

    const entries = activeDayAppointments
      .map((appointment) => {
        const start = safeDate(appointment.startAt);
        const end = getAppointmentEnd(appointment);
        if (!start || !end) return null;

        const top = diffMinutes(timelineStart, start) * TIMELINE_PIXELS_PER_MINUTE;
        const availableHeight = Math.max(1, gridHeight - top - 4);
        const height = Math.max(
          Math.min(
            diffMinutes(start, end) * TIMELINE_PIXELS_PER_MINUTE - TIMELINE_CARD_GAP,
            availableHeight,
          ),
          1,
        );

        return {
          appointment,
          start,
          end,
          top,
          height,
        };
      })
      .filter((item): item is { appointment: AppointmentDTO; start: Date; end: Date; top: number; height: number } => Boolean(item))
      .sort((left, right) => left.start.getTime() - right.start.getTime());

    const layouts: Array<typeof entries[number] & { lane: number; laneCount: number }> = [];
    let cluster: typeof entries = [];
    let clusterEnd = 0;
    const flushCluster = () => {
      if (!cluster.length) return;
      const lanes: Date[] = [];
      const assigned = cluster.map((entry) => {
        let lane = lanes.findIndex((end) => end.getTime() <= entry.start.getTime());
        if (lane < 0) { lane = lanes.length; lanes.push(entry.end); } else { lanes[lane] = entry.end; }
        return { ...entry, lane };
      });
      layouts.push(...assigned.map((entry) => ({ ...entry, laneCount: lanes.length })));
      cluster = [];
      clusterEnd = 0;
    };
    for (const entry of entries) {
      if (cluster.length && entry.start.getTime() >= clusterEnd) flushCluster();
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.end.getTime());
    }
    flushCluster();
    return layouts;
  }, [activeDayAppointments, gridHeight, timelineStart]);
  const renderedTimelineHeight = Math.max(
    gridHeight,
    ...appointmentLayouts.map(({ top, height }) => top + height + 4),
  );

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
  // Filter appointments for list view by selected day and search text
  const listViewAppointments = useMemo(() => {
    const filtered = listViewSelectedDay
      ? filterAppointmentsByClinicDay(appointments, listViewSelectedDay, clinicTimezone)
      : appointments;

    // if (listViewSearchText.trim()) {
    //   const searchLower = listViewSearchText.toLowerCase();
    //   filtered = filtered.filter((apt) => {
    //     const searchText = [
    //       apt.pet?.name,
    //       apt.client?.fullName,
    //       apt.vet?.name,
    //       apt.reason,
    //       formatAppointmentType(apt.type),
    //       formatAppointmentStatus(apt.status),
    //     ]
    //       .filter(Boolean)
    //       .join(" ")
    //       .toLowerCase();
    //     return searchText.includes(searchLower);
    //   });
    // }

    return filtered
      .filter((apt) => listStatusFilter === "ALL" || apt.status === listStatusFilter)
      .map((apt) => ({
        ...apt,
        searchText: [
          apt.pet?.name,
          apt.client?.fullName,
          apt.vet?.name,
          apt.reason,
          formatAppointmentType(apt.type),
          formatAppointmentStatus(apt.status),
        ]
          .filter(Boolean)
          .join(" "),
      }))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [appointments, listViewSelectedDay, listStatusFilter, clinicTimezone]);

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

  function resetForm(day = selectedDay, time = "09:00", vetId = "__NONE__") {
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
      vetId,
      reason: "",
      notes: "",
    });
  }

  function openCreateAt(day: Date, time: string, vetId = slotVetId) {
    if (!canCreateAppointments) return;
    setEditing(null);
    resetForm(day, time, vetId);
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

  async function startEncounter(appointment: AppointmentDTO) {
    if (!canAttendAppointments || !canManageEncounter || appointment.status === "COMPLETED") return;
    setSaving(true);
    try {
      await requestJson(`/api/appointments/${appointment.id}`, { method: "PUT", body: JSON.stringify({ status: "IN_PROGRESS" }) });
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status: "IN_PROGRESS" } : item));
      invalidateAppointmentSurfaces({ appointmentId: appointment.id, status: "IN_PROGRESS" });
      setEncounter({ appointmentId: appointment.id, petId: appointment.petId, clientId: appointment.clientId });
      showAlert("success", "Atención iniciada", "La cita está en progreso.");
    } catch (error) {
      showAlert("destructive", "No se pudo iniciar la atención", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function finishEncounter() {
    if (!encounter) return;
    const target = appointments.find((appointment) => appointment.id === encounter.appointmentId && appointment.status === "IN_PROGRESS");
    if (target) {
      await requestJson(`/api/appointments/${target.id}`, { method: "PUT", body: JSON.stringify({ status: "COMPLETED" }) });
      setAppointments((current) => current.map((item) => item.id === target.id ? { ...item, status: "COMPLETED" } : item));
      invalidateAppointmentSurfaces({ appointmentId: target.id, status: "COMPLETED" });
    }
    setEncounter(null);
  }

  async function cancelAppointment() {
    if (!cancelTarget || saving) return;
    if (cancelTarget.status === "IN_PROGRESS" && !cancelReason.trim()) {
      showAlert("warning", "Motivo requerido", "Indica por qué se cancela la atención.");
      return;
    }
    setSaving(true);
    try {
      await requestJson(`/api/appointments/${cancelTarget.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED", ...(cancelTarget.status === "IN_PROGRESS" ? { reason: cancelReason.trim() } : {}) }) });
      setAppointments((current) => current.map((item) => item.id === cancelTarget.id ? { ...item, status: "CANCELLED" } : item));
      invalidateAppointmentSurfaces({ appointmentId: cancelTarget.id, status: "CANCELLED" });
      setCancelTarget(null);
      setCancelReason("");
      showAlert("success", "Cita cancelada correctamente");
    } catch (error) {
      showAlert("destructive", "No se pudo cancelar la cita", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function rescheduleAppointment() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime || saving) return;
    setSaving(true);
    try {
      const nextStart = combineDateAndTime(rescheduleDate, rescheduleTime);
      
      // If user provided explicit end time, use it; otherwise preserve duration
      let nextEnd: Date;
      if (rescheduleEndTime) {
        nextEnd = combineDateAndTime(rescheduleDate, rescheduleEndTime);
      } else {
        // Preserve the original appointment duration
        const originalStart = safeDate(rescheduleTarget.startAt);
        const originalEnd = safeDate(rescheduleTarget.endAt);
        let durationMinutes = DEFAULT_APPOINTMENT_DURATION_MINUTES;
        
        if (originalStart && originalEnd) {
          durationMinutes = diffMinutes(originalStart, originalEnd);
        }
        nextEnd = addMinutes(nextStart, durationMinutes);
      }
      
      // Validate end time
      if (nextEnd <= nextStart) {
        showAlert("warning", "Rango inválido", "La hora final debe ser posterior a la hora inicial.");
        setSaving(false);
        return;
      }
      
      const updated = await requestJson<AppointmentDTO>(`/api/appointments/${rescheduleTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({
          startAt: nextStart.toISOString(),
          endAt: nextEnd.toISOString(),
          status: "SCHEDULED",
        }),
      });
      
      setAppointments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      invalidateAppointmentSurfaces({ appointmentId: updated.id, status: updated.status });
      setRescheduleTarget(null);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleEndTime("");
      showAlert("success", "Cita reprogramada correctamente");
    } catch (error) {
      showAlert("destructive", "No se pudo reprogramar la cita", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function handleChange(event: FormFieldChangeEvent) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: String(value) }));
  }

  async function submitAppointment() {
    if ((editing && !canEditAppointments) || (!editing && !canCreateAppointments)) {
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

    if (startAt <= new Date()) {
      showAlert("warning", "Horario pasado", "No puedes agendar una cita en un horario que ya pasó.");
      return;
    }

    const endDate = formData.endTime
      ? combineDateAndTime(formData.date, formData.endTime)
      : addMinutes(startAt, DEFAULT_APPOINTMENT_DURATION_MINUTES);

    if (Number.isNaN(endDate.getTime())) {
      showAlert("warning", "Hora inválida", "La hora final no es válida.");
      return;
    }

    if (endDate <= startAt) {
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

    // Validate scheduling conflicts
    // Only check against active (non-cancelled, non-no-show) appointments
    const selectedVetId = formData.vetId === "__NONE__" ? null : formData.vetId;
    
    let conflictingAppointment: AppointmentDTO | undefined;
    
    if (selectedVetId) {
      // For assigned vet: check only against same vet's appointments
      conflictingAppointment = activeAppointments.find((appointment) => {
        if (editing && appointment.id === editing.id) return false;
        if (appointment.vetId !== selectedVetId) return false; // Different vet, no conflict

        const appointmentStart = safeDate(appointment.startAt);
        const appointmentEnd = getAppointmentEnd(appointment);
        if (!appointmentStart || !appointmentEnd) return false;

        return rangesOverlap(startAt, endDate, appointmentStart, appointmentEnd);
      });
      
      if (conflictingAppointment) {
        showAlert(
          "warning",
          "Horario ocupado",
          `${formData.vetId} ya tiene una cita en ese horario.`
        );
        return;
      }
    } else {
      // For unassigned appointment: only allow one unassigned per time slot
      // But don't block assigned vets
      conflictingAppointment = activeAppointments.find((appointment) => {
        if (editing && appointment.id === editing.id) return false;
        if (appointment.vetId !== null) return false; // Assigned vet, no conflict with unassigned

        const appointmentStart = safeDate(appointment.startAt);
        const appointmentEnd = getAppointmentEnd(appointment);
        if (!appointmentStart || !appointmentEnd) return false;

        return rangesOverlap(startAt, endDate, appointmentStart, appointmentEnd);
      });
      
      if (conflictingAppointment) {
        showAlert(
          "warning",
          "Horario ocupado",
          "Ya existe una cita sin asignar que se solapa con ese horario."
        );
        return;
      }
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
      await refreshAll(false);
      invalidateAppointmentSurfaces({ appointmentId: editing?.id, status: payload.status });
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
      await refreshAll(false);
      invalidateAppointmentSurfaces({ appointmentId: deleteTarget.id });
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
      cell: (row: AppointmentTableRow) => {
        const reminderBadge = getReminderBadge(row);

        return (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${STATUS_COLORS[row.status] ?? "border-border bg-muted/70 text-muted-foreground"} border`}>
              {formatAppointmentStatus(row.status)}
            </Badge>
            {reminderBadge ? (
              <Badge className={`${reminderBadge.className} border`}>
                {reminderBadge.label}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      header: "Acciones",
      cell: (row: AppointmentTableRow) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ver cita de ${row.pet?.name ?? "paciente"}`} onClick={() => setSelectedAppointment(row)}>
              <Eye className="h-4 w-4" />
            </Button>
          {canAttendAppointments && canManageEncounter && canPerformAction(row.status, "attend") ? <Button variant="outline" size="sm" onClick={() => void startEncounter(row)}>Atender</Button> : null}
          {canManageEncounter && row.status === "IN_PROGRESS" ? <Button variant="outline" size="sm" onClick={() => setEncounter({ appointmentId: row.id, petId: row.petId, clientId: row.clientId })}>Gestionar atención</Button> : null}
          {canRescheduleAppointments && canPerformAction(row.status, "reschedule") ? <Button variant="ghost" size="sm" onClick={() => { const start = safeDate(row.startAt) ?? new Date(); setRescheduleDate(format(start, "yyyy-MM-dd")); setRescheduleTime(format(start, "HH:mm")); setRescheduleTarget(row); }}>Reprogramar</Button> : null}
          {canCancelAppointments && canPerformAction(row.status, "cancel") && (row.status !== "IN_PROGRESS" || !hasAppointmentActivity(row)) ? <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setCancelReason(""); setCancelTarget(row); }}>{row.status === "IN_PROGRESS" ? "Cancelar atención" : "Cancelar"}</Button> : null}
          {canRescheduleAppointments && canPerformAction(row.status, "reschedule") ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : null}
          {canDeleteAppointments && canPerformAction(row.status, "reschedule") ? (
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
      <DataTableSkeleton />
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
            <Button
              onClick={() => openCreateAt(selectedDay, timeSlots[0] ?? "09:00")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cita
            </Button>
          ) : null
        }
        stats={[
          {
            label: "Del día",
            value: activeDayAppointments.length,
            hint: "Citas visibles",
          },
          {
            label: "Activas",
            value: activeDayAppointments.length,
            hint: "Sin canceladas ni no-show",
          },
          {
            label: "Veterinarios",
            value: vets.length,
            hint: "Disponibles para asignación",
          },
        ]}
      />
      <div className="hidden">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Agenda de Citas
          </h2>
          <p className="text-muted-foreground">
            Gestiona las citas según mascotas, clientes, veterinarios y horario
            de la clínica
          </p>
        </div>

        {canCreateAppointments ? (
          <Button
            onClick={() => openCreateAt(selectedDay, timeSlots[0] ?? "09:00")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        ) : null}
      </div>

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as "agenda" | "list")}
      >
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
                  disabled={(day) =>
                    Boolean(scheduleByDay.get(getWeekdayKey(day))?.closed)
                  }
                  components={{ DayButton: renderCalendarDayButton }}
                  className="rounded-xl w-full border border-border/70"
                />

                <div className="mt-4 border-t border-border/70 pt-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Tipos de cita
                  </p>
                  <div className="space-y-2">
                    {legendItems.map((item) => (
                      <LegendItem
                        key={item.label}
                        colorClass={item.color}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/70 bg-muted/45 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Horario del día</p>
                  <p>
                    {isClosedDay
                      ? "La clínica está cerrada este día"
                      : `${selectedSchedule.open ?? "09:00"} - ${selectedSchedule.close ?? "17:00"}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="app-panel-strong overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setSelectedDay((current) => addDays(current, -1))
                      }
                      className="rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="px-2">
                      <p className="font-semibold capitalize text-foreground">
                        {format(selectedDay, "EEEE, d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        {activeDayAppointments.length} cita(s)
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setSelectedDay((current) => addDays(current, 1))
                      }
                      className="rounded-xl"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedDay(startOfDay(new Date()))}
                    className="rounded-xl"
                  >
                    Hoy
                  </Button>
                </div>

                <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
                  <label
                    htmlFor="agenda-vet-lane"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Disponibilidad de:
                  </label>
                  <select
                    id="agenda-vet-lane"
                    value={slotVetId}
                    onChange={(event) => setSlotVetId(event.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="__NONE__">Sin asignar</option>
                    {vets.map((vet) => (
                      <option key={vet.id} value={vet.id}>
                        {vet.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isClosedDay ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay agenda disponible porque la clínica está cerrada este
                    día.
                  </div>
                ) : (
                  <div className="flex">
                    <div className="w-20 border-r border-border/70">
                      {timeSlots.map((slot) => (
                        <div
                          key={slot}
                          className="flex items-start px-4 py-3 text-sm text-muted-foreground"
                           style={{ height: `${getTimelineSlotHeight(slot)}px` }}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>

                    <div
                      className="relative flex-1"
                      style={{
                        height: `${renderedTimelineHeight}px`,
                      }}
                    >
                      <div className="absolute inset-0">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot}
                            className="border-b border-border/70 px-3 py-3"
                             style={{ height: `${getTimelineSlotHeight(slot)}px` }}
                          >
                            {appointmentLayouts.some(({ start, end }) =>
                              rangesOverlap(
                                combineDateAndTime(selectedDayStr, slot),
                                addMinutes(combineDateAndTime(selectedDayStr, slot), TIMELINE_SLOT_MINUTES),
                                start,
                                end,
                              )
                            ) ? null : !isPastSlot(slot) &&
                              !occupiedSlots.has(slot) &&
                              canCreateAppointments ? (
                                <button
                                  type="button"
                                  onClick={() => openCreateAt(selectedDay, slot)}
                                  className="flex h-full w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition hover:border-primary/30 hover:bg-muted/45"
                                >
                                  <Plus className="h-4 w-4" />
                                  Agendar cita
                                </button>
                              ) : (
                                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/30 text-xs text-muted-foreground">
                                  {isPastSlot(slot)
                                    ? "Horario pasado"
                                    : "Horario ocupado"}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>

                      <div className="pointer-events-none absolute inset-0 px-3">
                        {appointmentLayouts.map(
                          ({ appointment, top, height, lane, laneCount }) => {
                            const styles =
                              TYPE_STYLES[appointment.type] ??
                              TYPE_STYLES.OTHER;
                            const isHovered = hoveredAppointmentId === appointment.id;
                            const displayHeight = isHovered
                              ? Math.max(height, APPOINTMENT_HOVER_HEIGHT)
                              : height;
                            const displayTop = isHovered
                              ? Math.max(0, top + height - displayHeight)
                              : top;
                            const start = safeDate(appointment.startAt) ?? new Date();
                            const end = getAppointmentEnd(appointment) ?? addMinutes(start, DEFAULT_APPOINTMENT_DURATION_MINUTES);
                            const reminderBadge = getReminderBadge(appointment);
                            return (
                              <div
                                key={appointment.id}
                                className="pointer-events-auto absolute z-10 overflow-hidden rounded-2xl border border-border/80 bg-card/94 transition-[height,top,box-shadow] duration-150 cursor-pointer hover:z-30 hover:shadow-md"
                                style={{
                                  top: `${displayTop + 4}px`,
                                  height: `${displayHeight}px`,
                                  left: `calc(${lane * (100 / laneCount)}% + 0.25rem)`,
                                  width: `calc(${100 / laneCount}% - 0.5rem)`,
                                }}
                                onMouseEnter={() => setHoveredAppointmentId(appointment.id)}
                                onMouseLeave={() => setHoveredAppointmentId(null)}
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <div
                                  className={`absolute left-0 top-0 h-full w-1.5 ${styles.bar}`}
                                />

                                  <div className="flex h-full items-start justify-between gap-3 p-4 pl-5">
                                    <div className="min-h-0">
                                      <p className="font-semibold text-foreground">
                                        {appointment.pet?.name ?? "Paciente"}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
                                          {formatAppointmentType(appointment.type)}
                                        </span>
                                        <Badge className={`${STATUS_COLORS[appointment.status] ?? "border-border bg-muted/70 text-muted-foreground"} border`}>
                                          {formatAppointmentStatus(appointment.status)}
                                        </Badge>
                                        {reminderBadge ? <Badge className={`${reminderBadge.className} border`}>{reminderBadge.label}</Badge> : null}
                                      </div>
                                      <p className="mt-1 truncate text-sm text-muted-foreground">
                                        {appointment.client?.fullName ?? "Propietario"}
                                      </p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {appointment.reason || "Sin motivo registrado"}
                                      </p>
                                      <p className="mt-2 text-xs text-muted-foreground/80">
                                        {format(start, "HH:mm")} - {format(end, "HH:mm")}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground/80">
                                        Veterinario: {appointment.vet?.name ?? "Sin asignar"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {canUpdateAppointments && canManageEncounter && canPerformAction(appointment.status, "attend") ? (
                                        <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); void startEncounter(appointment); }}>
                                          Atender
                                        </Button>
                                      ) : null}
                                      {canManageEncounter && appointment.status === "IN_PROGRESS" ? (
                                        <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); setEncounter({ appointmentId: appointment.id, petId: appointment.petId, clientId: appointment.clientId }); }}>
                                          Gestionar atención
                                        </Button>
                                      ) : null}
                                      {canUpdateAppointments && canPerformAction(appointment.status, "reschedule") ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); openEdit(appointment); }}>
                                          <Edit className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                      ) : null}
                                      {canDeleteAppointments && canPerformAction(appointment.status, "reschedule") ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); askDelete(appointment); }}>
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="app-panel-strong">
            {/* <div className="border-b border-border/70 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                {listViewAppointments.length} registros encontrados
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por mascota, cliente, veterinario o motivo..."
                    value={listViewSearchText}
                    onChange={(e) => setListViewSearchText(e.target.value)}
                    className="h-10"
                  />
                </div>
                
              </div>
            </div> */}
            <DataTable
              columns={columns}
              data={listViewAppointments}
              searchKey="searchText"
              searchPlaceholder="Buscar por mascota, cliente o veterinario..."
              emptyMessage="No hay citas para esta fecha"
              actions={
                <div className="flex w-full gap-2 sm:w-auto">
                  <select value={listViewSelectedDay ? "DATE" : "ALL"} onChange={(event) => {
                    if (event.target.value === "ALL") setListViewSelectedDay("");
                  }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="ALL">Todas las fechas</option>
                    <option value="DATE" disabled>Elegir fecha abajo</option>
                  </select>
                  <Input
                    type="date"
                    value={listViewSelectedDay}
                    onChange={(e) => setListViewSelectedDay(e.target.value)}
                    className="h-10"
                  />
                  <select value={listStatusFilter} onChange={(event) => setListStatusFilter(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="ALL">Todos los estados</option>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              }
            />
          </div>
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
              <Button
                onClick={() => void submitAppointment()}
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {saving
                  ? "Guardando..."
                  : editing
                    ? "Guardar Cambios"
                    : "Crear Cita"}
              </Button>
            ) : null}
          </div>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitAppointment();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Paciente"
              name="petId"
              type="select"
              value={formData.petId}
              onChange={handleChange}
              options={petOptions}
              placeholder="Selecciona una mascota"
              required
            />

            <div className="space-y-2">
              <label className="text-[0.78rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Propietario
              </label>
              <div className="flex min-h-10 items-center rounded-lg border border-border/70 bg-muted/45 px-3 text-sm text-foreground">
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                {selectedClient?.fullName ?? "Se asigna según la mascota"}
              </div>
            </div>

            <FormField
              label="Tipo de Cita"
              name="type"
              type="select"
              value={formData.type}
              onChange={handleChange}
              options={typeOptions}
              placeholder="Selecciona un tipo"
              required
            />
            <FormField
              label="Estado"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={statusOptions}
              placeholder="Selecciona un estado"
              required
            />
            <FormField
              label="Fecha"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
            <FormField
              label="Hora inicial"
              name="time"
              type="time"
              value={formData.time}
              onChange={handleChange}
              required
            />
            <FormField
              label="Hora final"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleChange}
            />
            {showSelfAssign ? <div className="space-y-2"><Label>Veterinario</Label><Button type="button" variant="outline" onClick={() => void assignEditingAppointmentToSelf()} disabled={saving}>Asignarme esta cita</Button></div> : hideVetSelector ? null : <FormField
              label="Veterinario"
              name="vetId"
              type="select"
              value={formData.vetId}
              onChange={handleChange}
              options={vetOptions}
            />}
            <FormField
              label="Motivo"
              name="reason"
              type="textarea"
              value={formData.reason}
              onChange={handleChange}
              className="sm:col-span-2"
            />
            <FormField
              label="Notas"
              name="notes"
              type="textarea"
              value={formData.notes}
              onChange={handleChange}
              className="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>

      <ModalDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar cita"
        itemName={deleteTarget?.label}
        loading={deleting}
        onConfirm={handleDelete}
      />
      <Modal
        open={!!encounter}
        onClose={(open) => {
          if (!open) setEncounter(null);
        }}
        title="Atención clínica"
        size="xl"
      >
        {encounter ? (
          <EncounterWorkflow
            petId={encounter.petId}
            clientId={encounter.clientId}
            appointmentId={encounter.appointmentId}
            assignedVetId={
              appointments.find(
                (appointment) => appointment.id === encounter.appointmentId,
              )?.vetId
            }
            vets={vets}
            onFinish={() => void finishEncounter()}
            onViewInvoice={(invoiceId) => router.push(`/invoices/${invoiceId}`)}
            onBilling={() =>
              router.push(
                `/invoices/new?clientId=${encounter.clientId}&petId=${encounter.petId}&appointmentId=${encounter.appointmentId}`,
              )
            }
          />
        ) : null}
      </Modal>
      <ModalDelete
        open={!!cancelTarget && cancelTarget.status !== "IN_PROGRESS"}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancelar cita"
        itemName={cancelTarget?.pet?.name}
        description="La cita quedará marcada como cancelada."
        dangerText="Cancelar cita"
        loading={saving}
        onConfirm={cancelAppointment}
      />
      <Dialog
        open={!!cancelTarget && cancelTarget.status === "IN_PROGRESS"}
        onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelReason(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar atención</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">La atención no tiene actividad clínica registrada. Indica el motivo para cancelarla.</p>
          <div className="space-y-2">
            <Label htmlFor="cancel-in-progress-reason">Motivo</Label>
            <Input id="cancel-in-progress-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ej. Se inició por error" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>Volver</Button>
            <Button variant="destructive" onClick={() => void cancelAppointment()} disabled={saving || !cancelReason.trim()}>{saving ? "Cancelando..." : "Cancelar atención"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleTarget(null);
            setRescheduleDate("");
            setRescheduleTime("");
            setRescheduleEndTime("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar cita</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Nueva fecha</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">Hora inicial</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-end-time">Hora final (opcional)</Label>
              <Input
                id="reschedule-end-time"
                type="time"
                value={rescheduleEndTime}
                onChange={(event) => setRescheduleEndTime(event.target.value)}
                placeholder="Se preservará la duración original"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleTarget(null);
                setRescheduleDate("");
                setRescheduleTime("");
                setRescheduleEndTime("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void rescheduleAppointment()}
              disabled={saving || !rescheduleDate || !rescheduleTime}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        canEdit={canEditAppointments}
        canAttend={canAttendAppointments}
        canManage={canManageEncounter}
        canReschedule={canRescheduleAppointments}
        canCancel={canCancelAppointments}
        onEdit={(appointment) => { setSelectedAppointment(null); openEdit(appointment); }}
        onAttend={(appointment) => { setSelectedAppointment(null); void startEncounter(appointment); }}
        onManage={(appointment) => { setSelectedAppointment(null); setEncounter({ appointmentId: appointment.id, petId: appointment.petId, clientId: appointment.clientId }); }}
        onReschedule={(appointment) => { setSelectedAppointment(null); const start = safeDate(appointment.startAt) ?? new Date(); setRescheduleDate(format(start, "yyyy-MM-dd")); setRescheduleTime(format(start, "HH:mm")); setRescheduleTarget(appointment); }}
        onCancel={(appointment) => { setSelectedAppointment(null); setCancelReason(""); setCancelTarget(appointment); }}
      />
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
