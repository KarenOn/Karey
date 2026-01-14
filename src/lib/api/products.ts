import type { ProductCreateInput, ProductUpdateInput } from "@/lib/validators/product";

export async function apiListProducts(params?: { q?: string; category?: string }) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category) sp.set("category", params.category);
  const res = await fetch(`/api/products${sp.toString() ? `?${sp.toString()}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error listando productos");
  return res.json();
}

export async function apiCreateProduct(data: ProductCreateInput) {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando producto");
  return res.json();
}

export async function apiUpdateProduct(id: number, data: ProductUpdateInput) {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error actualizando producto");
  return res.json();
}

export async function apiDeleteProduct(id: number) {
  const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando producto");
  return res.json();
}
