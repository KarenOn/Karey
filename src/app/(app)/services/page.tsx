"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Modal from "@/components/shared/Modal";
import AppPageHero from "@/components/shared/AppPageHero";
import DataTable, { type DataTableColumn } from "@/components/shared/Datatable";
import ModalDelete from "@/components/shared/ModalDelete";
import StatusBadge from "@/components/shared/StatusBadge";
import { AppAlert } from "@/components/shared/AppAlert";
import { useCurrentUserAccess, useCurrentUserProfile } from "@/components/layout/current-user-context";
import { apiCreateService, apiDeleteService, apiListServices, apiUpdateService, type ServiceRow } from "@/lib/api/services";
import { countActiveServicesWithoutDuration } from "@/lib/service-stats";
import { toMoney } from "@/lib/utility";
import { toast } from "sonner";
import { ServiceCreateSchema, zodFieldErrors } from "@/lib/validators/service";

const formCategories = ["Consulta", "Cirugia", "Vacunacion", "Laboratorio", "Imagen", "Estetica", "Hospitalizacion", "Emergencia", "Otro"];

type FormState = { name: string; category: string; price: number; durationMins: number | ""; description: string; isActive: boolean };
const emptyForm: FormState = { name: "", category: "Consulta", price: 0, durationMins: "", description: "", isActive: true };

export default function ServicesPage() {
  const access = useCurrentUserAccess();
  const profile = useCurrentUserProfile();
  const currency = profile?.clinicCurrency ?? "DOP";
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ServiceRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<{ variant: "success" | "info" | "warning" | "destructive"; title: string; description?: string }>({ variant: "info", title: "" });

  const canCreate = !!access?.actions.services.create;
  const canUpdate = !!access?.actions.services.update;
  const canDelete = !!access?.actions.services.delete;

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setRows(await apiListServices({ take: 600 })); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los servicios."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const categories = useMemo(() => Array.from(new Set(rows.map((service) => service.category || "Otro"))).sort((a, b) => a.localeCompare(b, "es")), [rows]);
  const filteredRows = useMemo(() => rows.filter((service) => {
    const statusMatches = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? service.isActive : !service.isActive);
    const categoryMatches = categoryFilter === "ALL" || (service.category || "Otro") === categoryFilter;
    return statusMatches && categoryMatches;
  }), [rows, statusFilter, categoryFilter]);
  const activeServices = useMemo(() => rows.filter((service) => service.isActive).length, [rows]);
  const servicesWithoutDuration = useMemo(() => countActiveServicesWithoutDuration(rows), [rows]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (service: ServiceRow) => {
    setEditing(service);
    setForm({ name: service.name, category: service.category || "Otro", price: Number(service.price), durationMins: service.durationMins ?? "", description: service.description || "", isActive: service.isActive });
    setDialogOpen(true);
  };

  const save = async () => {
    const parsed = ServiceCreateSchema.safeParse({ ...form, durationMins: form.durationMins === "" ? undefined : form.durationMins });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      toast.error("Revisa los campos obligatorios antes de continuar.");
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] button');
        first?.scrollIntoView({ block: "center" });
        first?.focus();
      });
      return;
    }
    setSaving(true); setError(null); setFieldErrors({});
    try {
      const payload = { name: form.name.trim(), category: form.category || undefined, description: form.description.trim() || undefined, price: form.price, durationMins: form.durationMins === "" ? undefined : Number(form.durationMins), isActive: form.isActive };
      if (editing) await apiUpdateService(editing.id, payload); else await apiCreateService(payload);
      setDialogOpen(false); await load();
      setAlert({ variant: "success", title: editing ? "Servicio actualizado" : "Servicio creado", description: "El catalogo se actualizo correctamente." }); setAlertOpen(true);
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar el servicio."); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiDeleteService(selected.id); setDeleteOpen(false); setSelected(null); await load();
      setAlert({ variant: "success", title: "Servicio eliminado", description: "El servicio se elimino del catalogo." }); setAlertOpen(true);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el servicio."); }
    finally { setSaving(false); }
  };

  const columns = useMemo<DataTableColumn<ServiceRow>[]>(
    () => [
      {
        header: "Servicio",
        accessorKey: "name",
        cell: (service) => (
          <div>
            <p className="font-medium text-foreground">{service.name}</p>
            {service.description ? (
              <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">
                {service.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        header: "Categoria",
        accessorKey: "category",
        cell: (service) => (
          <span className="text-sm text-muted-foreground">
            {service.category || "-"}
          </span>
        ),
      },
      {
        header: "Precio",
        accessorKey: "price",
        cell: (service) => (
          <span className="font-medium text-foreground">
            {toMoney(service.price, currency)}
          </span>
        ),
      },
      {
        header: "Duracion",
        accessorKey: "durationMins",
        cell: (service) => (
          <span className="text-sm text-muted-foreground">
            {service.durationMins ? `${service.durationMins} min` : "-"}
          </span>
        ),
      },
      {
        header: "Estado",
        cell: (service) => <StatusBadge active={service.isActive} />,
      },
      {
        header: "Acciones",
        cell: (service) => (
          <div className="flex justify-end gap-1">
            {canUpdate ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => openEdit(service)}
                aria-label={`Editar ${service.name}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setSelected(service);
                  setDeleteOpen(true);
                }}
                aria-label={`Eliminar ${service.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate, currency],
  );

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<Sparkles className="size-3.5" />}
        badgeLabel="Servicios y catalogo"
        title="Servicios veterinarios"
        description="Organiza tu catalogo."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo servicio
            </Button>
          ) : null
        }
        stats={[
          { label: "Servicios", value: rows.length, hint: "Catalogo total" },
          {
            label: "Activos",
            value: activeServices,
            hint: "Disponibles en operacion",
          },
          {
            label: "SIN DURACIÓN",
            value: servicesWithoutDuration,
            hint: "Servicios sin duración definida",
          },
        ]}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Ocurrio un problema</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {loading ? (
        <div className="app-panel-strong space-y-4 p-5">
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-md bg-muted" />
        </div>
      ) : (
        <DataTable<ServiceRow>
          title="Servicios"
          columns={columns}
          data={filteredRows}
          searchKeys={["name", "category", "description"]}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre, categoria o descripcion..."
          emptyMessage="No hay servicios que coincidan con los filtros."
          actions={
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[10rem_12rem]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}
      <Modal
        open={dialogOpen}
        onClose={setDialogOpen}
        title={editing ? "Editar servicio" : "Nuevo servicio"}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-name" required>Nombre</Label>
              <Input
                id="service-name"
                value={form.name}
                aria-invalid={Boolean(fieldErrors.name)}
                onChange={(event) =>
                  { setForm((current) => ({ ...current, name: event.target.value })); setFieldErrors((current) => ({ ...current, name: "" })); }
                }
              />
              {fieldErrors.name ? <p className="text-sm font-medium text-destructive">{fieldErrors.name}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(category) =>
                  setForm((current) => ({ ...current, category }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([...formCategories, ...categories])).map(
                    (category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-price" required>Precio</Label>
                <Input
                  id="service-price"
                  type="number"
                  min={0}
                  value={form.price}
                  aria-invalid={Boolean(fieldErrors.price)}
                  onChange={(event) =>
                    { setForm((current) => ({ ...current, price: Math.max(0, Number(event.target.value) || 0) })); setFieldErrors((current) => ({ ...current, price: "" })); }
                  }
                />
                {fieldErrors.price ? <p className="text-sm font-medium text-destructive">{fieldErrors.price}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-duration">Duracion (min)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min={0}
                  value={form.durationMins}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      durationMins:
                        event.target.value === ""
                          ? ""
                          : Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-description">Descripcion</Label>
              <Textarea
                id="service-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="app-panel-muted flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Servicio activo
                </p>
                <p className="text-xs text-muted-foreground">
                  Disponible para facturacion y agenda.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(isActive) =>
                  setForm((current) => ({ ...current, isActive }))
                }
              />
            </div>
          </div>
      </Modal>
      <ModalDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar servicio"
        itemName={selected?.name}
        loading={saving}
        onConfirm={() => void confirmDelete()}
      />
      <AppAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        variant={alert.variant}
        title={alert.title}
        description={alert.description}
      />
    </div>
  );
}
