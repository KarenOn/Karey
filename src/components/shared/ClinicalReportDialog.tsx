"use client";

import { useMemo, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import Modal from "@/components/shared/Modal";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PetRow } from "@/lib/api/pets";
import type { ClientRow } from "@/lib/api/clients";

type Props = { open: boolean; onClose: () => void; pets: Pick<PetRow, "id" | "name" | "clientId">[]; clients: Pick<ClientRow, "id" | "fullName" | "phone" | "email">[]; initialPetIds?: number[] };

export default function ClinicalReportDialog({ open, onClose, pets, clients, initialPetIds = [] }: Props) {
  const [mode, setMode] = useState<"patients" | "client">(initialPetIds.length ? "patients" : "patients");
  const [selectedIds, setSelectedIds] = useState<number[]>(initialPetIds);
  const [clientId, setClientId] = useState("");
  const [rangeMode, setRangeMode] = useState<"today" | "date" | "range" | "all">("today");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const clientOptions = useMemo(() => clients.map((client) => ({ value: String(client.id), label: client.fullName, keywords: [client.phone ?? "", client.email ?? ""] })), [clients]);
  const selectedPets = pets.filter((pet) => selectedIds.includes(pet.id));

  function reset() { setSelectedIds(initialPetIds); setClientId(""); setMode(initialPetIds.length ? "patients" : "patients"); setRangeMode("today"); setDate(new Date().toISOString().slice(0, 10)); setFrom(""); setTo(""); }
  function close() { if (busy) return; reset(); onClose(); }
  function toggle(id: number) { setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  async function submit() {
    if (mode === "patients" && !selectedIds.length) return;
    if (mode === "client" && !clientId) return;
    if (rangeMode === "range" && (!from || !to || from > to)) return;
    const query = new URLSearchParams({ rangeMode });
    if (mode === "patients") query.set("petIds", selectedIds.join(",")); else query.set("clientId", clientId);
    if (rangeMode === "date") query.set("date", date);
    if (rangeMode === "range") { query.set("from", from); query.set("to", to); }
    setBusy(true);
    try {
      const response = await fetch("/api/clinical-reports/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petIds: mode === "patients" ? selectedIds : [], clientId: mode === "client" ? Number(clientId) : undefined, range: { mode: rangeMode, date: rangeMode === "date" ? date : undefined, from: rangeMode === "range" ? from : undefined, to: rangeMode === "range" ? to : undefined } }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "No se pudo solicitar el informe.");
      toast.success("Estamos generando el informe clínico. Puedes continuar trabajando y te notificaremos cuando esté listo.");
      reset();
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo solicitar el informe."); }
    finally { setBusy(false); }
  }

  return <Modal open={open} onClose={close} title="Generar informe clínico" description="Selecciona el alcance y las fechas del historial que quieres revisar o descargar." size="lg" footer={<div className="flex gap-3"><Button variant="outline" onClick={close}>Cancelar</Button><Button onClick={submit} disabled={busy || (mode === "patients" ? !selectedIds.length : !clientId)}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Generar informe</Button></div>}>
    <div className="space-y-5">
      <fieldset className="space-y-3"><legend className="text-sm font-semibold">Modo</legend><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"><input type="radio" checked={mode === "patients"} onChange={() => setMode("patients")} className="mt-1" /> <span><span className="block text-sm font-medium">Pacientes seleccionados</span><span className="text-xs text-muted-foreground">{selectedPets.length ? selectedPets.map((pet) => pet.name).join(", ") : "Selecciona uno o varios en la tabla."}</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"><input type="radio" checked={mode === "client"} onChange={() => setMode("client")} className="mt-1" /> <span className="w-full"><span className="block text-sm font-medium">Todos los pacientes de un cliente</span><span className="mt-2 block"><SearchableSelect value={clientId} onValueChange={setClientId} options={clientOptions} placeholder="Seleccionar cliente" searchPlaceholder="Buscar cliente..." /></span></span></label></fieldset>
      {mode === "patients" ? <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">{pets.map((pet) => <label key={pet.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><input type="checkbox" checked={selectedIds.includes(pet.id)} onChange={() => toggle(pet.id)} />{pet.name}<span className="text-xs text-muted-foreground">· {clients.find((client) => client.id === pet.clientId)?.fullName ?? "Sin propietario"}</span></label>)}</div> : null}
      <fieldset className="space-y-3"><legend className="text-sm font-semibold">Rango de fechas</legend><div className="grid gap-2 sm:grid-cols-2">{([["today", "Hoy"], ["date", "Fecha específica"], ["range", "Desde / Hasta"], ["all", "Todo el historial"]] as const).map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" checked={rangeMode === value} onChange={() => setRangeMode(value)} />{label}</label>)}</div>{rangeMode === "date" ? <div className="space-y-2"><Label htmlFor="clinical-report-date">Fecha</Label><Input id="clinical-report-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div> : null}{rangeMode === "range" ? <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="clinical-report-from">Desde</Label><Input id="clinical-report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="clinical-report-to">Hasta</Label><Input id="clinical-report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></div> : null}</fieldset>
    </div>
  </Modal>;
}
