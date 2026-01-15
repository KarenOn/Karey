"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
  Stethoscope,
  ScanBarcode,
  HelpCircle,
  CreditCard,
  Banknote,
  Building2,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Client = { id: number; fullName: string; phone: string | null; email: string | null };
type Pet = { id: number; name: string; species: string; breed: string | null };
type Service = { id: number; name: string; price: string; durationMins: number };
type Product = {
  id: number;
  sku: string | null;
  name: string;
  price: string;
  trackStock: boolean;
  stockOnHand: number;
  category: string | null;
  requiresPrescription: boolean;
  description: string | null;
};

type ItemType = "SERVICE" | "PRODUCT";

type PosItem = {
  key: string;
  type: ItemType;
  serviceId?: number;
  productId?: number;
  code?: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
  stockInfo?: string;
  requiresPrescription?: boolean;
};

function money(n: number) {
  return n.toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

function num(v: unknown) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

export default function NewInvoicePOSPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [clientId, setClientId] = useState<string>("");
  const [petId, setPetId] = useState<string>("");

  const [selectedType, setSelectedType] = useState<ItemType>("SERVICE");
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  const [qty, setQty] = useState<number>(1);
  const [payAmount, setPayAmount] = useState<string>("");

  // SKU input (scanner-friendly)
  const [code, setCode] = useState("");
  const codeRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<PosItem[]>([]);

  // totales
  const [discount, setDiscount] = useState<number>(0);
  const [applyTax, setApplyTax] = useState<boolean>(true);
  const [taxRate, setTaxRate] = useState<number>(18); // ITBIS típico (ajústalo si quieres)

  // cobrar ahora
  const [payNow, setPayNow] = useState<boolean>(false);
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");
  const [payRef, setPayRef] = useState<string>("");

  // Load base catalog
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [cRes, sRes, pRes] = await Promise.all([
          fetch("/api/pos/clients", { cache: "no-store" }),
          fetch("/api/pos/services", { cache: "no-store" }),
          fetch("/api/pos/products", { cache: "no-store" }),
        ]);

        const { walkInClientId, clients } = await cRes.json();

        if (!cRes.ok || !sRes.ok || !pRes.ok) throw new Error("Error cargando catálogo");

        const [s, p] = await Promise.all([sRes.json(), pRes.json()]);
        if (!mounted) return;

        setClients(clients);
        setClientId(String(walkInClientId))
        setServices(s);
        setProducts(p);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Error");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Load pets when client changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!clientId) {
        setPets([]);
        setPetId("");
        return;
      }

      const id = Number(clientId);
      if (!Number.isFinite(id)) return;

      const res = await fetch(`/api/pos/clients/${id}/pets`, { cache: "no-store" });
      if (!res.ok) {
        setPets([]);
        setPetId("");
        return;
      }
      const data = await res.json();
      if (!mounted) return;
      setPets(data);
      setPetId("");
    })();

    return () => {
      mounted = false;
    };
  }, [clientId]);

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + it.lineTotal, 0), [items]);
  const discountApplied = useMemo(() => Math.min(discount, subtotal), [discount, subtotal]);
  const taxableBase = useMemo(() => Math.max(0, subtotal - discountApplied), [subtotal, discountApplied]);
  const tax = useMemo(() => (applyTax ? taxableBase * (taxRate / 100) : 0), [applyTax, taxableBase, taxRate]);
  const total = useMemo(() => taxableBase + tax, [taxableBase, tax]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === Number(clientId)) ?? null, [clients, clientId]);

  const addOrMergeItem = (incoming: Omit<PosItem, "key" | "lineTotal">) => {
    setItems((prev) => {
      const sameKey =
        incoming.type === "PRODUCT"
          ? prev.find((x) => x.type === "PRODUCT" && x.productId === incoming.productId)
          : prev.find((x) => x.type === "SERVICE" && x.serviceId === incoming.serviceId);

      if (sameKey) {
        const next = prev.map((x) => {
          if (x.key !== sameKey.key) return x;
          const newQty = x.quantity + incoming.quantity;
          return {
            ...x,
            quantity: newQty,
            lineTotal: newQty * x.unitPrice,
          };
        });
        return next;
      }

      const key = `${incoming.type}-${incoming.type === "PRODUCT" ? incoming.productId : incoming.serviceId}-${Date.now()}`;
      return [
        ...prev,
        {
          ...incoming,
          key,
          lineTotal: incoming.quantity * incoming.unitPrice,
        },
      ];
    });
  };

  const addFromSelect = () => {
    const id = Number(selectedItemId);
    if (!Number.isFinite(id) || id <= 0) return;

    if (selectedType === "SERVICE") {
      const s = services.find((x) => x.id === id);
      if (!s) return;

      addOrMergeItem({
        type: "SERVICE",
        serviceId: s.id,
        name: s.name,
        description: s.name,
        quantity: Math.max(1, qty),
        unitPrice: num(s.price),
        taxRate: 0,
      });
    } else {
      const p = products.find((x) => x.id === id);
      if (!p) return;

      addOrMergeItem({
        type: "PRODUCT",
        productId: p.id,
        code: p.sku,
        name: p.name,
        description: p.description ?? p.name,
        quantity: Math.max(1, qty),
        unitPrice: num(p.price),
        taxRate: 0,
        stockInfo: p.trackStock ? `${p.stockOnHand} disp.` : "No controla stock",
        requiresPrescription: p.requiresPrescription,
      });
    }

    setSelectedItemId("");
    setQty(1);
  };

  const lookupByCode = async () => {
    const c = code.trim();
    if (!c) return;

    const res = await fetch(`/api/pos/products/lookup?code=${encodeURIComponent(c)}`, { cache: "no-store" });
    if (!res.ok) {
      setErr("No encontré ese código/SKU.");
      return;
    }

    const p: Product = await res.json();

    addOrMergeItem({
      type: "PRODUCT",
      productId: p.id,
      code: p.sku,
      name: p.name,
      description: p.description ?? p.name,
      quantity: 1,
      unitPrice: num(p.price),
      taxRate: 0,
      stockInfo: p.trackStock ? `${p.stockOnHand} disp.` : "No controla stock",
      requiresPrescription: p.requiresPrescription,
    });

    setCode("");
    codeRef.current?.focus();
  };

  const updateQty = (key: string, nextQty: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? { ...it, quantity: Math.max(1, nextQty), lineTotal: Math.max(1, nextQty) * it.unitPrice }
          : it
      )
    );
  };

  const removeItem = (key: string) => setItems((prev) => prev.filter((it) => it.key !== key));

  const submit = async (mode: "SAVE" | "SAVE_AND_PAY") => {
    setErr(null);

    if (!clientId) {
      setErr("Selecciona un cliente.");
      return;
    }
    if (items.length === 0) {
      setErr("Agrega al menos un concepto.");
      return;
    }

    const payload = {
      clientId: Number(clientId),
      petId: petId ? Number(petId) : null,

      discount: discountApplied,
      invoiceTaxRate: applyTax ? taxRate : 0,
      notes: null as string | null,

      items: items.map((it) => ({
        type: it.type,
        serviceId: it.type === "SERVICE" ? it.serviceId ?? null : null,
        productId: it.type === "PRODUCT" ? it.productId ?? null : null,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate ?? 0,
      })),

      payNow: mode === "SAVE_AND_PAY",
      payment:
        mode === "SAVE_AND_PAY"
          ? {
              amount: payAmount,
              method: payMethod,
              reference: payRef ? payRef : null,
            }
          : null,
    };

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErr(data?.error ?? "Error creando factura");
      return;
    }

    const created = await res.json();
    router.push(`/invoices/${created.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-6 w-60 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-2xl animate-pulse" />
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/invoices">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">POS • Nueva Factura</h1>
              <p className="text-muted-foreground">Rápido, para caja: busca por código y cobra en segundos</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">Enter = agregar código</Badge>
            <Badge variant="secondary" className="rounded-full">Tip: escáner funciona como teclado</Badge>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-rose-600">{err}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Cliente y Paciente</h2>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <HelpCircle className="w-4 h-4" /> ayuda
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Selecciona el cliente y (si aplica) el paciente. El paciente es opcional si es una venta general.
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Cliente</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground cursor-help"><HelpCircle className="w-4 h-4" /></span>
                      </TooltipTrigger>
                      <TooltipContent>Requerido. Si no aparece, revisa que el cliente tenga el mismo clinicId.</TooltipContent>
                    </Tooltip>
                  </div>

                  <Select
                    value={clientId}
                    onValueChange={(v) => {
                      setClientId(v);
                      setPetId("");
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedClient ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedClient.phone ? `📞 ${selectedClient.phone}` : ""}{" "}
                      {selectedClient.email ? `• ✉️ ${selectedClient.email}` : ""}
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label>Paciente</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground cursor-help"><HelpCircle className="w-4 h-4" /></span>
                      </TooltipTrigger>
                      <TooltipContent>Opcional. Útil para historial y reportes por mascota.</TooltipContent>
                    </Tooltip>
                  </div>

                  <Select value={petId} onValueChange={setPetId} disabled={!clientId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={clientId ? "Seleccionar paciente" : "Selecciona un cliente primero"} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} {p.breed ? `- ${p.breed}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Agregar items */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="font-semibold text-foreground">Agregar conceptos</h2>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedType === "SERVICE" ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSelectedType("SERVICE");
                      setSelectedItemId("");
                    }}
                  >
                    <Stethoscope className="w-4 h-4" />
                    Servicio
                  </Button>
                  <Button
                    type="button"
                    variant={selectedType === "PRODUCT" ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSelectedType("PRODUCT");
                      setSelectedItemId("");
                      setTimeout(() => codeRef.current?.focus(), 50);
                    }}
                  >
                    <Package className="w-4 h-4" />
                    Producto
                  </Button>
                </div>
              </div>

              {/* SKU search (solo productos) */}
              {selectedType === "PRODUCT" ? (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <ScanBarcode className="w-4 h-4" />
                      Buscar por código / SKU
                    </p>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground cursor-help"><HelpCircle className="w-4 h-4" /></span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Ideal para escáner: el escáner escribe el SKU y manda Enter. Aquí, Enter agrega el producto.
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      ref={codeRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Ej: MED-0002"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          lookupByCode();
                        }
                      }}
                    />
                    <Button type="button" onClick={lookupByCode} className="shrink-0">
                      Agregar
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Tip: si el producto ya está en la lista, se suma la cantidad automáticamente.
                  </p>
                </div>
              ) : null}

              {/* Selector por lista (servicios / productos) */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">
                    {selectedType === "SERVICE" ? "Servicio (lista)" : "Producto (lista)"}
                  </Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue
                        placeholder={`Seleccionar ${selectedType === "SERVICE" ? "servicio" : "producto"}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedType === "SERVICE"
                        ? services.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name} • {money(num(s.price))}
                            </SelectItem>
                          ))
                        : products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {(p.sku ? `${p.sku} • ` : "")}
                              {p.name} • {money(num(p.price))}
                              {p.trackStock ? ` (${p.stockOnHand} disp.)` : ""}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-28">
                  <Label className="text-xs text-muted-foreground">Cant.</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>

                <Button
                  type="button"
                  className="md:self-end gap-2"
                  onClick={addFromSelect}
                  disabled={!selectedItemId}
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </Button>
              </div>

              {/* Tabla */}
              {items.length > 0 ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 text-xs font-semibold text-muted-foreground">Concepto</th>
                        <th className="text-center py-3 text-xs font-semibold text-muted-foreground">Tipo</th>
                        <th className="text-center py-3 text-xs font-semibold text-muted-foreground">Cantidad</th>
                        <th className="text-right py-3 text-xs font-semibold text-muted-foreground">Precio</th>
                        <th className="text-right py-3 text-xs font-semibold text-muted-foreground">Total</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {items.map((it) => (
                        <tr key={it.key}>
                          <td className="py-3">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {it.type === "PRODUCT" && it.code ? (
                                  <span className="text-muted-foreground mr-2">{it.code}</span>
                                ) : null}
                                {it.name}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {it.stockInfo ? (
                                  <span className="text-xs text-muted-foreground">{it.stockInfo}</span>
                                ) : null}
                                {it.requiresPrescription ? (
                                  <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
                                    Requiere receta
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 text-center">
                            <span
                              className={cn(
                                "text-xs px-2 py-1 rounded-full border",
                                it.type === "SERVICE"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              )}
                            >
                              {it.type === "SERVICE" ? "Servicio" : "Producto"}
                            </span>
                          </td>

                          <td className="py-3 text-center">
                            <Input
                              className="w-20 mx-auto text-center"
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => updateQty(it.key, Number(e.target.value) || 1)}
                            />
                          </td>

                          <td className="py-3 text-right text-muted-foreground">{money(it.unitPrice)}</td>
                          <td className="py-3 text-right font-semibold text-foreground">{money(it.lineTotal)}</td>

                          <td className="py-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeItem(it.key)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Agrega servicios o productos para empezar.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Totales + cobrar */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Resumen</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help"><HelpCircle className="w-4 h-4" /></span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    El sistema recalcula totales en el backend al guardar (esto evita inconsistencias).
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground/90">{money(subtotal)}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      Descuento
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help"><HelpCircle className="w-4 h-4" /></span>
                        </TooltipTrigger>
                        <TooltipContent>Descuento global de la factura (monto fijo).</TooltipContent>
                      </Tooltip>
                    </span>
                    <span className="text-foreground/90">-{money(discountApplied)}</span>
                  </div>

                  <Input
                    className="mt-2"
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                  />
                </div>

                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      ITBIS
                      <span className="text-xs text-muted-foreground ml-2">(opcional)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setApplyTax((v) => !v)}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full border",
                        applyTax ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                      )}
                    >
                      {applyTax ? "Aplicado" : "No"}
                    </button>
                  </div>

                  {applyTax ? (
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground">Tasa %</Label>
                      <Input
                        className="mt-1.5"
                        type="number"
                        min={0}
                        max={100}
                        value={taxRate}
                        onChange={(e) => setTaxRate(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Impuesto: <span className="text-foreground/90 font-medium">{money(tax)}</span>
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="pt-3 border-t flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{money(total)}</span>
                </div>
              </div>
            </div>

            {/* Cobrar ahora */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Cobro</h3>
                <button
                  type="button"
                  onClick={() => setPayNow((v) => !v)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-full border",
                    payNow ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                  )}
                >
                  {payNow ? "Cobrar ahora" : "Solo guardar"}
                </button>
              </div>

              {payNow ? (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Monto</label>
                    <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={payMethod === "CASH" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPayMethod("CASH")}
                    >
                      <Banknote className="w-4 h-4 mr-2" /> Efectivo
                    </Button>
                    <Button
                      type="button"
                      variant={payMethod === "CARD" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPayMethod("CARD")}
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> Tarjeta
                    </Button>
                    <Button
                      type="button"
                      variant={payMethod === "TRANSFER" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPayMethod("TRANSFER")}
                    >
                      <Building2 className="w-4 h-4 mr-2" /> Transfer
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Referencia (opcional)</Label>
                    <Input className="mt-1.5" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="voucher / transacción" />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Se creará la factura como pendiente (ISSUED).</p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <Link href="/invoices" className="flex-1">
                <Button variant="outline" className="w-full">Cancelar</Button>
              </Link>

              <Button
                className="flex-1 gap-2"
                disabled={!clientId || items.length === 0}
                onClick={() => submit(payNow ? "SAVE_AND_PAY" : "SAVE")}
              >
                <Save className="w-4 h-4" />
                {payNow ? "Crear y cobrar" : "Crear factura"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
