"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";

import {
  Plus,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

import { addDays, format, isToday, isTomorrow, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

import DataTable from "@/components/shared/Datatable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import { safeDate } from "@/lib/utility";

type PetDTO = any;
type ClientDTO = any;

type AppointmentDTO = {
  id: number;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  type: string;
  status: string;
  petId: number;
  clientId?: number | null;
  veterinarian?: string | null;
  reason?: string | null;
};

type AptFormState = {
  petId?: string; // select => string
  type?: string;
  date?: string;
  time?: string;
  status?: string;
  veterinarian?: string;
  reason?: string;
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} failed`);
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `POST ${url} failed`);
  }
  return res.json();
}

async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `PUT ${url} failed`);
  }
  return res.json();
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `DELETE ${url} failed`);
  }
}

function buildTimeSlots(startHour = 9, endHour = 16, stepMinutes = 30) {
  const out: string[] = [];
  const start = startHour * 60;
  const end = endHour * 60;
  for (let m = start; m <= end; m += stepMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
}

// Ajusta según tus enums
const speciesEmoji: Record<string, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  OTHER: "🐾",
  Perro: "🐕",
  Gato: "🐱",
  Ave: "🦜",
  Conejo: "🐰",
  Otro: "🐾",
};

// Colores por tipo (leyenda + barra izquierda)
const typeStyles: Record<string, { dot: string; badge: string; bar: string }> = {
  Consulta: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  Vacunación: { dot: "bg-sky-500", badge: "bg-sky-100 text-sky-700", bar: "bg-sky-500" },
  Cirugía: { dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700", bar: "bg-rose-500" },
  Estética: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
  Chequeo: { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700", bar: "bg-violet-500" },
};

const typeOptions = [
  { value: "Consulta", label: "Consulta" },
  { value: "Vacunación", label: "Vacunación" },
  { value: "Cirugía", label: "Cirugía" },
  { value: "Estética", label: "Estética" },
  { value: "Chequeo", label: "Chequeo" },
  { value: "Control", label: "Control" },
  { value: "Baño/Peluquería", label: "Baño/Peluquería" },
  { value: "Emergencia", label: "Emergencia" },
  { value: "Desparasitación", label: "Desparasitación" },
  { value: "Otro", label: "Otro" },
];

const statusOptions = [
  { value: "Programada", label: "Programada" },
  { value: "Confirmada", label: "Confirmada" },
  { value: "En Espera", label: "En Espera" },
  { value: "Atendida", label: "Atendida" },
  { value: "Cancelada", label: "Cancelada" },
  { value: "No Asistió", label: "No Asistió" },
];

const statusColors: Record<string, string> = {
  Programada: "bg-blue-100 text-blue-700 border-blue-200",
  Confirmada: "bg-green-100 text-green-700 border-green-200",
  "En Espera": "bg-yellow-100 text-yellow-700 border-yellow-200",
  Atendida: "bg-teal-100 text-teal-700 border-teal-200",
  Cancelada: "bg-red-100 text-red-700 border-red-200",
  "No Asistió": "bg-slate-100 text-slate-700 border-slate-200",
};

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}

export default function AppointmentsPage() {
  const [view, setView] = useState<"agenda" | "list">("agenda");
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [pets, setPets] = useState<PetDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentDTO | null>(null);
  const [formData, setFormData] = useState<AptFormState>({ status: "Programada" });

  const selectedDayStr = useMemo(() => format(selectedDay, "yyyy-MM-dd"), [selectedDay]);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [apts, petsRes, clientsRes] = await Promise.all([
        apiGet<AppointmentDTO[]>("/api/appointments"),
        apiGet<PetDTO[]>("/api/pets"),
        apiGet<ClientDTO[]>("/api/clients"),
      ]);

      setAppointments(apts);
      setPets(petsRes);
      setClients(clientsRes);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Error cargando agenda");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const petOptions = useMemo(
    () =>
      pets.map((p: any) => ({
        value: String(p.id),
        label: `${speciesEmoji[p.species] || "🐾"} ${p.name}`,
      })),
    [pets]
  );

  const getPet = (id: number) => pets.find((p: any) => Number(p.id) === Number(id));
  const getClient = (id?: number | null) => clients.find((c: any) => Number(c.id) === Number(id));

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDayStr)
      .slice()
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [appointments, selectedDayStr]);

  const timeSlots = useMemo(() => buildTimeSlots(9, 16, 30), []);
  const aptByTime = useMemo(() => {
    const map = new Map<string, AppointmentDTO>();
    for (const a of dayAppointments) {
      if (a.time) map.set(a.time, a);
    }
    return map;
  }, [dayAppointments]);

  function openCreateAt(day: Date, time: string) {
    setEditing(null);
    setFormData({
      petId: "",
      type: "",
      date: format(day, "yyyy-MM-dd"),
      time,
      status: "Programada",
      veterinarian: "",
      reason: "",
    });
    setModalOpen(true);
  }

  function openEdit(apt: AppointmentDTO) {
    setEditing(apt);
    setFormData({
      petId: String(apt.petId),
      type: apt.type ?? "",
      date: apt.date,
      time: apt.time,
      status: apt.status ?? "Programada",
      veterinarian: apt.veterinarian ?? "",
      reason: apt.reason ?? "",
    });
    setModalOpen(true);
  }

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e: any) {
    e.preventDefault();

    // payload para API (coerce)
    const payload = {
      petId: formData.petId ? Number(formData.petId) : undefined,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      status: formData.status,
      veterinarian: formData.veterinarian || null,
      reason: formData.reason || null,
    };

    // limpieza
    Object.keys(payload).forEach((k) => (payload as any)[k] === undefined && delete (payload as any)[k]);

    try {
      if (editing) {
        await apiPut(`/api/appointments/${editing.id}`, payload);
      } else {
        await apiPost(`/api/appointments`, payload);
      }
      setModalOpen(false);
      setEditing(null);
      setFormData({ status: "Programada" });
      await refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Error guardando cita");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta cita?")) return;
    try {
      await apiDelete(`/api/appointments/${id}`);
      await refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Error eliminando cita");
    }
  }

  const columns = [
    {
      header: "Fecha/Hora",
      cell: (row: any) => {
        const start = safeDate(row.startAt);
        if (!start) return <span className="text-slate-400">-</span>;

        const dayLabel = isToday(start
            ? "Hoy"
            : isTomorrow(start)
            ? "Mañana"
            : format(start, "EEE d MMM", { locale: es }));

        const timeLabel = format(start, "HH:mm");

        return (
            <div>
            <p className="font-semibold text-slate-800">{dayLabel}</p>
            <p className="text-sm text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeLabel}
            </p>
            </div>
        );
      },
    },
    {
      header: "Paciente",
      cell: (row: AppointmentDTO) => {
        const pet = getPet(row.petId);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-xl">
              {pet ? speciesEmoji[pet.species] : "🐾"}
            </div>
            <span className="font-medium text-slate-800">{pet?.name || "-"}</span>
          </div>
        );
      },
    },
    {
      header: "Propietario",
      cell: (row: AppointmentDTO) => {
        const pet = getPet(row.petId);
        const client = getClient(row.clientId ?? pet?.clientId ?? pet?.client_id);
        return client ? <span className="text-slate-600">{client.fullName ?? client.full_name}</span> : <span className="text-slate-400">-</span>;
      },
    },
    { header: "Tipo", accessorKey: "type" },
    {
      header: "Estado",
      cell: (row: AppointmentDTO) => (
        <Badge className={`${statusColors[row.status] ?? "bg-slate-100 text-slate-700"} border`}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      cell: (row: AppointmentDTO) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
            <Edit className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const legendItems = [
    { label: "Consulta", color: typeStyles.Consulta.dot },
    { label: "Vacunación", color: typeStyles["Vacunación"].dot },
    { label: "Cirugía", color: typeStyles["Cirugía"].dot },
    { label: "Estética", color: typeStyles["Estética"].dot },
    { label: "Chequeo", color: typeStyles["Chequeo"].dot },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-slate-800 font-semibold">No se pudo cargar la agenda</p>
        <p className="text-slate-500 text-sm mt-1">{error}</p>
        <Button className="mt-4" onClick={refreshAll}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agenda de Citas</h2>
          <p className="text-slate-500">Gestiona las citas de tu clínica</p>
        </div>

        <Button
          onClick={() => openCreateAt(selectedDay, "09:00")}
          className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva Cita
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        {/* Agenda */}
        <TabsContent value="agenda" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Calendar + legend */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={(d) => d && setSelectedDay(startOfDay(d))}
                  className="rounded-xl"
                />

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Tipos de Cita</p>
                  <div className="space-y-2">
                    {legendItems.map((it) => (
                      <LegendItem key={it.label} colorClass={it.color} label={it.label} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: day timeline */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDay((d) => addDays(d, -1))}
                      className="rounded-xl"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="px-2">
                      <p className="font-semibold text-slate-900 capitalize">
                        {format(selectedDay, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" /> {dayAppointments.length} cita(s)
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDay((d) => addDays(d, 1))}
                      className="rounded-xl"
                    >
                      <ChevronRight className="w-4 h-4" />
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

                <div className="divide-y divide-slate-100">
                  {timeSlots.map((t) => {
                    const apt = aptByTime.get(t);

                    if (!apt) {
                      return (
                        <div key={t} className="flex">
                          <div className="w-20 px-4 py-5 text-sm text-slate-500 flex items-center border-r border-slate-100">
                            {t}
                          </div>
                          <div className="flex-1 p-3">
                            <button
                              type="button"
                              onClick={() => openCreateAt(selectedDay, t)}
                              className="w-full h-14 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-center gap-2 text-slate-500"
                            >
                              <Plus className="w-4 h-4" />
                              Agendar cita
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const pet = getPet(apt.petId);
                    const client = getClient(apt.clientId ?? pet?.clientId ?? pet?.client_id);

                    const styles = typeStyles[apt.type] ?? {
                      dot: "bg-slate-400",
                      badge: "bg-slate-100 text-slate-700",
                      bar: "bg-slate-400",
                    };

                    return (
                      <div key={t} className="flex">
                        <div className="w-20 px-4 py-5 text-sm text-slate-500 flex items-center border-r border-slate-100">
                          {t}
                        </div>

                        <div className="flex-1 p-3">
                          <div
                            className="relative rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden"
                            onClick={() => openEdit(apt)}
                          >
                            <div className={`absolute left-0 top-0 h-full w-1.5 ${styles.bar}`} />

                            <div className="p-4 pl-5 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900 truncate">
                                    {pet?.name ?? "Paciente"}
                                  </p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                                    {apt.type}
                                  </span>
                                </div>

                                <p className="text-sm text-slate-500 truncate">
                                  {client?.fullName ?? client?.full_name ?? "Propietario"} • {apt.status}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(apt);
                                  }}
                                >
                                  <Edit className="w-4 h-4 text-slate-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(apt.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </TabsContent>

        {/* List */}
        <TabsContent value="list" className="mt-6">
          <DataTable
            columns={columns}
            data={appointments}
            searchKey="type"
            searchPlaceholder="Buscar cita..."
            emptyMessage="No hay citas registradas"
          />
        </TabsContent>
      </Tabs>

      {/* Modal */}
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
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              {editing ? "Guardar Cambios" : "Crear Cita"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Paciente"
              name="petId"
              type="select"
              value={formData.petId}
              onChange={handleChange}
              options={petOptions}
              required
            />

            <FormField
              label="Tipo de Cita"
              name="type"
              type="select"
              value={formData.type}
              onChange={handleChange}
              options={typeOptions}
              required
            />

            <FormField label="Fecha" name="date" type="date" value={formData.date} onChange={handleChange} required />
            <FormField label="Hora" name="time" type="time" value={formData.time} onChange={handleChange} required />

            <FormField
              label="Estado"
              name="status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={statusOptions}
            />

            <FormField label="Veterinario" name="veterinarian" value={formData.veterinarian} onChange={handleChange} />

            <FormField
              label="Motivo"
              name="reason"
              type="textarea"
              value={formData.reason}
              onChange={handleChange}
              className="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
