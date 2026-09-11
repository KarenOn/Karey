"use client";

import { useEffect, useState } from "react";
import { FileText, LoaderCircle, Plus, Stethoscope, Syringe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ClinicalVisitForm from "@/components/shared/ClinicalVisitForm";
import { VaccinationRecordCreateSchema } from "@/lib/validators/vaccination";
import FormField from "./FormField";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";

type Vaccine = { id: number; name: string; species?: string | null };
type CatalogItem = { id: number; name: string; price: string; sku?: string | null };
type DraftItem = { id: number; type: "SERVICE" | "PRODUCT"; serviceId: number | null; productId: number | null; description: string; quantity: string; unitPrice: string };
type VaccineDraft = { id: string; vaccineId: string; appliedAt: string; nextDueAt: string; batchNumber: string; notes: string };

type EncounterWorkflowProps = {
  petId: number | null;
  clientId: number | null;
  appointmentId?: number;
  todayTurnId?: number;
  walkInOwnerName?: string;
  walkInOwnerPhone?: string | null;
  walkInPetName?: string;
  walkInSpecies?: string | null;
  assignedVetId?: string | null;
  vets?: Array<{ id: string; name: string; email?: string }>;
  vaccines?: Vaccine[];
  products?: CatalogItem[];
  services?: CatalogItem[];
  onSaved?: () => void | Promise<void>;
  onLinked?: (link: { clientId: number; petId: number }) => void;
  onFinish?: () => void | Promise<void>;
  onBilling?: () => void | Promise<void>;
  onViewInvoice?: (invoiceId: number) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function EncounterWorkflow({ petId, clientId, appointmentId, todayTurnId, walkInOwnerName = "", walkInOwnerPhone = "", walkInPetName = "", walkInSpecies = "DOG", assignedVetId, vets = [], vaccines = [], products = [], services = [], onSaved, onLinked, onFinish, onBilling, onViewInvoice }: EncounterWorkflowProps) {
  const access = useCurrentUserAccess();
  const canCreateInvoice = !!access?.actions.invoices.create;
  const canManageEncounter = !!access?.actions.encounters.manage;
  const canAddConsumptions = !!access?.actions.encounters.addConsumptions;
  const link = appointmentId ? `appointmentId=${appointmentId}` : todayTurnId ? `todayTurnId=${todayTurnId}` : "";
  const [linkedPetId, setLinkedPetId] = useState<number | null>(petId);
  const [linkedClientId, setLinkedClientId] = useState<number | null>(clientId);
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [linkMode, setLinkMode] = useState<"search" | "create">("search");
  const [clients, setClients] = useState<Array<{ id: number; fullName: string; phone: string | null }>>([]);
  const [pets, setPets] = useState<Array<{ id: number; name: string; species: string; clientId: number }>>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [newClientName, setNewClientName] = useState(walkInOwnerName);
  const [newClientPhone, setNewClientPhone] = useState(walkInOwnerPhone ?? "");
  const [newPetName, setNewPetName] = useState(walkInPetName);
  const [linking, setLinking] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [catalogServices, setCatalogServices] = useState(services);
  const [catalogVaccines, setCatalogVaccines] = useState(vaccines);
  const [catalogVets, setCatalogVets] = useState(vets);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [itemType, setItemType] = useState<"SERVICE" | "PRODUCT">("SERVICE");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [savingItem, setSavingItem] = useState(false);
  const [vaccineDrafts, setVaccineDrafts] = useState<VaccineDraft[]>([]);
  const [savingVaccines, setSavingVaccines] = useState(false);
  const [sendingToBilling, setSendingToBilling] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const items = itemType === "SERVICE" ? catalogServices : catalogProducts;

  useEffect(() => {
    void (async () => {
      const profileResponse = await fetch("/api/profile", { cache: "no-store" });
      const profile = await profileResponse.json().catch(() => null) as { clinicId?: number } | null;
      if (!profile?.clinicId) return;
      const responses = await Promise.all([
        link && linkedPetId && linkedClientId ? fetch(`/api/encounter-items?${link}`, { cache: "no-store" }) : Promise.resolve(null),
        link ? fetch(`/api/encounters/draft?${link}`, { cache: "no-store" }) : Promise.resolve(null),
        fetch("/api/pos/products", { cache: "no-store" }),
        fetch("/api/pos/services", { cache: "no-store" }),
        fetch(`/api/vaccines?clinicId=${profile.clinicId}`, { cache: "no-store" }),
        fetch("/api/appointments/meta", { cache: "no-store" }),
      ]);
      if (responses[0]?.ok) setDraftItems(await responses[0].json());
      if (responses[1]?.ok) {
        const invoice = await responses[1].json().catch(() => null) as { id?: number; status?: string } | null;
        setInvoiceId(invoice?.id ?? null);
        setInvoiceStatus(invoice?.status ?? null);
      }
      if (!products.length && responses[2].ok) setCatalogProducts(await responses[2].json());
      if (!services.length && responses[3].ok) setCatalogServices(await responses[3].json());
      if (!vaccines.length && responses[4].ok) setCatalogVaccines(await responses[4].json());
      if (!vets.length && responses[5].ok) setCatalogVets(((await responses[5].json()) as { vets?: typeof vets }).vets ?? []);
    })().catch(() => toast.error("No se pudieron cargar los consumos.")).finally(() => setLoadingItems(false));
  }, [link, linkedClientId, linkedPetId, products.length, services.length, vaccines.length, vets.length]);

  useEffect(() => {
    if (!todayTurnId || linkedPetId || linkedClientId || !linkEnabled) return;
    void Promise.all([
      fetch("/api/clients", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/pets", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([clientRows, petRows]) => {
      setClients(clientRows);
      setPets(petRows);
    }).catch(() => toast.error("No pudimos cargar los registros.") );
  }, [linkEnabled, linkedClientId, linkedPetId, todayTurnId]);

  async function linkPatient() {
    if (!todayTurnId || linking) return;
    setLinking(true);
    try {
      let targetClientId = Number(selectedClientId);
      let targetPetId = Number(selectedPetId);
      if (linkMode === "create") {
        const clientResponse = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: newClientName.trim(), phone: newClientPhone.trim() }) });
        const createdClient = await clientResponse.json().catch(() => null);
        if (!clientResponse.ok) throw new Error(createdClient?.error ?? "No se pudo crear el cliente.");
        const petResponse = await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: createdClient.id, name: newPetName.trim(), species: walkInSpecies ?? "DOG", sex: "UNKNOWN" }) });
        const createdPet = await petResponse.json().catch(() => null);
        if (!petResponse.ok) throw new Error(createdPet?.error ?? "No se pudo crear el paciente.");
        targetClientId = createdClient.id;
        targetPetId = createdPet.id;
      }
      if (!targetClientId || !targetPetId) throw new Error("Selecciona un cliente y un paciente.");
      const response = await fetch(`/api/today-turns/${todayTurnId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: targetClientId, petId: targetPetId }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo vincular el paciente.");
      setLinkedClientId(targetClientId);
      setLinkedPetId(targetPetId);
      onLinked?.({ clientId: targetClientId, petId: targetPetId });
      toast.success("Cliente y paciente vinculados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo vincular el paciente.");
    } finally {
      setLinking(false);
    }
  }

  async function addItem() {
    if (!canAddConsumptions) return;
    const selected = items.find((item) => String(item.id) === selectedItem);
    if (!selected || savingItem) return;
    setSavingItem(true);
    try {
      const response = await fetch("/api/encounter-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId: appointmentId ?? null, todayTurnId: todayTurnId ?? null, type: itemType, serviceId: itemType === "SERVICE" ? selected.id : null, productId: itemType === "PRODUCT" ? selected.id : null, description: selected.name, quantity, unitPrice: Number(selected.price) || 0 }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo guardar el consumo.");
      setDraftItems((current) => [...current, data]);
      setSelectedItem(""); setQuantity(1); toast.success("Consumo agregado."); await onSaved?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar el consumo."); }
    finally { setSavingItem(false); }
  }

  async function removeItem(id: number) {
    if (!canAddConsumptions) return;
    const response = await fetch(`/api/encounter-items?id=${id}`, { method: "DELETE" });
    if (!response.ok) { toast.error("No se pudo eliminar el consumo."); return; }
    setDraftItems((current) => current.filter((item) => item.id !== id));
  }

  async function sendToBilling() {
    if (!appointmentId && !todayTurnId) return;
    if (sendingToBilling) return;
    setSendingToBilling(true);
    try {
      const response = await fetch("/api/encounters/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointmentId ?? null, todayTurnId: todayTurnId ?? null }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo enviar a facturación.");
      toast.success("Atención enviada a facturación correctamente.");
      await onFinish?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar a facturación.");
    } finally {
      setSendingToBilling(false);
    }
  }

  function addVaccine() {
    setVaccineDrafts((current) => [...current, { id: crypto.randomUUID(), vaccineId: "", appliedAt: today(), nextDueAt: "", batchNumber: "", notes: "" }]);
  }

  async function saveVaccines() {
    if (savingVaccines || vaccineDrafts.length === 0) return;
    setSavingVaccines(true);
    try {
      for (const draft of vaccineDrafts) {
        const selected = catalogVaccines.find((vaccine) => String(vaccine.id) === draft.vaccineId);
        const parsed = VaccinationRecordCreateSchema.safeParse({ ...draft, vaccineId: draft.vaccineId ? Number(draft.vaccineId) : undefined, vaccineName: selected?.name ?? "", appliedAt: new Date(draft.appliedAt), nextDueAt: draft.nextDueAt ? new Date(draft.nextDueAt) : undefined });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revisa las vacunas.");
        const response = await fetch(`/api/pets/${linkedPetId ?? 0}/vaccinations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message ?? "No se pudo guardar una vacuna.");
      }
      setVaccineDrafts([]); toast.success("Vacunas guardadas correctamente."); await onSaved?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron guardar las vacunas."); }
    finally { setSavingVaccines(false); }
  }

  const registered = Boolean(linkedPetId && linkedClientId);

  if (access && !canManageEncounter) {
    return <p className="text-sm text-muted-foreground">No tienes permiso para gestionar esta atención.</p>;
  }

  return (
    <div className="space-y-4">
      {!registered && todayTurnId ? <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"><label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" checked={linkEnabled} onChange={(event) => setLinkEnabled(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" /> <span>Crear o vincular cliente y paciente para guardar historial clínico.<span className="mt-1 block font-normal text-amber-900/80">Necesitas un paciente registrado para guardar visitas y vacunas.</span></span></label>{linkEnabled ? <div className="mt-4 space-y-4 border-t border-amber-200 pt-4"><div className="flex gap-2"><Button type="button" size="sm" variant={linkMode === "search" ? "default" : "outline"} onClick={() => setLinkMode("search")}>Buscar cliente existente</Button><Button type="button" size="sm" variant={linkMode === "create" ? "default" : "outline"} onClick={() => setLinkMode("create")}>Crear cliente</Button></div>{linkMode === "search" ? <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Cliente</Label><SearchableSelect options={clients.map((client) => ({ value: String(client.id), label: client.fullName }))} value={selectedClientId} onValueChange={(value) => { setSelectedClientId(value); setSelectedPetId(""); }} placeholder="Buscar cliente" searchPlaceholder="Buscar cliente..." /></div><div className="space-y-2"><Label>Paciente</Label><SearchableSelect options={pets.filter((pet) => !selectedClientId || pet.clientId === Number(selectedClientId)).map((pet) => ({ value: String(pet.id), label: `${pet.name} (${pet.species})` }))} value={selectedPetId} onValueChange={setSelectedPetId} placeholder="Buscar paciente" searchPlaceholder="Buscar paciente..." /></div></div> : <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="encounter-client-name">Cliente</Label><Input id="encounter-client-name" value={newClientName} onChange={(event) => setNewClientName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="encounter-client-phone">Telefono</Label><Input id="encounter-client-phone" value={newClientPhone} onChange={(event) => setNewClientPhone(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="encounter-pet-name">Paciente</Label><Input id="encounter-pet-name" value={newPetName} onChange={(event) => setNewPetName(event.target.value)} /></div></div>}<Button type="button" onClick={() => void linkPatient()} disabled={linking}>{linking ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}{linking ? "Vinculando..." : "Vincular y habilitar historial"}</Button></div> : null}</section> : null}
      <Tabs defaultValue={registered ? "visit" : "billing"}>
        <TabsList>
          <TabsTrigger value="visit" disabled={!registered}>
            <Stethoscope className="h-4 w-4" />
            Visita
          </TabsTrigger>
          <TabsTrigger value="vaccines" disabled={!registered}>
            <Syringe className="h-4 w-4" />
            Vacunas
          </TabsTrigger>
          {canAddConsumptions ? (
            <TabsTrigger value="billing">
              <FileText className="h-4 w-4" />
              Consumos
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="visit">
          <ClinicalVisitForm
            petId={linkedPetId ?? 0}
            vets={catalogVets}
            initialValues={{ vetId: assignedVetId ?? "" }}
            onSaved={onSaved ?? (() => undefined)}
          />
        </TabsContent>
        <TabsContent value="vaccines" className="space-y-4">
          <Button type="button" variant="outline" onClick={addVaccine}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar vacuna
          </Button>
          {vaccineDrafts.map((draft) => (
            <div
              key={draft.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
            >
              <FormField
                label="Vacuna"
                name={`vaccineId-${draft.id}`}
                type="select"
                value={draft.vaccineId}
                options={catalogVaccines.map((vaccine) => ({
                  value: String(vaccine.id),
                  label: vaccine.species
                    ? `${vaccine.name} (${vaccine.species})`
                    : vaccine.name,
                }))}
                onChange={(event) =>
                  setVaccineDrafts((current) =>
                    current.map((entry) =>
                      entry.id === draft.id
                        ? { ...entry, vaccineId: String(event.target.value) }
                        : entry,
                    ),
                  )
                }
                required
              />
              {/* <SearchableSelect
                options={catalogVaccines.map((vaccine) => ({
                  value: String(vaccine.id),
                  label: vaccine.species
                    ? `${vaccine.name} (${vaccine.species})`
                    : vaccine.name,
                }))}
                value={draft.vaccineId}
                onValueChange={(value) =>
                  setVaccineDrafts((current) =>
                    current.map((entry) =>
                      entry.id === draft.id
                        ? { ...entry, vaccineId: value }
                        : entry,
                    ),
                  )
                }
                placeholder="Seleccionar vacuna"
                searchPlaceholder="Buscar vacuna..."
              /> */}

              <FormField
                label="Fecha de aplicación"
                name={`appliedAt-${draft.id}`}
                type="date"
                value={draft.appliedAt}
                onChange={(event) =>
                  setVaccineDrafts((current) =>
                    current.map((entry) =>
                      entry.id === draft.id
                        ? { ...entry, appliedAt: String(event.target.value) }
                        : entry,
                    ),
                  )
                }
                required
                // className="h-10 rounded-md border bg-background px-3 text-sm"
              />
              <FormField
                label="Próxima dosis"
                name={`nextDueAt-${draft.id}`}
                type="date"
                value={draft.nextDueAt}
                onChange={(event) =>
                  setVaccineDrafts((current) =>
                    current.map((entry) =>
                      entry.id === draft.id
                        ? { ...entry, nextDueAt: String(event.target.value) }
                        : entry,
                    ),
                  )
                }
                // className="h-10 rounded-md border bg-background px-3 text-sm"
              />
              <FormField
                label="Número de lote"
                name={`batchNumber-${draft.id}`}
                value={draft.batchNumber}
                onChange={(event) =>
                  setVaccineDrafts((current) =>
                    current.map((entry) =>
                      entry.id === draft.id
                        ? { ...entry, batchNumber: String(event.target.value) }
                        : entry,
                    ),
                  )
                }
                // className="h-10 rounded-md border bg-background px-3 text-sm"
              />
              <FormField
                label="Notas"
                name={`notes-${draft.id}`}
                type="textarea"
                value={draft.notes}
                onChange={(event) =>
                  setVaccineDrafts((current) =>
                    current.map((entry) =>
                      entry.id === draft.id
                        ? { ...entry, notes: String(event.target.value) }
                        : entry,
                    ),
                  )
                }
                className="sm:col-span-2"
              />
              <Button
                type="button"
                variant="ghost"
                className="justify-self-end text-destructive"
                onClick={() =>
                  setVaccineDrafts((current) =>
                    current.filter((entry) => entry.id !== draft.id),
                  )
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          ))}
          {vaccineDrafts.length > 0 ? (
            <Button
              type="button"
              onClick={() => void saveVaccines()}
              disabled={savingVaccines}
            >
              {savingVaccines ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {savingVaccines ? "Guardando..." : "Guardar vacunas"}
            </Button>
          ) : null}
        </TabsContent>
        {canAddConsumptions ? <TabsContent value="billing" className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={itemType === "SERVICE" ? "default" : "outline"}
              onClick={() => {
                setItemType("SERVICE");
                setSelectedItem("");
              }}
            >
              Servicios
            </Button>
            <Button
              type="button"
              variant={itemType === "PRODUCT" ? "default" : "outline"}
              onClick={() => {
                setItemType("PRODUCT");
                setSelectedItem("");
              }}
            >
              Productos
            </Button>
          </div>
          <div className="flex gap-3 w-xl max-w-full">
            <SearchableSelect
              options={items.map((item) => ({
                value: String(item.id),
                label: `${item.name} · ${item.price}`,
                keywords: [item.name, item.sku ?? ""],
              }))}
              className="w-lg"
              value={selectedItem}
              onValueChange={setSelectedItem}
              placeholder={`Seleccionar ${itemType === "SERVICE" ? "servicio" : "producto"}`}
              searchPlaceholder="Buscar..."
            />
            <input
              className="h-10 w-20 rounded-md border px-3"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value) || 1))
              }
            />
            <Button
              type="button"
              onClick={() => void addItem()}
              disabled={!selectedItem || savingItem}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          </div>
          {draftItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {item.description} × {item.quantity}
              </span>
              <span className="flex items-center gap-3">
                RD$ {item.unitPrice}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar consumo"
                  onClick={() => void removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </span>
            </div>
          ))}
          {loadingItems ? <div className="flex min-h-60 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div> : draftItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay consumos registrados en esta atención.
            </p>
          ) : null}
        </TabsContent> : null}
      </Tabs>
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        {invoiceStatus !== "DRAFT" && invoiceId && onViewInvoice ? (
          <Button type="button" onClick={() => onViewInvoice(invoiceId)}>
            Ver factura
          </Button>
        ) : draftItems.length > 0 && (onBilling || onFinish) ? (
          <Button type="button" disabled={sendingToBilling} onClick={() => void (canCreateInvoice ? onBilling?.() : sendToBilling())}>
            {sendingToBilling ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            {sendingToBilling ? "Enviando..." : canCreateInvoice ? "Continuar a facturación" : "Enviar a facturación"}
          </Button>
        ) : null}
        {onFinish ? (
          <Button
            type="button"
            variant={draftItems.length > 0 ? "outline" : "default"}
            onClick={() => void onFinish()}
          >
            Finalizar atención
          </Button>
        ) : null}
      </div>
    </div>
  );
}
