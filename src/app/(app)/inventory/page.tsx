"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppAlert } from "@/components/shared/AppAlert";
import DataTable from "@/components/shared/Datatable";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import ModalDelete from "@/components/shared/ModalDelete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  DollarSign,
  Edit,
  FileText,
  Package,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  Waypoints,
} from "lucide-react";
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiListProducts,
  apiUpdateProduct,
} from "@/lib/api/products";
import {
  apiCreateStockMovement,
  apiListStockMovements,
  type StockMovementRow,
} from "@/lib/api/stock-movements";
import type { ProductCreateInput } from "@/lib/validators/product";
import type { StockMovementType } from "@/types/common";
import AppPageHero from "@/components/shared/AppPageHero";

type ProductRow = {
  id: number;
  name: string;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  cost?: string | number | null;
  price?: string | number | null;
  trackStock: boolean;
  stockOnHand: number;
  minStock: number;
  description: string | null;
  requiresPrescription?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProductFormState = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  cost: string | number;
  price: string | number;
  trackStock: boolean;
  stockOnHand: string | number;
  minStock: string | number;
  description: string;
  requiresPrescription: boolean;
  isActive: boolean;
};

type MovementFormState = {
  productId: string;
  type: StockMovementType;
  quantity: string;
  reason: string;
  referenceType: string;
  referenceId: string;
};

type AlertState = {
  variant: "success" | "info" | "warning" | "destructive";
  title: string;
  description?: string;
};

const emptyProductForm: ProductFormState = {
  name: "",
  sku: "",
  category: "",
  unit: "unidad",
  cost: "",
  price: "",
  trackStock: true,
  stockOnHand: 0,
  minStock: 5,
  description: "",
  requiresPrescription: false,
  isActive: true,
};

const emptyMovementForm: MovementFormState = {
  productId: "",
  type: "IN",
  quantity: "",
  reason: "",
  referenceType: "",
  referenceId: "",
};

const categoryOptions = [
  { value: "Medicamento", label: "Medicamento" },
  { value: "Vacuna", label: "Vacuna" },
  { value: "Alimento", label: "Alimento" },
  { value: "Accesorio", label: "Accesorio" },
  { value: "Higiene", label: "Higiene" },
  { value: "Suplemento", label: "Suplemento" },
  { value: "Equipo", label: "Equipo" },
  { value: "Otro", label: "Otro" },
];

const categoryColors: Record<string, string> = {
  Medicamento: "bg-violet-50 text-violet-700 border-violet-200",
  Vacuna: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  Alimento: "bg-amber-50 text-amber-700 border-amber-200",
  Accesorio: "bg-sky-50 text-sky-700 border-sky-200",
  Higiene: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Suplemento: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Equipo: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/20",
  Otro: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/20",
};

const movementTypeOptions: { value: StockMovementType; label: string }[] = [
  { value: "IN", label: "Entrada" },
  { value: "PURCHASE", label: "Compra" },
  { value: "OUT", label: "Salida" },
  { value: "SALE", label: "Venta" },
  { value: "EXPIRED", label: "Vencido" },
  { value: "ADJUST", label: "Ajuste" },
];

const movementTone: Record<StockMovementType, { label: string; badge: string }> = {
  IN: { label: "Entrada", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  PURCHASE: { label: "Compra", badge: "bg-teal-50 text-teal-700 border border-teal-200" },
  OUT: { label: "Salida", badge: "bg-rose-50 text-rose-700 border border-rose-200" },
  SALE: { label: "Venta", badge: "bg-red-50 text-red-700 border border-red-200" },
  EXPIRED: { label: "Vencido", badge: "bg-orange-50 text-orange-700 border border-orange-200" },
  ADJUST: { label: "Ajuste", badge: "bg-sky-50 text-sky-700 border border-sky-200" },
};

function toNumber(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getMovementDelta(type: StockMovementType, quantity: number) {
  if (type === "ADJUST") return quantity;
  if (type === "IN" || type === "PURCHASE") return quantity;
  return -Math.abs(quantity);
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("ALL");
  const [movementProductFilter, setMovementProductFilter] = useState("ALL");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [movementForm, setMovementForm] = useState<MovementFormState>(emptyMovementForm);
  const [selectedDelete, setSelectedDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ variant: "info", title: "" });

  async function loadInventory() {
    setLoading(true);
    try {
      const [productRows, movementRows] = await Promise.all([
        apiListProducts(),
        apiListStockMovements({ take: 200 }),
      ]);
      setProducts(Array.isArray(productRows) ? productRows : []);
      setMovements(Array.isArray(movementRows) ? movementRows : []);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo cargar inventario",
        description: getErrorMessage(error, "Intenta nuevamente."),
      });
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory().catch(() => undefined);
  }, []);

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => product.trackStock && product.stockOnHand <= product.minStock);
  }, [products]);

  const totalValue = useMemo(() => {
    return products.reduce((acc, product) => acc + toNumber(product.price) * product.stockOnHand, 0);
  }, [products]);

  const movementStats = useMemo(() => {
    const limitDate = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return movements.reduce(
      (acc, movement) => {
        const delta = getMovementDelta(movement.type, movement.quantity);
        if (delta > 0) acc.entries += delta;
        if (delta < 0) acc.exits += Math.abs(delta);
        if (new Date(movement.createdAt).getTime() >= limitDate) acc.recent += 1;
        return acc;
      },
      { entries: 0, exits: 0, recent: 0 }
    );
  }, [movements]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [products, productSearch]);

  const filteredMovements = useMemo(() => {
    const query = movementSearch.trim().toLowerCase();
    return movements.filter((movement) => {
      if (movementTypeFilter !== "ALL" && movement.type !== movementTypeFilter) return false;
      if (movementProductFilter !== "ALL" && String(movement.productId) !== movementProductFilter) return false;
      if (!query) return true;
      return [
        movement.product.name,
        movement.product.sku,
        movement.reason,
        movement.referenceType,
        movement.referenceId,
        movement.createdBy?.name,
        movement.createdBy?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [movements, movementSearch, movementTypeFilter, movementProductFilter]);

  const productOptions = useMemo(() => {
    return [...products]
      .filter((product) => product.trackStock)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => ({
        value: String(product.id),
        label: `${product.name} (${product.stockOnHand} ${product.unit ?? "unidad"})`,
      }));
  }, [products]);

  const selectedMovementProduct = useMemo(() => {
    const id = Number(movementForm.productId);
    return products.find((product) => product.id === id) ?? null;
  }, [movementForm.productId, products]);

  const movementQty = movementForm.quantity.trim() === "" ? 0 : toNumber(movementForm.quantity);
  const movementDelta = getMovementDelta(movementForm.type, movementQty);
  const movementNextStock = (selectedMovementProduct?.stockOnHand ?? 0) + movementDelta;
  const invalidMovement = !!selectedMovementProduct && movementNextStock < 0;

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductModalOpen(true);
  };

  const openEditProduct = (product: ProductRow) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name ?? "",
      sku: product.sku ?? "",
      category: product.category ?? "",
      unit: product.unit ?? "unidad",
      cost: product.cost ?? "",
      price: product.price ?? "",
      trackStock: !!product.trackStock,
      stockOnHand: product.stockOnHand,
      minStock: product.minStock,
      description: product.description ?? "",
      requiresPrescription: !!product.requiresPrescription,
      isActive: !!product.isActive,
    });
    setProductModalOpen(true);
  };

  const openMovementModal = (product?: ProductRow) => {
    const target = product?.trackStock ? product : products.find((item) => item.trackStock);
    setMovementForm({
      ...emptyMovementForm,
      productId: target ? String(target.id) : "",
    });
    setMovementModalOpen(true);
  };

  const handleProductChange = (event: FormFieldChangeEvent) => {
    const fieldName = event.target.name as keyof ProductFormState;
    setProductForm((prev) => ({ ...prev, [fieldName]: event.target.value as never }));
  };

  const handleMovementChange = (event: FormFieldChangeEvent) => {
    const fieldName = event.target.name as keyof MovementFormState;
    setMovementForm((prev) => ({ ...prev, [fieldName]: String(event.target.value ?? "") }));
  };

  const submitProduct = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const payload: ProductCreateInput = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || null,
      category: productForm.category.trim() || null,
      unit: productForm.unit.trim() || "unidad",
      cost: productForm.cost === "" ? null : toNumber(productForm.cost),
      price: productForm.price === "" ? null : toNumber(productForm.price),
      trackStock: !!productForm.trackStock,
      stockOnHand: toNumber(productForm.stockOnHand),
      minStock: toNumber(productForm.minStock),
      description: productForm.description.trim() || null,
      requiresPrescription: !!productForm.requiresPrescription,
      isActive: !!productForm.isActive,
    };

    if (!payload.name || payload.price == null) {
      setAlert({ variant: "warning", title: "Completa nombre y precio" });
      setAlertOpen(true);
      return;
    }

    setSavingProduct(true);
    try {
      if (editingProduct) await apiUpdateProduct(editingProduct.id, payload);
      else await apiCreateProduct(payload);
      setProductModalOpen(false);
      await loadInventory();
      setAlert({ variant: "success", title: editingProduct ? "Producto actualizado" : "Producto creado" });
      setAlertOpen(true);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo guardar el producto",
        description: getErrorMessage(error, "Intenta nuevamente."),
      });
      setAlertOpen(true);
    } finally {
      setSavingProduct(false);
    }
  };

  const submitMovement = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!movementForm.productId || movementForm.quantity.trim() === "") {
      setAlert({ variant: "warning", title: "Selecciona producto y cantidad" });
      setAlertOpen(true);
      return;
    }

    if (invalidMovement) {
      setAlert({ variant: "warning", title: "El movimiento deja stock negativo" });
      setAlertOpen(true);
      return;
    }

    setSavingMovement(true);
    try {
      await apiCreateStockMovement({
        productId: Number(movementForm.productId),
        type: movementForm.type,
        quantity: movementQty,
        reason: movementForm.reason.trim() || null,
        referenceType: movementForm.referenceType.trim() || null,
        referenceId: movementForm.referenceId.trim() || null,
      });
      setMovementModalOpen(false);
      await loadInventory();
      setAlert({ variant: "success", title: "Movimiento registrado" });
      setAlertOpen(true);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo registrar el movimiento",
        description: getErrorMessage(error, "Intenta nuevamente."),
      });
      setAlertOpen(true);
    } finally {
      setSavingMovement(false);
    }
  };

  const removeProduct = async () => {
    if (!selectedDelete) return;
    setLoadingDelete(true);
    try {
      await apiDeleteProduct(selectedDelete.id);
      setDeleteOpen(false);
      await loadInventory();
      setAlert({ variant: "success", title: "Producto eliminado" });
      setAlertOpen(true);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No se pudo eliminar el producto",
        description: getErrorMessage(error, "Puede estar relacionado a otros registros."),
      });
      setAlertOpen(true);
    } finally {
      setLoadingDelete(false);
    }
  };

  const productColumns = [
    {
      header: "Producto",
      cell: (row: ProductRow) => (
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${categoryColors[row.category ?? "Otro"] || categoryColors.Otro}`}>
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-foreground">{row.name}</p>
              {!row.isActive && <Badge variant="outline">Inactivo</Badge>}
              {!row.trackStock && <Badge variant="outline">Sin control</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {row.sku ? <span>SKU: {row.sku}</span> : null}
              {row.unit ? <span>Unidad: {row.unit}</span> : null}
              {row.requiresPrescription ? (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Requiere receta
                </span>
              ) : null}
            </div>
            {row.description ? (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {row.description}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      header: "Categoria",
      cell: (row: ProductRow) =>
        row.category ? <Badge className={categoryColors[row.category] || categoryColors.Otro}>{row.category}</Badge> : <span className="text-muted-foreground/60">Sin categoria</span>,
    },
    {
      header: "Stock",
      cell: (row: ProductRow) =>
        row.trackStock ? (
          <div className="flex items-center gap-2">
            {row.stockOnHand <= row.minStock && (
              <AlertTriangle className={`h-4 w-4 ${row.stockOnHand === 0 ? "text-rose-500" : "text-amber-500"}`} />
            )}
            <span className={`font-semibold ${row.stockOnHand === 0 ? "text-rose-600" : row.stockOnHand <= row.minStock ? "text-amber-600" : "text-foreground"}`}>{row.stockOnHand}</span>
            <span className="text-sm text-muted-foreground/70">/ min {row.minStock}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/60">No aplica</span>
        ),
    },
    {
      header: "Precio",
      cell: (row: ProductRow) => (
        <div>
          <div className="font-semibold text-foreground">{money(toNumber(row.price))}</div>
          <div className="text-xs text-muted-foreground">Costo: {row.cost == null ? "-" : money(toNumber(row.cost))}</div>
        </div>
      ),
    },
    {
      header: "Acciones",
      cell: (row: ProductRow) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" disabled={!row.trackStock} onClick={() => openMovementModal(row)}>
            <Waypoints className="h-4 w-4 text-emerald-700" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEditProduct(row)}>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => { setSelectedDelete({ id: row.id, name: row.name }); setDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      ),
    },
  ];

  const movementColumns = [
    {
      header: "Fecha",
      cell: (row: StockMovementRow) => (
        <div>
          <div className="font-medium text-foreground">{formatDateTime(row.createdAt)}</div>
          <div className="text-xs text-muted-foreground">{row.createdBy?.name || row.createdBy?.email || "Sistema"}</div>
        </div>
      ),
    },
    {
      header: "Producto",
      cell: (row: StockMovementRow) => (
        <div>
          <div className="font-medium text-foreground">{row.product.name}</div>
          <div className="text-xs text-muted-foreground">{row.product.sku ? `SKU ${row.product.sku}` : row.product.category || "Sin categoria"}</div>
        </div>
      ),
    },
    {
      header: "Tipo",
      cell: (row: StockMovementRow) => <Badge className={movementTone[row.type].badge}>{movementTone[row.type].label}</Badge>,
    },
    {
      header: "Impacto",
      cell: (row: StockMovementRow) => {
        const delta = getMovementDelta(row.type, row.quantity);
        const positive = delta > 0;
        return (
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            </div>
            <div>
              <div className={`font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>{signed(delta)}</div>
              <div className="text-xs text-muted-foreground">{row.product.unit || "unidades"}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Detalle",
      cell: (row: StockMovementRow) => (
        <div>
          <div className="text-sm text-muted-foreground">{row.reason || "Sin motivo"}</div>
          {(row.referenceType || row.referenceId) && <div className="text-xs text-muted-foreground">Ref: {[row.referenceType, row.referenceId].filter(Boolean).join(" / ")}</div>}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <div className="app-page-hero text-foreground">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="app-kicker border-0">Control de inventario</Badge>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">Inventario y movimientos</h2>
            <p className="mt-2 text-sm text-muted-foreground">Gestiona productos y registra entradas, salidas y ajustes desde el mismo modulo.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => openMovementModal()}>
              <Waypoints className="mr-2 h-4 w-4" />
              Registrar movimiento
            </Button>
            <Button onClick={openCreateProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        </div>
      </div> */}

      <AppPageHero
        badgeIcon={<Package className="size-3.5" />}
        badgeLabel="Inventario"
        title="Inventario y movimientos"
        description="Gestiona productos y registra entradas, salidas y ajustes desde el mismo modulo."
        actions={
          // <Button onClick={() => openCreateAt(selectedDay, timeSlots[0] ?? "09:00")}>
          //   <Plus className="mr-2 h-4 w-4" />
          //   Nueva Cita
          // </Button>
          <>
            <Button variant="outline" onClick={() => openMovementModal()}>
              <Waypoints className="mr-2 h-4 w-4" />
              Registrar movimiento
            </Button>
            <Button onClick={openCreateProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          </>
        }
        stats={[
          { label: "Productos", value: products.length, hint: "Productos cargados" },
          { label: "Stock", value: lowStockProducts.length, hint: "Stock bajo" },
          { label: "Movimientos", value: movementStats.recent, hint: "Movimientos recientes" },
          { label: "Valor", value: totalValue, hint: "Stock valorizado" },
        ]}
      />

      {/* <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="app-stat-card">
          <div className="flex items-center justify-between">
            <div className="app-stat-icon"><Boxes className="h-5 w-5" /></div>
            <Badge variant="outline">{products.length} items</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Productos cargados</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{products.length}</p>
        </div>
        <div className="app-stat-card">
          <div className="flex items-center justify-between">
            <div className="app-stat-icon text-[var(--brand-gold)]"><AlertTriangle className="h-5 w-5" /></div>
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Alerta</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Stock bajo</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{lowStockProducts.length}</p>
        </div>
        <div className="app-stat-card">
          <div className="flex items-center justify-between">
            <div className="app-stat-icon"><RefreshCcw className="h-5 w-5" /></div>
            <Badge className="bg-sky-50 text-sky-700 border border-sky-200">7 dias</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Movimientos recientes</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{movementStats.recent}</p>
        </div>
        <div className="app-stat-card">
          <div className="flex items-center justify-between">
            <div className="app-stat-icon"><DollarSign className="h-5 w-5" /></div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Valor</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Stock valorizado</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{money(totalValue)}</p>
        </div>
      </div> */}

      <Tabs defaultValue="products" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-auto rounded-2xl p-1">
            <TabsTrigger value="products" className="rounded-xl px-4 py-2">Productos</TabsTrigger>
            <TabsTrigger value="movements" className="rounded-xl px-4 py-2">Movimientos</TabsTrigger>
          </TabsList>
          <Button variant="outline" className="rounded-xl" onClick={loadInventory}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        <TabsContent value="products" className="space-y-4">
          <div className="app-toolbar">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold text-foreground">Catalogo de productos</h3>
                <p className="text-sm text-muted-foreground">Edita precios, stock, receta y datos generales.</p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar por nombre, SKU o categoria" className="pl-10" />
              </div>
            </div>
          </div>
          <DataTable columns={productColumns} data={filteredProducts} searchKey={undefined} emptyMessage="No hay productos para mostrar" />
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="app-panel-strong p-5">
              <h3 className="font-display text-2xl font-semibold text-foreground">Bitacora de movimientos</h3>
              <p className="text-sm text-muted-foreground">Consulta entradas, salidas, compras, ventas y ajustes.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Entradas</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">{movementStats.entries}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-rose-700">Salidas</p>
                  <p className="mt-2 text-2xl font-bold text-rose-900">{movementStats.exits}</p>
                </div>
              </div>
            </div>
            <div className="app-panel-strong p-5">
              <p className="text-sm text-muted-foreground">Vista previa del movimiento</p>
              <div className="mt-3 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-foreground">{movementTone[movementForm.type].label}</h4>
                <Badge className={movementTone[movementForm.type].badge}>{movementTone[movementForm.type].label}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="app-panel-muted p-4"><p className="text-xs text-muted-foreground">Actual</p><p className="mt-2 text-xl font-semibold text-foreground">{selectedMovementProduct?.stockOnHand ?? "-"}</p></div>
                <div className="app-panel-muted p-4"><p className="text-xs text-muted-foreground">Cambio</p><p className={`mt-2 text-xl font-semibold ${movementDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{movementForm.quantity.trim() ? signed(movementDelta) : "-"}</p></div>
                <div className="app-panel-muted p-4"><p className="text-xs text-muted-foreground">Final</p><p className={`mt-2 text-xl font-semibold ${invalidMovement ? "text-rose-700" : "text-foreground"}`}>{selectedMovementProduct ? movementNextStock : "-"}</p></div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{selectedMovementProduct ? `Producto: ${selectedMovementProduct.name}` : "Selecciona un producto con control de stock."}</p>
            </div>
          </div>

            <div className="app-panel-strong p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_280px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="Buscar por producto, referencia o usuario" className="rounded-xl bg-input/60 pl-10" />
              </div>
              <FormField label="Tipo" name="movementTypeFilter" type="select" value={movementTypeFilter} onChange={(event: { target: { name: string; value: string | number | boolean } }) => setMovementTypeFilter(String(event.target.value))} options={[{ value: "ALL", label: "Todos" }, ...movementTypeOptions]} />
              <FormField label="Producto" name="movementProductFilter" type="select" value={movementProductFilter} onChange={(event: { target: { name: string; value: string | number | boolean } }) => setMovementProductFilter(String(event.target.value))} options={[{ value: "ALL", label: "Todos" }, ...productOptions]} />
            </div>
          </div>
          <DataTable columns={movementColumns} data={filteredMovements} searchKey={undefined} emptyMessage="No hay movimientos registrados" />
        </TabsContent>
      </Tabs>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title={editingProduct ? "Editar producto" : "Nuevo producto"} size="lg" footer={<div className="flex gap-3"><Button variant="outline" onClick={() => setProductModalOpen(false)}>Cancelar</Button><Button onClick={submitProduct} className="bg-emerald-700 hover:bg-emerald-800" disabled={savingProduct}>{savingProduct ? "Guardando..." : editingProduct ? "Guardar cambios" : "Crear producto"}</Button></div>}>
        <form onSubmit={submitProduct} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre" name="name" value={productForm.name} onChange={handleProductChange} required className="sm:col-span-2" />
          <FormField label="Categoria" name="category" type="select" value={productForm.category} onChange={handleProductChange} options={categoryOptions} />
          <FormField label="SKU" name="sku" value={productForm.sku} onChange={handleProductChange} />
          <FormField label="Unidad" name="unit" value={productForm.unit} onChange={handleProductChange} placeholder="unidad, caja, dosis" />
          <FormField label="Costo" name="cost" type="number" value={productForm.cost} onChange={handleProductChange} />
          <FormField label="Precio de venta" name="price" type="number" value={productForm.price} onChange={handleProductChange} required />
          <FormField label="Stock actual" name="stockOnHand" type="number" value={productForm.stockOnHand} onChange={handleProductChange} />
          <FormField label="Stock minimo" name="minStock" type="number" value={productForm.minStock} onChange={handleProductChange} />
          <FormField label="Control de stock" name="trackStock" type="switch" value={productForm.trackStock} onChange={handleProductChange} placeholder="Activar seguimiento de inventario" />
          <FormField label="Activo" name="isActive" type="switch" value={productForm.isActive} onChange={handleProductChange} placeholder="Disponible para venta y uso" />
          <FormField label="Requiere receta" name="requiresPrescription" type="switch" value={productForm.requiresPrescription} onChange={handleProductChange} placeholder="Solicitar receta medica" />
          <div className="sm:col-span-2">
            <FormField label="Descripcion" name="description" type="textarea" value={productForm.description} onChange={handleProductChange} placeholder="Notas o detalles del producto" />
          </div>
        </form>
      </Modal>

      <Modal open={movementModalOpen} onClose={() => setMovementModalOpen(false)} title="Registrar movimiento" size="lg" footer={<div className="flex gap-3"><Button variant="outline" onClick={() => setMovementModalOpen(false)}>Cancelar</Button><Button onClick={submitMovement} className="bg-emerald-700 hover:bg-emerald-800" disabled={savingMovement}>{savingMovement ? "Registrando..." : "Guardar movimiento"}</Button></div>}>
        <form onSubmit={submitMovement} className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <FormField label="Producto" name="productId" type="select" value={movementForm.productId} onChange={handleMovementChange} options={productOptions} required />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Tipo" name="type" type="select" value={movementForm.type} onChange={handleMovementChange} options={movementTypeOptions} required />
              <FormField label={movementForm.type === "ADJUST" ? "Ajuste (+/-)" : "Cantidad"} name="quantity" type="number" value={movementForm.quantity} onChange={handleMovementChange} placeholder={movementForm.type === "ADJUST" ? "Ej: -3 o 5" : "Ej: 10"} required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Tipo de referencia" name="referenceType" value={movementForm.referenceType} onChange={handleMovementChange} placeholder="COMPRA, FACTURA..." />
              <FormField label="ID de referencia" name="referenceId" value={movementForm.referenceId} onChange={handleMovementChange} placeholder="F-1024" />
            </div>
            <FormField label="Motivo" name="reason" type="textarea" value={movementForm.reason} onChange={handleMovementChange} placeholder="Describe por que se realiza este movimiento" />
          </div>
          <div className="app-panel-muted p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-foreground">{movementTone[movementForm.type].label}</h4>
              <Badge className={movementTone[movementForm.type].badge}>{movementTone[movementForm.type].label}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-background/80 p-4"><p className="text-xs text-muted-foreground">Producto</p><p className="mt-2 font-semibold text-foreground">{selectedMovementProduct?.name || "Selecciona un producto"}</p></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-background/80 p-4"><p className="text-xs text-muted-foreground">Actual</p><p className="mt-2 text-xl font-semibold text-foreground">{selectedMovementProduct?.stockOnHand ?? "-"}</p></div>
                <div className="rounded-2xl bg-background/80 p-4"><p className="text-xs text-muted-foreground">Delta</p><p className={`mt-2 text-xl font-semibold ${movementDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{movementForm.quantity.trim() ? signed(movementDelta) : "-"}</p></div>
                <div className="rounded-2xl bg-background/80 p-4"><p className="text-xs text-muted-foreground">Final</p><p className={`mt-2 text-xl font-semibold ${invalidMovement ? "text-rose-700" : "text-foreground"}`}>{selectedMovementProduct ? movementNextStock : "-"}</p></div>
              </div>
              <div className={`rounded-2xl border p-4 text-sm ${invalidMovement ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{invalidMovement ? "El movimiento no es valido porque deja el stock en negativo." : "La vista previa te muestra el stock resultante antes de guardar."}</div>
            </div>
          </div>
        </form>
      </Modal>

      <ModalDelete open={deleteOpen} onOpenChange={setDeleteOpen} title="Eliminar producto" itemName={selectedDelete?.name} loading={loadingDelete} onConfirm={removeProduct} />
      <AppAlert open={alertOpen} onOpenChange={setAlertOpen} variant={alert.variant} title={alert.title} description={alert.description} />
    </div>
  );
}
