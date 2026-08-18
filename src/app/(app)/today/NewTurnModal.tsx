"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PawPrint,
  Phone,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Modal from "@/components/shared/Modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

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

type TodayTurnItem = {
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

type ClientRecord = {
  id: number;
  fullName: string;
  phone: string | null;
};

type PetRecord = {
  id: number;
  name: string;
  species: "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";
  clientId: number;
};

type ServiceRecord = {
  id: number;
  name: string;
  price: string;
  durationMins: number | null;
  category: string | null;
};

type SearchResult = {
  clientId: number;
  clientName: string;
  ownerPhone: string | null;
  petId: number;
  petName: string;
  species: PetRecord["species"];
};

type NewClientFormState = {
  clientName: string;
  petName: string;
  phone: string;
  species: "DOG" | "CAT" | "OTHER";
};

type RequestInitJson = RequestInit & {
  body?: BodyInit | null;
};

function mapServiceToTurnType(service: ServiceRecord): TodayTurnService {
  const haystack = `${service.category ?? ""} ${service.name}`.toLowerCase();

  if (
    haystack.includes("pelu") ||
    haystack.includes("groom") ||
    haystack.includes("estet")
  ) {
    return "GROOMING";
  }

  if (haystack.includes("baño") || haystack.includes("bano")) {
    return "BATH";
  }

  if (haystack.includes("cirug")) {
    return "SURGERY";
  }

  if (haystack.includes("hospital")) {
    return "HOSPITALIZATION";
  }

  return "OTHER";
}

function formatMoney(value: string) {
  const amount = Number(value);
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function scoreResult(result: SearchResult, query: string) {
  if (!query) return 0;

  const pet = result.petName.toLowerCase();
  const client = result.clientName.toLowerCase();
  const phone = (result.ownerPhone ?? "").toLowerCase();

  if (pet.startsWith(query)) return 0;
  if (client.startsWith(query)) return 1;
  if (phone.startsWith(query)) return 2;
  if (pet.includes(query)) return 3;
  if (client.includes(query)) return 4;
  if (phone.includes(query)) return 5;

  return 99;
}

async function requestJson<T>(url: string, init?: RequestInitJson): Promise<T> {
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

const SPECIES_OPTIONS: Array<{
  label: string;
  value: NewClientFormState["species"];
}> = [
  { value: "DOG", label: "Perro" },
  { value: "CAT", label: "Gato" },
  { value: "OTHER", label: "Otro" },
];

const emptyCreateForm: NewClientFormState = {
  clientName: "",
  petName: "",
  phone: "",
  species: "DOG",
};

export default function NewTurnModal({
  onCreated,
  onOpenChange,
  onShowError,
  open,
}: {
  onCreated: (turn: TodayTurnItem) => void;
  onOpenChange: (open: boolean) => void;
  onShowError: (title: string, description?: string) => void;
  open: boolean;
}) {
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [createForm, setCreateForm] = useState<NewClientFormState>(emptyCreateForm);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setMode("search");
      setQuery("");
      setDebouncedQuery("");
      setSelectedResult(null);
      setSelectedServiceId("");
      setNotes("");
      setCreateForm(emptyCreateForm);
      return;
    }

    let active = true;

    async function loadCatalogs() {
      setLoadingData(true);

      try {
        const [clientRows, petRows, serviceRows] = await Promise.all([
          requestJson<ClientRecord[]>("/api/clients"),
          requestJson<PetRecord[]>("/api/pets"),
          requestJson<ServiceRecord[]>("/api/pos/services"),
        ]);

        if (!active) return;

        setClients(clientRows);
        setPets(petRows);
        setServices(serviceRows);
        setSelectedServiceId(String(serviceRows[0]?.id ?? ""));
      } catch (error) {
        if (!active) return;
        onShowError(
          "No se pudo abrir el flujo de turnos",
          error instanceof Error ? error.message : "Intenta de nuevo en unos segundos."
        );
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, [onShowError, open]);

  const results = useMemo(() => {
    const clientById = new Map(clients.map((client) => [client.id, client]));

    return pets
      .map<SearchResult | null>((pet) => {
        const client = clientById.get(pet.clientId);
        if (!client) return null;

        return {
          clientId: client.id,
          clientName: client.fullName,
          ownerPhone: client.phone,
          petId: pet.id,
          petName: pet.name,
          species: pet.species,
        };
      })
      .filter((item): item is SearchResult => Boolean(item));
  }, [clients, pets]);

  const filteredResults = useMemo(() => {
    const withScore = results
      .map((result) => ({
        result,
        score: scoreResult(result, debouncedQuery),
      }))
      .filter(({ score }) => !debouncedQuery || score < 99)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        return left.result.clientName.localeCompare(right.result.clientName, "es");
      });

    if (!debouncedQuery) {
      return withScore.slice(0, 7).map(({ result }) => result);
    }

    return withScore.slice(0, 8).map(({ result }) => result);
  }, [debouncedQuery, results]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === Number(selectedServiceId)) ?? null,
    [selectedServiceId, services]
  );

  const canSubmit =
    !!selectedService &&
    (mode === "search"
      ? !!selectedResult
      : !!createForm.clientName.trim() &&
        !!createForm.phone.trim() &&
        !!createForm.petName.trim());

  async function handleSubmit() {
    if (!selectedService) {
      onShowError("Selecciona un servicio");
      return;
    }

    if (mode === "search" && !selectedResult) {
      onShowError(
        "Selecciona un cliente y una mascota",
        "Busca un registro existente o crea uno nuevo dentro del modal."
      );
      return;
    }

    if (mode === "create") {
      if (!createForm.clientName.trim()) {
        onShowError("Nombre del cliente requerido");
        return;
      }
      if (!createForm.phone.trim()) {
        onShowError("Telefono requerido");
        return;
      }
      if (!createForm.petName.trim()) {
        onShowError("Nombre de la mascota requerido");
        return;
      }
    }

    setSubmitting(true);

    try {
      let clientId: number;
      let petId: number;

      if (mode === "search" && selectedResult) {
        clientId = selectedResult.clientId;
        petId = selectedResult.petId;
      } else {
        const createdClient = await requestJson<{ id: number }>("/api/clients", {
          method: "POST",
          body: JSON.stringify({
            fullName: createForm.clientName.trim(),
            phone: createForm.phone.trim(),
          }),
        });

        const createdPet = await requestJson<{ id: number }>("/api/pets", {
          method: "POST",
          body: JSON.stringify({
            clientId: createdClient.id,
            name: createForm.petName.trim(),
            species: createForm.species,
            sex: "UNKNOWN",
          }),
        });

        clientId = createdClient.id;
        petId = createdPet.id;
      }

      const createdTurn = await requestJson<TodayTurnItem>("/api/today-turns", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          estimatedDuration: selectedService.durationMins ?? 60,
          notes: notes.trim() || null,
          petId,
          service: mapServiceToTurnType(selectedService),
          serviceName: selectedService.name,
        }),
      });

      onCreated(createdTurn);
      onOpenChange(false);
    } catch (error) {
      onShowError(
        "No se pudo registrar el turno",
        error instanceof Error ? error.message : "Revisa los datos e intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      onClose={onOpenChange}
      open={open}
      size="xl"
      title="Nuevo turno"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit || submitting || loadingData} onClick={() => void handleSubmit()}>
            {submitting ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Registrar turno
          </Button>
        </div>
      }
    >
      {loadingData ? (
        <div className="flex min-h-60 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-[1.4rem] border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 flex-1">
                <Label htmlFor="turn-search" className="text-sm font-semibold text-foreground">
                  Buscar cliente o mascota
                </Label>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="turn-search"
                    className="pl-9"
                    onChange={(event) => {
                      setMode("search");
                      setQuery(event.target.value);
                    }}
                    placeholder="Buscar cliente o mascota..."
                    value={query}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant={mode === "create" ? "default" : "outline"}
                className={cn("rounded-xl", mode !== "create" && "bg-transparent")}
                onClick={() => {
                  setMode("create");
                  setSelectedResult(null);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Crear nuevo cliente
              </Button>
            </div>

            {mode === "search" ? (
              <div className="mt-4 space-y-2">
                {filteredResults.length > 0 ? (
                  filteredResults.map((result) => {
                    const active =
                      selectedResult?.clientId === result.clientId &&
                      selectedResult?.petId === result.petId;

                    return (
                      <button
                        key={`${result.clientId}-${result.petId}`}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-[1rem] border px-4 py-3 text-left transition",
                          active
                            ? "border-primary/40 bg-primary/8 shadow-sm"
                            : "border-border/70 bg-background hover:border-primary/25 hover:bg-muted/30"
                        )}
                        onClick={() => {
                          setMode("search");
                          setSelectedResult(result);
                        }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {result.petName}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {result.clientName}
                          </p>
                        </div>

                        <div className="ml-4 shrink-0 text-right text-xs text-muted-foreground">
                          {result.ownerPhone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {result.ownerPhone}
                            </span>
                          ) : (
                            <span>Sin telefono</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-border bg-background/80 px-4 py-5 text-sm text-muted-foreground">
                    No encontramos coincidencias. Puedes crear el cliente y la mascota aqui mismo.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Cliente</Label>
                  <Input
                    id="clientName"
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        clientName: event.target.value,
                      }))
                    }
                    placeholder="Nombre del cliente"
                    value={createForm.clientName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Telefono</Label>
                  <Input
                    id="clientPhone"
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="809-000-0000"
                    value={createForm.phone}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="petName">Mascota</Label>
                  <Input
                    id="petName"
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        petName: event.target.value,
                      }))
                    }
                    placeholder="Nombre de la mascota"
                    value={createForm.petName}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Especie</Label>
                  <Select
                    onValueChange={(value) =>
                      setCreateForm((current) => ({
                        ...current,
                        species: value as NewClientFormState["species"],
                      }))
                    }
                    value={createForm.species}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIES_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[1.4rem] border border-border/70 bg-background p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Turno y servicio
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label>Servicio</Label>
                <Select onValueChange={setSelectedServiceId} value={selectedServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={String(service.id)}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1rem] border border-border/70 bg-muted/30 px-3 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                    Duracion
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    {selectedService?.durationMins ?? 60} min
                  </p>
                </div>

                <div className="rounded-[1rem] border border-border/70 bg-muted/30 px-3 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                    Precio
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedService ? formatMoney(selectedService.price) : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="turn-notes">Notas</Label>
              <Textarea
                id="turn-notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Detalles utiles para recepcion o el equipo..."
                rows={3}
                value={notes}
              />
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-border/70 bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Resumen rapido</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {mode === "search" ? "Cliente existente" : "Cliente nuevo"}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Estado inicial: waiting
              </Badge>
            </div>

            <div className="mt-4 rounded-[1rem] border border-border/70 bg-background px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PawPrint className="h-4 w-4" />
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {mode === "search"
                      ? selectedResult?.petName || "Selecciona una mascota"
                      : createForm.petName || "Nombre de la mascota"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {mode === "search"
                      ? selectedResult?.clientName || "Selecciona un cliente"
                      : createForm.clientName || "Nombre del cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mode === "search"
                      ? selectedResult?.ownerPhone || "Sin telefono"
                      : createForm.phone || "Telefono requerido"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
