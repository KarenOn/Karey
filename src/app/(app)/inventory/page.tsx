"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import DataTable from "@/components/shared/Datatable";

import {
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  Pill,
  Boxes,
  TrendingDown,
  DollarSign,
  Search,
  Apple,
  Shirt,
  Sparkles,
  FileText,
} from "lucide-react";
import ModalDelete from "@/components/shared/ModalDelete";

/** =========================
 * Types (ajusta si tu API difiere)
 * ========================= */
type ProductRow = {
  id: number;
  name: string;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;

  cost?: any; // Prisma Decimal puede venir string
  price?: any;

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
  name?: string;
  sku?: string;
  category?: string;
  unit?: string;

  cost?: string | number;
  price?: string | number;

  trackStock?: boolean;
  stockOnHand?: string | number;
  minStock?: string | number;
  description: string | null;
  requiresPrescription?: boolean;

  isActive?: boolean;
};

/** =========================
 * UI Config
 * ========================= */
const categoryOptions = [
  { value: "Medicamento", label: "💊 Medicamento" },
  { value: "Vacuna", label: "💉 Vacuna" },
  { value: "Alimento", label: "🍖 Alimento" },
  { value: "Accesorio", label: "🎾 Accesorio" },
  { value: "Higiene", label: "🧴 Higiene" },
  { value: "Suplemento", label: "💪 Suplemento" },
  { value: "Equipo", label: "🔧 Equipo" },
  { value: "Otro", label: "📦 Otro" },
];

const categoryColors: Record<string, string> = {
  Medicamento: "bg-purple-100 text-purple-700 font-semibold",
  Vacuna: "bg-pink-100 text-pink-700 font-semibold",
  Alimento: "bg-orange-100 text-orange-700 font-semibold",
  Accesorio: "bg-blue-100 text-blue-700 font-semibold",
  Higiene: "bg-cyan-100 text-cyan-700 font-semibold",
  Suplemento: "bg-green-100 text-green-700 font-semibold",
  Equipo: "bg-slate-100 text-slate-700 font-semibold",
  Otro: "bg-gray-100 text-gray-700 font-semibold",
};

const categoryChips = [
  { key: "all", label: "Todos", icon: Boxes },
  { key: "medicines", label: "Medicamentos", icon: Pill },
  { key: "foods", label: "Alimentos", icon: Apple },
  { key: "accessories", label: "Accesorios", icon: Shirt },
  { key: "hygiene", label: "Higiene", icon: Sparkles },
  { key: "supplements", label: "Suplementos", icon: TrendingDown },
] as const;

type CategoryChipKey = (typeof categoryChips)[number]["key"];

/** =========================
 * Helpers
 * ========================= */
const toNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando data");
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Error creando producto");
  return res.json();
}

async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Error actualizando producto");
  return res.json();
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando producto");
}

/** =========================
 * Component
 * ========================= */
export default function Inventory() {
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryChipKey>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [formData, setFormData] = useState<ProductFormState>({
    trackStock: true,
    isActive: true,
    minStock: 5,
    stockOnHand: 0,
    description: "",
    requiresPrescription: false,
  });

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
    const [loadingDelete, setLoadingDelete] = useState(false);

    const askDelete = (row: ProductRow) => {
        setSelected({ id: row.id, name: row.name });
        setDeleteOpen(true);
    };

    const chipCounts = useMemo(() => {
        const cat = (p: ProductRow) => (p.category ?? "").toLowerCase();

        const medicines = products.filter((p) => {
            const c = cat(p);
            return c === "medicamento" || c === "vacuna";
        }).length;

        return {
            all: products.length,
            medicines,
            foods: products.filter((p) => cat(p) === "alimento").length,
            accessories: products.filter((p) => cat(p) === "accesorio").length,
            hygiene: products.filter((p) => cat(p) === "higiene").length,
            supplements: products.filter((p) => cat(p) === "suplemento").length,
        };
    }, [products]);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await apiGet<ProductRow[]>("/api/products");
      setProducts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts().catch(console.error);
  }, []);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const stock = toNumber(p.stockOnHand);
      const min = toNumber(p.minStock, 5);
      return p.trackStock && stock <= min;
    });
  }, [products]);

  const totalValue = useMemo(() => {
    return products.reduce((acc, p) => {
      const price = toNumber(p.price);
      const qty = toNumber(p.stockOnHand);
      return acc + price * qty;
    }, 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    const byCategory = (p: ProductRow) => {
      const c = (p.category ?? "").toLowerCase();

      if (activeCategory === "all") return true;

      if (activeCategory === "medicines") {
        return c === "medicamento" || c === "vacuna";
      }
      if (activeCategory === "foods") return c === "alimento";
      if (activeCategory === "accessories") return c === "accesorio";
      if (activeCategory === "hygiene") return c === "higiene";
      if (activeCategory === "supplements") return c === "suplemento";

      return true;
    };

    const bySearch = (p: ProductRow) => {
      if (!q) return true;
      const name = (p.name ?? "").toLowerCase();
      const sku = (p.sku ?? "").toLowerCase();
      const cat = (p.category ?? "").toLowerCase();
      return name.includes(q) || sku.includes(q) || cat.includes(q);
    };

    return products.filter((p) => byCategory(p) && bySearch(p));
  }, [products, search, activeCategory]);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      category: "",
      unit: "unidad",
      cost: "",
      price: "",
      trackStock: true,
      stockOnHand: 0,
      minStock: 5,
      isActive: true,
      description: "",
      requiresPrescription: false,
    });
    setModalOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditingProduct(p);
    setFormData({
      name: p.name ?? "",
      sku: p.sku ?? "",
      category: p.category ?? "",
      unit: p.unit ?? "unidad",
      cost: p.cost ?? "",
      price: p.price ?? "",
      trackStock: !!p.trackStock,
      stockOnHand: p.stockOnHand ?? 0,
      minStock: p.minStock ?? 5,
      isActive: !!p.isActive,
      description: p.description ?? "",
      requiresPrescription: !!p.requiresPrescription,
    });
    setModalOpen(true);
  };

  const handleChange = (e: any) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value ?? e;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();

    const payload = {
      name: String(formData.name ?? "").trim(),
      sku: formData.sku ? String(formData.sku).trim() : null,
      category: formData.category ? String(formData.category).trim() : null,
      unit: formData.unit ? String(formData.unit).trim() : "unidad",

      cost: formData.cost === "" || formData.cost == null ? null : toNumber(formData.cost),
      price: formData.price === "" || formData.price == null ? null : toNumber(formData.price),

      trackStock: !!formData.trackStock,
      stockOnHand: toNumber(formData.stockOnHand),
      minStock: toNumber(formData.minStock, 5),

      isActive: !!formData.isActive,
    };

    if (!payload.name) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (payload.price == null) {
      alert("El precio de venta es obligatorio.");
      return;
    }
    if (payload.trackStock && (payload.stockOnHand == null || payload.minStock == null)) {
      alert("Stock y stock mínimo son obligatorios si se controla inventario.");
      return;
    }

    try {
      if (editingProduct) {
        await apiPut(`/api/products/${editingProduct.id}`, payload);
      } else {
        await apiPost(`/api/products`, payload);
      }
      setModalOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el producto.");
    }
  };

  const remove = async () => {
    if (!selected) return;
    try {
      await apiDelete(`/api/products/${selected.id}`);
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el producto.");
    }
  };

  const columns = [
    {
      header: "Producto",
      cell: (row: ProductRow) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${
              categoryColors[row.category ?? ""] || "bg-slate-100 text-slate-700"
            } flex items-center justify-center`}
          >
            {(row.category === "Medicamento" || row.category === "Vacuna") ? (
              <Pill className="w-5 h-5" />
            ) : (
              <Package className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{row.name}</p>
            {row.description ? <p className="text-xs text-slate-500 flex gap-1 items-center"><FileText className="w-3 h-3" /> {row.description}</p> : null}
            {row.sku ? <p className="text-xs text-slate-500">SKU: {row.sku}</p> : null}
          </div>
        </div>
      ),
    },
    {
      header: "Categoría",
      cell: (row: ProductRow) =>
        row.category ? (
          <Badge className={`${categoryColors[row.category] || "bg-slate-100 text-slate-700 font-semibold"}`}>
            {row.category}
          </Badge>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      header: "Stock",
      cell: (row: ProductRow) => {
        const stock = toNumber(row.stockOnHand);
        const min = toNumber(row.minStock, 5);
        const isLow = row.trackStock && stock <= min;
        const isCritical = row.trackStock && stock === 0;

        return (
          <div className="flex items-center gap-2">
            {(isLow || isCritical) && (
              <AlertTriangle className={`w-4 h-4 ${isCritical ? "text-red-500" : "text-orange-500"}`} />
            )}
            <span className={`font-bold ${isCritical ? "text-red-600" : isLow ? "text-orange-600" : "text-slate-800"}`}>
              {stock}
            </span>
            <span className="text-slate-400 text-sm">/ min {min}</span>
          </div>
        );
      },
    },
    {
      header: "Precio",
      cell: (row: ProductRow) => (
        <span className="font-semibold text-slate-800">
          {money(toNumber(row.price))}
        </span>
      ),
    },
    {
      header: "Acciones",
      cell: (row: ProductRow) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
            <Edit className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); askDelete(row); }}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Inventario</h2>
          <p className="text-slate-500">Gestiona productos y medicamentos</p>
        </div>

        <Button
          onClick={openCreate}
          className="bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
        </Button>
      </div>

      {/* Cards (estilo imagen) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Boxes className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Productos</p>
            <p className="text-2xl font-bold text-slate-900">{products.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Stock Bajo</p>
            <p className="text-2xl font-bold text-slate-900">{lowStockProducts.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Valor Total</p>
            <p className="text-2xl font-bold text-slate-900">{money(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Category chips row (estilo imagen) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* <button
          type="button"
          className="w-10 h-10 rounded-xl border bg-white flex items-center justify-center shadow-sm"
          onClick={() => {
            const el = document.getElementById("inventory-search");
            el?.focus();
          }}
          aria-label="Buscar"
        >
          <Search className="w-4 h-4 text-slate-600" />
        </button> */}

        {categoryChips.map((c) => {
          const Icon = c.icon;
          const active = activeCategory === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCategory(c.key)}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition",
                active
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-700"}`} />
              <span className="text-sm font-medium">
                {c.label}{" "}
                <span className={active ? "text-white/90" : "text-slate-500"}>
                    ({chipCounts[c.key] ?? 0})
                </span>
              </span>
            </button>
          );
        })}

        {/* Search input (queda integrado visualmente) */}
        <div className="ml-auto w-full sm:w-72">
          <input
            id="inventory-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-white border rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-2">
        <DataTable
          columns={columns}
          data={filteredProducts}
          searchKey={undefined} // ya lo manejamos con input custom
          emptyMessage="No hay productos"
        />
      </div>

      {/* Modal Create/Edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} className="bg-emerald-700 hover:bg-emerald-800">
              {editingProduct ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </div>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Nombre"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="sm:col-span-2"
            />

            <FormField
              label="Categoría"
              name="category"
              type="select"
              value={formData.category || ""}
              onChange={handleChange}
              options={categoryOptions}
              required
            />

            <FormField label="SKU" name="sku" value={formData.sku} onChange={handleChange} />

            <FormField label="Unidad" name="unit" value={formData.unit} onChange={handleChange} placeholder="unidad, caja, dosis..." />

            <FormField
              label="Costo"
              name="cost"
              type="number"
              value={formData.cost}
              onChange={handleChange}
            />

            <FormField
              label="Precio Venta"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              required
            />

            <FormField
              label="Stock Actual"
              name="stockOnHand"
              type="number"
              value={formData.stockOnHand}
              onChange={handleChange}
              required
            />

            <FormField
              label="Stock Mínimo"
              name="minStock"
              type="number"
              value={formData.minStock}
              onChange={handleChange}
            />

            <FormField
              label="Controlar Stock"
              name="trackStock"
              type="switch"
              value={!!formData.trackStock}
              onChange={handleChange}
              placeholder="¿Deseas controlar inventario?"
            />

            <div className="sm:col-span-2">
                <FormField
                    label="Descripción"
                    name="description"
                    type="textarea"
                    value={formData.description || ""}
                    onChange={handleChange}
                    placeholder="Descripción del producto"
                />
            </div>
            

            <FormField
              label="Activo"
              name="isActive"
              type="switch"
              value={!!formData.isActive}
              onChange={handleChange}
              placeholder="Disponible para usar/vender"
            />

            <FormField
              label="Requerir Receta Médica"
              name="requiresPrescription"
              type="switch"
              value={!!formData.requiresPrescription}
              onChange={handleChange}
              placeholder="Requiere receta médica"
            />
          </div>
        </form>
      </Modal>

      <ModalDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar producto"
        itemName={selected?.name}
        loading={loadingDelete}
        onConfirm={remove}
      />
    </div>
  );
}
