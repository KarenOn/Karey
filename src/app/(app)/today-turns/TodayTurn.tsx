// src/app/(app)/today-turns/today-turns-client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Clock,
  Phone,
  Bell,
  CheckCircle2,
  Dog,
  Cat,
  Bird,
  Rabbit,
  PawPrint,
  Scissors,
  Droplets,
  Syringe,
  Heart,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Trash2,
  RefreshCcw,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Check, ChevronsUpDown, UserRound, X } from "lucide-react";


/** =========================
 * Types (client-safe)
 * ========================= */

export type PetOption = {
  id: number;
  name: string;
  species: "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";
  client: { id: number; fullName: string; phone: string | null };
};

export type TodayTurnStatus = "WAITING" | "IN_PROGRESS" | "READY" | "DELIVERED";
export type TodayTurnService = "GROOMING" | "BATH" | "SURGERY" | "HOSPITALIZATION" | "OTHER";

export type TodayTurnDTO = {
  id: number;

  petId: number;
  clientId: number;

  petName: string;
  species: PetOption["species"];

  ownerName: string;
  ownerPhone: string | null;

  service: TodayTurnService;
  serviceName: string;

  notes?: string | null;
  estimatedDuration: number; // mins
  arrivalAt: string; // ISO

  status: TodayTurnStatus;

  notified: boolean;
  notifiedAt?: string | null;
};

export type TodayTurnCreateDTO = {
  petId: number;
  clientId: number;
  petName?: string;
  species?: PetOption["species"];
  ownerName?: string;
  ownerPhone?: string | null;
  service: TodayTurnService;
  serviceName: string;
  notes?: string | null;
  estimatedDuration: number;
  // opcional: arrivalAt si quisieras setearlo desde el cliente
};

/** =========================
 * API helpers (fetch)
 * ========================= */

async function apiListTodayTurns(date: string): Promise<TodayTurnDTO[]> {
  const res = await fetch(`/api/today-turns?date=${encodeURIComponent(date)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error listando turnos de hoy");
  return res.json();
}

async function apiCreateTodayTurn(data: TodayTurnCreateDTO): Promise<TodayTurnDTO> {
  const res = await fetch(`/api/today-turns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando turno");
  return res.json();
}

async function apiUpdateTodayTurnStatus(id: number, status: TodayTurnStatus): Promise<TodayTurnDTO> {
  const res = await fetch(`/api/today-turns/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Error cambiando estado del turno");
  return res.json();
}

async function apiNotifyTodayTurn(id: number): Promise<TodayTurnDTO> {
  const res = await fetch(`/api/today-turns/${id}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Error notificando al dueño");
  return res.json();
}

async function apiDeleteTodayTurn(id: number): Promise<void> {
  const res = await fetch(`/api/today-turns/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando turno");
}

/** =========================
 * UI Config
 * ========================= */

const serviceTypes: Array<{
  value: TodayTurnService;
  label: string;
  icon: React.ElementType;
  color: string;
  defaultName: string;
}> = [
  { value: "GROOMING", label: "Peluquería", icon: Scissors, color: "bg-pink-500", defaultName: "Baño y Corte" },
  { value: "BATH", label: "Baño", icon: Droplets, color: "bg-blue-500", defaultName: "Baño Completo" },
  { value: "SURGERY", label: "Cirugía", icon: Syringe, color: "bg-red-500", defaultName: "Procedimiento Quirúrgico" },
  { value: "HOSPITALIZATION", label: "Hospitalización", icon: Heart, color: "bg-amber-500", defaultName: "Hospitalización" },
  { value: "OTHER", label: "Otro", icon: Sparkles, color: "bg-primary", defaultName: "Otro Servicio" },
];

const statusConfig: Record<
  TodayTurnStatus,
  {
    label: string;
    color: string; // used for small badge / stat card
    columnBg: string;
    accentRgb: string; // for column border color
  }
> = {
  WAITING: {
    label: "En espera",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    columnBg: "bg-slate-50",
    accentRgb: "rgb(148 163 184)", // slate-400
  },
  IN_PROGRESS: {
    label: "En proceso",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    columnBg: "bg-amber-50",
    accentRgb: "rgb(251 191 36)", // amber-400
  },
  READY: {
    label: "Listo",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    columnBg: "bg-emerald-50",
    accentRgb: "rgb(16 185 129)", // emerald-500
  },
  DELIVERED: {
    label: "Entregado",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    columnBg: "bg-blue-50",
    accentRgb: "rgb(96 165 250)", // blue-400
  },
};

const speciesIcons: Record<PetOption["species"], React.ElementType> = {
  DOG: Dog,
  CAT: Cat,
  BIRD: Bird,
  RABBIT: Rabbit,
  OTHER: PawPrint,
};

/** =========================
 * Main Component
 * ========================= */

export default function TodayTurnsClient({
  initialTurns,
  pets,
  date,
}: {
  initialTurns: TodayTurnDTO[];
  pets: PetOption[];
  date: string; // YYYY-MM-DD
}) {
  const [turns, setTurns] = useState<TodayTurnDTO[]>(initialTurns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notifyDialog, setNotifyDialog] = useState<TodayTurnDTO | null>(null);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; title: string; desc?: string } | null>(null);

  // tick para recalcular "tiempo transcurrido"
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const columns: { status: TodayTurnStatus; title: string }[] = useMemo(
    () => [
      { status: "WAITING", title: "En Espera" },
      { status: "IN_PROGRESS", title: "En Proceso" },
      { status: "READY", title: "Listo para Recoger" },
      { status: "DELIVERED", title: "Entregado" },
    ],
    []
  );

  const petOptions = useMemo(
    () =>
      pets.map((p) => ({
        value: String(p.id), // 👈 importante: Select en shadcn usa strings
        label: `${p.name} • ${p.client.fullName}`,
      })),
    [pets]
  );

  const refresh = async () => {
    setLoading(true);
    setAlertMsg(null);
    try {
      const fresh = await apiListTodayTurns(date);
      setTurns(fresh);
      setAlertMsg({ type: "success", title: "Actualizado", desc: "Turnos cargados correctamente." });
    } catch (e: any) {
      setAlertMsg({ type: "error", title: "Error", desc: e?.message ?? "No se pudieron cargar los turnos." });
    } finally {
      setLoading(false);
    }
  };

  const moveToNextStatus = async (turn: TodayTurnDTO) => {
    const statusOrder: TodayTurnStatus[] = ["WAITING", "IN_PROGRESS", "READY", "DELIVERED"];
    const currentIndex = statusOrder.indexOf(turn.status);
    if (currentIndex < 0 || currentIndex >= statusOrder.length - 1) return;

    const newStatus = statusOrder[currentIndex + 1];

    setBusyId(turn.id);
    setAlertMsg(null);
    try {
      const updated = await apiUpdateTodayTurnStatus(turn.id, newStatus);
      setTurns((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

      if (newStatus === "READY") setNotifyDialog(updated);

      setAlertMsg({ type: "success", title: "Estado actualizado", desc: `Ahora está: ${statusConfig[newStatus].label}` });
    } catch (e: any) {
      setAlertMsg({ type: "error", title: "Error", desc: e?.message ?? "No se pudo cambiar el estado." });
    } finally {
      setBusyId(null);
    }
  };

  const notifyOwner = async (turn: TodayTurnDTO) => {
    setBusyId(turn.id);
    setAlertMsg(null);
    try {
      const updated = await apiNotifyTodayTurn(turn.id);
      setTurns((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setNotifyDialog(null);
      setAlertMsg({ type: "success", title: "Notificado", desc: "Marcado como notificado." });
    } catch (e: any) {
      setAlertMsg({ type: "error", title: "Error", desc: e?.message ?? "No se pudo notificar." });
    } finally {
      setBusyId(null);
    }
  };

  const removeTurn = async (turn: TodayTurnDTO) => {
    if (!confirm(`¿Eliminar el turno de "${turn.petName}"?`)) return;
    setBusyId(turn.id);
    setAlertMsg(null);
    try {
      await apiDeleteTodayTurn(turn.id);
      setTurns((prev) => prev.filter((t) => t.id !== turn.id));
      setAlertMsg({ type: "success", title: "Eliminado", desc: "Turno eliminado correctamente." });
    } catch (e: any) {
      setAlertMsg({ type: "error", title: "Error", desc: e?.message ?? "No se pudo eliminar." });
    } finally {
      setBusyId(null);
    }
  };

  const addNewTurn = async (data: TodayTurnCreateDTO) => {
    setLoading(true);
    setAlertMsg(null);
    try {
      const created = await apiCreateTodayTurn(data);
      setTurns((prev) => [created, ...prev].sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt)));
      setDialogOpen(false);
      setAlertMsg({ type: "success", title: "Creado", desc: "Turno agregado." });
    } catch (e: any) {
      setAlertMsg({ type: "error", title: "Error", desc: e?.message ?? "No se pudo crear el turno." });
    } finally {
      setLoading(false);
    }
  };

  const getTimeElapsed = (arrivalAtISO: string) => {
    // tick se usa solo para re-render periódicamente
    void tick;

    const arrivalTime = new Date(arrivalAtISO);
    const now = new Date();
    const diff = Math.floor((now.getTime() - arrivalTime.getTime()) / 1000 / 60);
    if (diff < 1) return `0 min`;
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turno de Hoy</h1>
          <p className="text-muted-foreground">Gestiona las mascotas que llegan sin cita previa</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={refresh} disabled={loading}>
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refrescar
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
                <Plus className="w-5 h-5" />
                <span>Agregar Turno</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Turno</DialogTitle>
              </DialogHeader>
              <AddTurnForm pets={pets} petOptions={petOptions} onSubmit={addNewTurn} onCancel={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert */}
      {alertMsg && (
        <Alert className={cn(alertMsg.type === "error" ? "border-red-200" : "border-emerald-200")}>
          <AlertTitle>{alertMsg.title}</AlertTitle>
          {alertMsg.desc && <AlertDescription>{alertMsg.desc}</AlertDescription>}
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {columns.map((col) => {
          const count = turns.filter((t) => t.status === col.status).length;
          const config = statusConfig[col.status];
          return (
            <div key={col.status} className={cn("rounded-2xl p-4 border-2 transition-all", config.color)}>
              <div className="text-3xl font-bold">{count}</div>
              <div className="text-sm font-medium opacity-80">{col.title}</div>
            </div>
          );
        })}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const columnTurns = turns.filter((t) => t.status === col.status);
          const config = statusConfig[col.status];

          return (
            <div key={col.status} className="flex flex-col">
              <div
                className={cn("rounded-t-2xl p-4 border-b-4", config.columnBg)}
                style={{ borderBottomColor: config.accentRgb }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{col.title}</h3>
                  <Badge variant="secondary" className="rounded-full">
                    {columnTurns.length}
                  </Badge>
                </div>
              </div>

              <div className={cn("flex-1 rounded-b-2xl p-3 space-y-3 min-h-[400px]", config.columnBg)}>
                {columnTurns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground opacity-50">
                    <PawPrint className="w-8 h-8 mb-2" />
                    <span className="text-sm">Sin mascotas</span>
                  </div>
                ) : (
                  columnTurns.map((turn) => (
                    <TurnCard
                      key={turn.id}
                      turn={turn}
                      onMoveNext={() => moveToNextStatus(turn)}
                      onNotify={() => setNotifyDialog(turn)}
                      onDelete={() => removeTurn(turn)}
                      getTimeElapsed={getTimeElapsed}
                      busy={busyId === turn.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notify Dialog */}
      <Dialog open={!!notifyDialog} onOpenChange={() => setNotifyDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              Notificar al Dueño
            </DialogTitle>
          </DialogHeader>

          {notifyDialog && (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-foreground">{notifyDialog.petName} está listo</p>
                <p className="text-sm text-muted-foreground">Servicio: {notifyDialog.serviceName}</p>
              </div>

              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-1">{notifyDialog.ownerName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {notifyDialog.ownerPhone ?? "-"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 bg-transparent"
                  disabled={!notifyDialog.ownerPhone || busyId === notifyDialog.id}
                  onClick={() => {
                    if (!notifyDialog.ownerPhone) return;
                    window.open(`tel:${notifyDialog.ownerPhone}`);
                    notifyOwner(notifyDialog);
                  }}
                >
                  <Phone className="w-4 h-4" />
                  Llamar
                </Button>

                <Button
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  disabled={!notifyDialog.ownerPhone || busyId === notifyDialog.id}
                  onClick={() => {
                    if (!notifyDialog.ownerPhone) return;
                    const digits = notifyDialog.ownerPhone.replace(/\D/g, "");
                    window.open(
                      `https://wa.me/${digits}?text=${encodeURIComponent(
                        `¡Hola ${notifyDialog.ownerName}! Le informamos que ${notifyDialog.petName} ya está listo/a para ser recogido/a. El servicio de ${notifyDialog.serviceName} ha sido completado. ¡Lo esperamos! - VetCare`
                      )}`
                    );
                    notifyOwner(notifyDialog);
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
              </div>

              <Button variant="ghost" className="w-full" onClick={() => setNotifyDialog(null)}>
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** =========================
 * Turn Card
 * ========================= */

function TurnCard({
  turn,
  onMoveNext,
  onNotify,
  onDelete,
  getTimeElapsed,
  busy,
}: {
  turn: TodayTurnDTO;
  onMoveNext: () => void;
  onNotify: () => void;
  onDelete: () => void;
  getTimeElapsed: (arrivalAtISO: string) => string;
  busy: boolean;
}) {
  const SpeciesIcon = speciesIcons[turn.species] ?? PawPrint;
  const serviceType = serviceTypes.find((s) => s.value === turn.service);
  const ServiceIcon = serviceType?.icon || Sparkles;

  return (
    <Card className="p-4 shadow-sm hover:shadow-md transition-all border-0 bg-card">
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", serviceType?.color || "bg-primary")}>
          <SpeciesIcon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{turn.petName}</h4>
          <p className="text-sm text-muted-foreground truncate">{turn.ownerName}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="w-3 h-3" />
            {getTimeElapsed(turn.arrivalAt)}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDelete}
            disabled={busy}
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Service badge */}
      <div className="flex items-center gap-2 mb-3">
        <Badge
          variant="secondary"
          className={cn(
            "gap-1.5 rounded-lg",
            turn.service === "GROOMING" && "bg-pink-100 text-pink-700",
            turn.service === "BATH" && "bg-blue-100 text-blue-700",
            turn.service === "SURGERY" && "bg-red-100 text-red-700",
            turn.service === "HOSPITALIZATION" && "bg-amber-100 text-amber-700"
          )}
        >
          <ServiceIcon className="w-3 h-3" />
          {turn.serviceName}
        </Badge>

        <Badge className={cn("border", statusConfig[turn.status].color)} variant="outline">
          {statusConfig[turn.status].label}
        </Badge>
      </div>

      {/* Notes */}
      {turn.notes && (
        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2 mb-3 line-clamp-2">
          {turn.notes}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {turn.status === "READY" && !turn.notified && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-transparent"
            onClick={onNotify}
            disabled={busy}
          >
            <Bell className="w-3.5 h-3.5" />
            Avisar
          </Button>
        )}

        {turn.status === "READY" && turn.notified && (
          <Badge className="flex-1 justify-center gap-1.5 bg-emerald-100 text-emerald-700 border-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Notificado
          </Badge>
        )}

        {turn.status !== "DELIVERED" && (
          <Button
            size="sm"
            className={cn("gap-1.5", turn.status === "READY" ? "flex-1" : "w-full")}
            onClick={onMoveNext}
            disabled={busy}
          >
            {turn.status === "WAITING" && "Iniciar"}
            {turn.status === "IN_PROGRESS" && "Completar"}
            {turn.status === "READY" && "Entregar"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}

/** =========================
 * Add Turn Form
 * ========================= */

// function AddTurnForm({
//   pets,
//   petOptions,
//   onSubmit,
//   onCancel,
// }: {
//   pets: PetOption[];
//   petOptions: Array<{ value: string; label: string }>;
//   onSubmit: (data: TodayTurnCreateDTO) => void;
//   onCancel: () => void;
// }) {
//   const [petId, setPetId] = useState<string>(""); // Select string
//   const [service, setService] = useState<TodayTurnService>("GROOMING");
//   const [serviceName, setServiceName] = useState<string>(serviceTypes.find((s) => s.value === "GROOMING")?.defaultName ?? "");
//   const [notes, setNotes] = useState<string>("");
//   const [estimatedDuration, setEstimatedDuration] = useState<number>(60);

//   const selectedPet = useMemo(() => {
//     const id = Number(petId);
//     if (!id) return null;
//     return pets.find((p) => p.id === id) ?? null;
//   }, [petId, pets]);

//   const handleServiceChange = (value: TodayTurnService) => {
//     setService(value);
//     const def = serviceTypes.find((s) => s.value === value)?.defaultName ?? "";
//     setServiceName(def);
//   };

//   const canSubmit = !!selectedPet && !!serviceName.trim() && estimatedDuration > 0;

//   return (
//     <form
//       onSubmit={(e) => {
//         e.preventDefault();
//         if (!selectedPet) return;

//         onSubmit({
//           petId: selectedPet.id,
//           clientId: selectedPet.client.id,
//           service,
//           serviceName: serviceName.trim(),
//           notes: notes.trim() ? notes.trim() : null,
//           estimatedDuration: Number(estimatedDuration),
//         });
//       }}
//       className="space-y-4"
//     >
//       <div className="space-y-2">
//         <Label>Paciente</Label>
//         <Select value={petId} onValueChange={setPetId}>
//           <SelectTrigger className="bg-white">
//             <SelectValue placeholder="Selecciona una mascota..." />
//           </SelectTrigger>
//           <SelectContent>
//             {petOptions.map((opt) => (
//               <SelectItem key={opt.value} value={opt.value}>
//                 {opt.label}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         {selectedPet && (
//           <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2">
//             <div className="flex items-center justify-between">
//               <span className="font-medium text-foreground">{selectedPet.client.fullName}</span>
//               <span>{selectedPet.client.phone ?? "-"}</span>
//             </div>
//           </div>
//         )}
//       </div>

//       <div className="space-y-2">
//         <Label>Tipo de Servicio</Label>

//         <div className="grid grid-cols-3 gap-2">
//           {serviceTypes.slice(0, 3).map((s) => {
//             const Icon = s.icon;
//             const isSelected = service === s.value;
//             return (
//               <button
//                 key={s.value}
//                 type="button"
//                 onClick={() => handleServiceChange(s.value)}
//                 className={cn(
//                   "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
//                   isSelected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
//                 )}
//               >
//                 <Icon className="w-5 h-5" />
//                 <span className="text-xs font-medium">{s.label}</span>
//               </button>
//             );
//           })}
//         </div>

//         <div className="grid grid-cols-2 gap-2">
//           {serviceTypes.slice(3).map((s) => {
//             const Icon = s.icon;
//             const isSelected = service === s.value;
//             return (
//               <button
//                 key={s.value}
//                 type="button"
//                 onClick={() => handleServiceChange(s.value)}
//                 className={cn(
//                   "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
//                   isSelected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
//                 )}
//               >
//                 <Icon className="w-5 h-5" />
//                 <span className="text-xs font-medium">{s.label}</span>
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       <div className="space-y-2">
//         <Label htmlFor="serviceName">Nombre del Servicio</Label>
//         <Input
//           id="serviceName"
//           placeholder="Ej: Baño y Corte"
//           value={serviceName}
//           onChange={(e) => setServiceName(e.target.value)}
//           required
//         />
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div className="space-y-2">
//           <Label htmlFor="estimatedDuration">Duración Estimada (min)</Label>
//           <Input
//             id="estimatedDuration"
//             type="number"
//             min={5}
//             value={estimatedDuration}
//             onChange={(e) => setEstimatedDuration(Number(e.target.value))}
//           />
//         </div>

//         <div className="space-y-2">
//           <Label>Estado inicial</Label>
//           <Input value="En espera" disabled className="bg-muted" />
//         </div>
//       </div>

//       <div className="space-y-2">
//         <Label htmlFor="notes">Notas (opcional)</Label>
//         <Textarea
//           id="notes"
//           placeholder="Instrucciones especiales..."
//           value={notes}
//           onChange={(e) => setNotes(e.target.value)}
//           rows={2}
//         />
//       </div>

//       <div className="flex gap-2 pt-2">
//         <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>
//           Cancelar
//         </Button>
//         <Button type="submit" className="flex-1" disabled={!canSubmit}>
//           Agregar
//         </Button>
//       </div>
//     </form>
//   );
// }

function AddTurnForm({
  pets,
  onSubmit,
  onCancel,
}: {
  pets: PetOption[];
  onSubmit: (data: TodayTurnCreateDTO) => void;
  onCancel: () => void;
}) {
  // mode
  const [mode, setMode] = useState<"EXISTING" | "WALKIN">("EXISTING");

  // combobox (existing)
  const [open, setOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>(""); // string for shadcn

  const selectedPet = useMemo(() => {
    const id = Number(selectedPetId);
    if (!id) return null;
    return pets.find((p) => p.id === id) ?? null;
  }, [selectedPetId, pets]);

  // walk-in fields
  const [walkin, setWalkin] = useState({
    petName: "",
    species: "DOG" as PetOption["species"],
    ownerName: "",
    ownerPhone: "",
  });

  // service fields (shared)
  const [service, setService] = useState<TodayTurnService>("GROOMING");
  const [serviceName, setServiceName] = useState<string>(
    serviceTypes.find((s) => s.value === "GROOMING")?.defaultName ?? ""
  );
  const [notes, setNotes] = useState<string>("");
  const [estimatedDuration, setEstimatedDuration] = useState<number>(60);

  const handleServiceChange = (value: TodayTurnService) => {
    setService(value);
    const def = serviceTypes.find((s) => s.value === value)?.defaultName ?? "";
    setServiceName(def);
  };

  const selectedPetLabel = useMemo(() => {
    if (!selectedPet) return "";
    const phone = selectedPet.client.phone ? ` • ${selectedPet.client.phone}` : "";
    return `${selectedPet.name} • ${selectedPet.client.fullName}${phone}`;
  }, [selectedPet]);

  const canSubmit =
    mode === "EXISTING"
      ? !!selectedPet && !!serviceName.trim() && estimatedDuration > 0
      : !!walkin.petName.trim() &&
        !!walkin.ownerName.trim() &&
        !!serviceName.trim() &&
        estimatedDuration > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        // EXISTING
        if (mode === "EXISTING") {
          if (!selectedPet) return;

          onSubmit({
            petId: selectedPet.id,
            clientId: selectedPet.client.id,
            service,
            serviceName: serviceName.trim(),
            notes: notes.trim() ? notes.trim() : null,
            estimatedDuration: Number(estimatedDuration),
          });
          return;
        }

        // WALK-IN
        onSubmit({
          petName: walkin.petName.trim(),
          species: walkin.species,
          ownerName: walkin.ownerName.trim(),
          ownerPhone: walkin.ownerPhone.trim() ? walkin.ownerPhone.trim() : null,
          service,
          serviceName: serviceName.trim(),
          notes: notes.trim() ? notes.trim() : null,
          estimatedDuration: Number(estimatedDuration),
        });
      }}
      className="space-y-4"
    >
      {/* MODE SWITCH */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={mode === "EXISTING" ? "default" : "outline"}
          className={mode === "EXISTING" ? "" : "bg-transparent"}
          onClick={() => setMode("EXISTING")}
        >
          Buscar existente
        </Button>
        <Button
          type="button"
          variant={mode === "WALKIN" ? "default" : "outline"}
          className={mode === "WALKIN" ? "" : "bg-transparent"}
          onClick={() => {
            setMode("WALKIN");
            setSelectedPetId("");
          }}
        >
          Walk-in
        </Button>
      </div>

      {/* EXISTING SEARCH */}
      {mode === "EXISTING" && (
        <div className="space-y-2">
          <Label>Buscar cliente / mascota</Label>

          <Popover open={open} onOpenChange={setOpen}>
            <div className="flex gap-2">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between bg-white"
                >
                  <span className="truncate flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-muted-foreground" />
                    {selectedPet ? selectedPetLabel : "Escribe para buscar..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                disabled={!selectedPetId}
                onClick={() => setSelectedPetId("")}
                title="Limpiar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por mascota o dueño..." />
                <CommandList>
                  <CommandEmpty>
                    <div className="p-3 text-sm text-muted-foreground space-y-2">
                      <p>No encontrado.</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent w-full"
                        onClick={() => {
                          setMode("WALKIN");
                          setOpen(false);
                          setSelectedPetId("");
                        }}
                      >
                        Registrar como Walk-in
                      </Button>
                    </div>
                  </CommandEmpty>

                  <CommandGroup>
                    {pets.map((p) => {
                      const value = String(p.id);
                      const label = `${p.name} • ${p.client.fullName}${p.client.phone ? ` • ${p.client.phone}` : ""}`;
                      const isSelected = selectedPetId === value;

                      return (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.client.fullName} ${p.client.phone ?? ""}`}
                          onSelect={() => {
                            setSelectedPetId(value);
                            setOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                          <span className="truncate">{label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedPet && (
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{selectedPet.client.fullName}</span>
                <span>{selectedPet.client.phone ?? "-"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WALK-IN FIELDS */}
      {mode === "WALKIN" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="petName">Nombre Mascota</Label>
              <Input
                id="petName"
                placeholder="Ej: Max"
                value={walkin.petName}
                onChange={(e) => setWalkin((p) => ({ ...p, petName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Especie</Label>
              <Select
                value={walkin.species}
                onValueChange={(v) => setWalkin((p) => ({ ...p, species: v as PetOption["species"] }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOG">Perro</SelectItem>
                  <SelectItem value="CAT">Gato</SelectItem>
                  <SelectItem value="BIRD">Ave</SelectItem>
                  <SelectItem value="RABBIT">Conejo</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Nombre del Dueño</Label>
            <Input
              id="ownerName"
              placeholder="Ej: María García"
              value={walkin.ownerName}
              onChange={(e) => setWalkin((p) => ({ ...p, ownerName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPhone">Teléfono de Contacto</Label>
            <Input
              id="ownerPhone"
              placeholder="Ej: 809-123-4567"
              value={walkin.ownerPhone}
              onChange={(e) => setWalkin((p) => ({ ...p, ownerPhone: e.target.value }))}
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2">
            Se registrará como <span className="font-medium text-foreground">Walk-in</span> (sin cliente/mascota vinculados).
          </div>
        </div>
      )}

      {/* SERVICE TYPE */}
      <div className="space-y-2">
        <Label>Tipo de Servicio</Label>

        <div className="grid grid-cols-3 gap-2">
          {serviceTypes.slice(0, 3).map((s) => {
            const Icon = s.icon;
            const isSelected = service === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => handleServiceChange(s.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                  isSelected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {serviceTypes.slice(3).map((s) => {
            const Icon = s.icon;
            const isSelected = service === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => handleServiceChange(s.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                  isSelected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceName">Nombre del Servicio</Label>
        <Input
          id="serviceName"
          placeholder="Ej: Baño y Corte"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimatedDuration">Duración Estimada (min)</Label>
          <Input
            id="estimatedDuration"
            type="number"
            min={5}
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label>Estado inicial</Label>
          <Input value="En espera" disabled className="bg-muted" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Instrucciones especiales..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={!canSubmit}>
          Agregar
        </Button>
      </div>
    </form>
  );
}
