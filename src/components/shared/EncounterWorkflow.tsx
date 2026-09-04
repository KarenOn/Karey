"use client";

import { useEffect, useState } from "react";
import { FileText, Syringe, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClinicalVisitForm from "@/components/shared/ClinicalVisitForm";
import VaccinationForm from "@/components/shared/VaccinationForm";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { toast } from "sonner";

type EncounterWorkflowProps = {
  petId: number;
  clientId: number;
  vets?: Array<{ id: string; name: string; email?: string }>;
  vaccines?: Array<{ id: number; name: string; species?: string | null }>;
  products?: Array<{ id: number; name: string; price: string; sku?: string | null }>;
  services?: Array<{ id: number; name: string; price: string }>;
  onSaved?: () => void | Promise<void>;
  onFinish?: () => void | Promise<void>;
};

export default function EncounterWorkflow({ petId, clientId, vets = [], vaccines = [], products = [], services = [], onSaved, onFinish }: EncounterWorkflowProps) {
  const handleSaved = onSaved ?? (() => undefined);
  const [itemType, setItemType] = useState<"SERVICE" | "PRODUCT">("SERVICE");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [catalogServices, setCatalogServices] = useState(services);
  const [catalogVaccines, setCatalogVaccines] = useState(vaccines);
  const [catalogVets, setCatalogVets] = useState(vets);
  const items = itemType === "SERVICE" ? catalogServices : catalogProducts;

  useEffect(() => {
    if (products.length && services.length && vaccines.length && vets.length) return;
    void (async () => {
      const profileResponse = await fetch("/api/profile", { cache: "no-store" });
      const profile = (await profileResponse.json().catch(() => null)) as { clinicId?: number } | null;
      if (!profile?.clinicId) return;
      const [productsResponse, servicesResponse, vaccinesResponse, metaResponse] = await Promise.all([
        fetch("/api/pos/products", { cache: "no-store" }),
        fetch("/api/pos/services", { cache: "no-store" }),
        fetch(`/api/vaccines?clinicId=${profile.clinicId}`, { cache: "no-store" }),
        fetch("/api/appointments/meta", { cache: "no-store" }),
      ]);
      if (!products.length && productsResponse.ok) setCatalogProducts(await productsResponse.json());
      if (!services.length && servicesResponse.ok) setCatalogServices(await servicesResponse.json());
      if (!vaccines.length && vaccinesResponse.ok) setCatalogVaccines(await vaccinesResponse.json());
      if (!vets.length && metaResponse.ok) setCatalogVets((await metaResponse.json()).vets ?? []);
    })().catch(() => undefined);
  }, [products.length, services.length, vaccines.length, vets.length]);

  async function createInvoice() {
    if (creatingInvoice || !itemId) return;
    const item = items.find((entry) => String(entry.id) === itemId);
    if (!item) return;
    setCreatingInvoice(true); setBillingMessage(null);
    try {
      const response = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, petId, discount: 0, invoiceTaxRate: 0, notes: null, items: [{ type: itemType, serviceId: itemType === "SERVICE" ? item.id : null, productId: itemType === "PRODUCT" ? item.id : null, description: item.name, quantity, unitPrice: Number(item.price), taxRate: 0 }], payNow: false, payment: null }) });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "No se pudo crear la factura.");
      setBillingMessage("Factura creada correctamente.");
      toast.success("Factura creada correctamente.");
      setItemId(""); setQuantity(1);
      await onSaved?.();
    } catch (error) { const message = error instanceof Error ? error.message : "No se pudo crear la factura."; setBillingMessage(message); toast.error(message); }
    finally { setCreatingInvoice(false); }
  }

  return <div className="space-y-4"><Tabs defaultValue="visit"><TabsList><TabsTrigger value="visit"><Stethoscope className="h-4 w-4" />Visita</TabsTrigger><TabsTrigger value="vaccines"><Syringe className="h-4 w-4" />Vacunas</TabsTrigger><TabsTrigger value="billing"><FileText className="h-4 w-4" />Facturación</TabsTrigger></TabsList><TabsContent value="visit"><ClinicalVisitForm petId={petId} vets={catalogVets} onSaved={handleSaved} /></TabsContent><TabsContent value="vaccines"><VaccinationForm petId={petId} vaccines={catalogVaccines} onSaved={handleSaved} /></TabsContent><TabsContent value="billing"><div className="space-y-4"><div className="flex gap-2"><Button type="button" variant={itemType === "SERVICE" ? "default" : "outline"} onClick={() => { setItemType("SERVICE"); setItemId(""); }}>Servicios</Button><Button type="button" variant={itemType === "PRODUCT" ? "default" : "outline"} onClick={() => { setItemType("PRODUCT"); setItemId(""); }}>Productos</Button></div><SearchableSelect options={items.map((item) => ({ value: String(item.id), label: `${item.name} · ${item.price}`, keywords: [item.name] }))} value={itemId} onValueChange={setItemId} placeholder={`Seleccionar ${itemType === "SERVICE" ? "servicio" : "producto"}`} searchPlaceholder={`Buscar ${itemType === "SERVICE" ? "servicio" : "producto"}...`} /><div className="flex gap-3"><input className="h-11 w-24 rounded-lg border border-border bg-background px-3 text-sm" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /><Button type="button" onClick={() => void createInvoice()} disabled={!itemId || creatingInvoice}>{creatingInvoice ? "Generando..." : "Generar factura"}</Button></div>{billingMessage ? <p className="text-sm text-muted-foreground">{billingMessage}</p> : null}</div></TabsContent></Tabs>{onFinish ? <div className="flex justify-end border-t border-border pt-4"><Button type="button" onClick={() => void onFinish()}>Finalizar atención</Button></div> : null}</div>;
}
