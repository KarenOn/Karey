"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppAlert } from "@/components/shared/AppAlert";
import DataTable from "@/components/shared/Datatable";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import ModalDelete from "@/components/shared/ModalDelete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Edit,
  FileText,
  Package,
  Plus,
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
import { useCurrentUserAccess } from "@/components/layout/current-user-context";

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
  const access = useCurrentUserAccess();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [productSearch, setProductSearch] = useState("");
    const [productStatusFilter, setProductStatusFilter] = useState("ALL");
    const [productCategoryFilter, setProductCategoryFilter] = useState("ALL");
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
  const canCreateInventory = !!access?.actions.inventory.create;
  const canUpdateInventory = !!access?.actions.inventory.update;
  const canDeleteInventory = !!access?.actions.inventory.delete;

  async function loadInventory(showLoading = true) {
    if (showLoading) setLoading(true);
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
    return products.filter((product) => {
      const statusMatches = productStatusFilter === "ALL" || (productStatusFilter === "ACTIVE" ? product.isActive : !product.isActive);
      const categoryMatches = productCategoryFilter === "ALL" || (product.category || "Otro") === productCategoryFilter;
      return statusMatches && categoryMatches;
    });
  }, [products, productStatusFilter, productCategoryFilter]);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      if (movementTypeFilter !== "ALL" && movement.type !== movementTypeFilter) return false;
      if (movementProductFilter !== "ALL" && String(movement.productId) !== movementProductFilter) return false;
      return true;
    });
  }, [movements, movementTypeFilter, movementProductFilter]);

  const productCategories = useMemo(() => Array.from(new Set(products.map((product) => product.category || "Otro"))).sort((a, b) => a.localeCompare(b, "es")), [products]);

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
    if (!canCreateInventory) return;
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductModalOpen(true);
  };

  const openEditProduct = (product: ProductRow) => {
    if (!canUpdateInventory) return;
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
    if (!canUpdateInventory) return;
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
    if ((editingProduct && !canUpdateInventory) || (!editingProduct && !canCreateInventory)) {
      setAlert({ variant: "warning", title: "No tienes permisos para guardar productos" });
      setAlertOpen(true);
      return;
    }
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
      await loadInventory(false);
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
    if (!canUpdateInventory) {
      setAlert({ variant: "warning", title: "No tienes permisos para registrar movimientos" });
      setAlertOpen(true);
      return;
    }

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
      await loadInventory(false);
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
    if (!canDeleteInventory) {
      setAlert({ variant: "warning", title: "No tienes permisos para eliminar productos" });
      setAlertOpen(true);
      return;
    }
    setLoadingDelete(true);
    try {
      await apiDeleteProduct(selectedDelete.id);
      setDeleteOpen(false);
      await loadInventory(false);
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
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${categoryColors[row.category ?? "Otro"] || categoryColors.Otro}`}>
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
          {canUpdateInventory ? (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" disabled={!row.trackStock} onClick={() => openMovementModal(row)}>
              <Waypoints className="h-4 w-4 text-emerald-700" />
            </Button>
          ) : null}
          {canUpdateInventory ? (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEditProduct(row)}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : null}
          {canDeleteInventory ? (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => { setSelectedDelete({ id: row.id, name: row.name }); setDeleteOpen(true); }}>
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          ) : null}
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
      <AppPageHero
        badgeIcon={<Package className="size-3.5" />}
        badgeLabel="Inventario"
        title="Inventario y movimientos"
        description="Gestiona productos y registra entradas, salidas y ajustes desde el mismo modulo."
        actions={
          <>
            {canUpdateInventory ? (
              <Button variant="outline" onClick={() => openMovementModal()}>
                <Waypoints className="mr-2 h-4 w-4" />
                Registrar movimiento
              </Button>
            ) : null}
            {canCreateInventory ? (
              <Button onClick={openCreateProduct}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo producto
              </Button>
            ) : null}
          </>
        }
        stats={[
          { label: "Productos", value: products.length, hint: "Productos cargados" },
          { label: "Stock", value: lowStockProducts.length, hint: "Stock bajo" },
          { label: "Movimientos", value: movementStats.recent, hint: "Movimientos recientes" },
          { label: "Valor", value: totalValue, hint: "Stock valorizado" },
        ]}
      />

      <Tabs defaultValue="products" className="space-y-5">
        <TabsList className="h-10 rounded-lg p-1">
          <TabsTrigger value="products" className="rounded-md px-4 py-2">Productos</TabsTrigger>
          <TabsTrigger value="movements" className="rounded-md px-4 py-2">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div>
            <h2 className="app-heading text-[2rem] text-foreground sm:text-[2.35rem]">Catalogo de productos</h2>
            <p className="mt-2 text-sm text-muted-foreground">Edita precios, stock, receta y datos generales.</p>
          </div>
          <DataTable
            title="Productos"
            columns={productColumns}
            data={filteredProducts}
            searchKeys={["name", "sku", "category", "description"]}
            searchValue={productSearch}
            onSearchChange={setProductSearch}
            searchPlaceholder="Buscar por nombre, SKU o categoria..."
            emptyMessage="No hay productos que coincidan con los filtros."
            actions={
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[10rem_12rem]">
                <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                  <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las categorias</SelectItem>
                    {productCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <div>
            <h2 className="app-heading text-[2rem] text-foreground sm:text-[2.35rem]">Movimientos de inventario</h2>
            <p className="mt-2 text-sm text-muted-foreground">Consulta las entradas, salidas, compras, ventas y ajustes registrados.</p>
          </div>
          <DataTable
            title="Movimientos"
            columns={movementColumns}
            data={filteredMovements}
            searchValue={movementSearch}
            onSearchChange={setMovementSearch}
            searchPredicate={(movement, query) => !query || [movement.product.name, movement.product.sku, movement.reason, movement.referenceType, movement.referenceId, movement.createdBy?.name, movement.createdBy?.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))}
            searchPlaceholder="Buscar por producto, referencia o usuario..."
            emptyMessage="No hay movimientos que coincidan con los filtros."
            actions={<div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[10rem_12rem]"><Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los movimientos</SelectItem>{movementTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><Select value={movementProductFilter} onValueChange={setMovementProductFilter}><SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los productos</SelectItem>{productOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>}
          />
        </TabsContent>
      </Tabs>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title={editingProduct ? "Editar producto" : "Nuevo producto"} size="lg" footer={<div className="flex gap-3"><Button variant="outline" onClick={() => setProductModalOpen(false)}>Cancelar</Button>{(editingProduct ? canUpdateInventory : canCreateInventory) ? <Button onClick={submitProduct} className="bg-emerald-700 hover:bg-emerald-800" disabled={savingProduct}>{savingProduct ? "Guardando..." : editingProduct ? "Guardar cambios" : "Crear producto"}</Button> : null}</div>}>
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

      <Modal open={movementModalOpen} onClose={() => setMovementModalOpen(false)} title="Registrar movimiento" size="lg" footer={<div className="flex gap-3"><Button variant="outline" onClick={() => setMovementModalOpen(false)}>Cancelar</Button>{canUpdateInventory ? <Button onClick={submitMovement} className="bg-emerald-700 hover:bg-emerald-800" disabled={savingMovement}>{savingMovement ? "Registrando..." : "Guardar movimiento"}</Button> : null}</div>}>
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
              <div className="rounded-lg bg-background/80 p-4"><p className="text-xs text-muted-foreground">Producto</p><p className="mt-2 font-semibold text-foreground">{selectedMovementProduct?.name || "Selecciona un producto"}</p></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-background/80 p-4"><p className="text-xs text-muted-foreground">Actual</p><p className="mt-2 text-xl font-semibold text-foreground">{selectedMovementProduct?.stockOnHand ?? "-"}</p></div>
                <div className="rounded-lg bg-background/80 p-4"><p className="text-xs text-muted-foreground">Delta</p><p className={`mt-2 text-xl font-semibold ${movementDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{movementForm.quantity.trim() ? signed(movementDelta) : "-"}</p></div>
                <div className="rounded-lg bg-background/80 p-4"><p className="text-xs text-muted-foreground">Final</p><p className={`mt-2 text-xl font-semibold ${invalidMovement ? "text-rose-700" : "text-foreground"}`}>{selectedMovementProduct ? movementNextStock : "-"}</p></div>
              </div>
              <div className={`rounded-lg border p-4 text-sm ${invalidMovement ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{invalidMovement ? "El movimiento no es valido porque deja el stock en negativo." : "La vista previa te muestra el stock resultante antes de guardar."}</div>
            </div>
          </div>
        </form>
      </Modal>

      <ModalDelete open={deleteOpen} onOpenChange={setDeleteOpen} title="Eliminar producto" itemName={selectedDelete?.name} loading={loadingDelete} onConfirm={removeProduct} />
      <AppAlert open={alertOpen} onOpenChange={setAlertOpen} variant={alert.variant} title={alert.title} description={alert.description} />
    </div>
  );
}
