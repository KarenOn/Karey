"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Clock, DollarSign, Stethoscope, Search, ToggleLeft, ToggleRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import type { ServiceRow } from "@/lib/api/services";
import { apiCreateService, apiDeleteService, apiListServices, apiSetServiceStatus, apiUpdateService } from "@/lib/api/services";

const categoryOptions = [
  { value: "Consulta", label: "🩺 Consulta" },
  { value: "Cirugía", label: "🔪 Cirugía" },
  { value: "Vacunación", label: "💉 Vacunación" },
  { value: "Laboratorio", label: "🔬 Laboratorio" },
  { value: "Imagen", label: "📷 Imagen" },
  { value: "Estética", label: "✨ Estética" },
  { value: "Hospitalización", label: "🏥 Hospitalización" },
  { value: "Emergencia", label: "🚨 Emergencia" },
  { value: "Otro", label: "📋 Otro" },
] as const;

const categoryColors: Record<string, string> = {
  Consulta: "bg-sky-50 text-sky-700 border-sky-200",
  Cirugía: "bg-rose-50 text-rose-700 border-rose-200",
  Vacunación: "bg-pink-50 text-pink-700 border-pink-200",
  Laboratorio: "bg-purple-50 text-purple-700 border-purple-200",
  Imagen: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Estética: "bg-amber-50 text-amber-700 border-amber-200",
  Hospitalización: "bg-teal-50 text-teal-700 border-teal-200",
  Emergencia: "bg-orange-50 text-orange-700 border-orange-200",
  Otro: "bg-slate-50 text-slate-700 border-slate-200",
};

function money(n: number) {
  return n.toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}
function num(v: unknown) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

type FormState = {
  name: string;
  category: string;
  price: number;
  durationMins: number | "";
  description: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  category: "Consulta",
  price: 0,
  durationMins: "",
  description: "",
  isActive: true,
};

export default function ServicesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiListServices({ take: 600 });
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((s) => {
      if (onlyActive && !s.isActive) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        (s.category ?? "").toLowerCase().includes(term) ||
        (s.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, onlyActive]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, ServiceRow[]>>((acc, s) => {
      const cat = s.category ?? "Otro";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});
  }, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditing(s);
    setForm({
      name: s.name,
      category: s.category ?? "Otro",
      price: num(s.price),
      durationMins: s.durationMins ?? "",
      description: s.description ?? "",
      isActive: s.isActive,
    });
    setOpen(true);
  };

  const submit = async () => {
    setErr(null);

    if (!form.name.trim()) {
      setErr("Nombre requerido.");
      return;
    }

    try {
      if (editing) {
        await apiUpdateService(editing.id, {
          name: form.name.trim(),
          category: form.category || undefined,
          description: form.description?.trim() || undefined,
          price: form.price,
          durationMins: form.durationMins === "" ? undefined : Number(form.durationMins),
          isActive: form.isActive,
        });
      } else {
        await apiCreateService({
          name: form.name.trim(),
          category: form.category || undefined,
          description: form.description?.trim() || undefined,
          price: form.price,
          durationMins: form.durationMins === "" ? undefined : Number(form.durationMins),
          isActive: form.isActive,
        });
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error guardando servicio");
    }
  };

  const toggleStatus = async (s: ServiceRow) => {
    setErr(null);
    try {
      await apiSetServiceStatus(s.id, !s.isActive);
      setRows((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: !s.isActive } : x)));
    } catch (e: any) {
      setErr(e?.message ?? "Error cambiando estado");
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    setErr(null);
    try {
      await apiDeleteService(deleteId);
      setDeleteId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error eliminando servicio");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servicios</h1>
          <p className="text-muted-foreground">Catálogo de servicios veterinarios</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOnlyActive((v) => !v)} className="gap-2">
            {onlyActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {onlyActive ? "Mostrando activos" : "Mostrando todos"}
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo servicio
          </Button>
        </div>
      </div>

      {/* Search + Errors */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, categoría o descripción..." className="pl-9" />
        </div>

        <Badge variant="secondary" className="rounded-full w-fit">
          {filtered.length} servicios
        </Badge>
      </div>

      {err ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTitle>Ocurrió un problema</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-56 bg-muted rounded mt-3" />
              <div className="h-8 w-28 bg-muted rounded mt-5" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No hay servicios</h3>
          <p className="text-muted-foreground mt-1">Crea tu catálogo para facturación y agenda.</p>
          <Button className="mt-6 gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Agregar servicio
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, list]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs px-2 py-1 rounded-full border font-bold", categoryColors[category] ?? categoryColors.Otro)}>
                  {category}
                </span>
                <span className="text-sm text-muted-foreground">{list.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:shadow-primary/5 transition",
                      !s.isActive && "opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{s.name}</p>
                        {s.description ? (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">Sin descripción</p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(s)} title="Activar/Desactivar">
                          {s.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1 text-emerald-700">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-bold">{money(num(s.price))}</span>
                      </div>

                      {s.durationMins ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{s.durationMins} min</span>
                        </div>
                      ) : null}

                      {!s.isActive ? (
                        <Badge variant="secondary" className="ml-auto">Inactivo</Badge>
                      ) : (
                        <Badge className="ml-auto bg-emerald-50 text-emerald-700 border border-emerald-200">Activo</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                className="mt-1.5"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Consulta general"
              />
            </div>

            <div>
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Precio</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: Math.max(0, Number(e.target.value) || 0) }))}
                />
              </div>

              <div>
                <Label>Duración (min)</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={0}
                  value={form.durationMins}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((p) => ({ ...p, durationMins: v === "" ? "" : Math.max(0, Number(v) || 0) }));
                  }}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                className="mt-1.5"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Opcional (se imprime/usa en facturación)"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Si está inactivo no se muestra en POS.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                className="gap-2"
              >
                {form.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {form.isActive ? "Sí" : "No"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>{editing ? "Guardar cambios" : "Crear servicio"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto lo removerá del catálogo. Si ya fue usado en facturas previas, no borra las facturas; solo se desvincula donde aplique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
