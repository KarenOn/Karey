"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import z from "zod";
import { Edit, Eye, FileText, Mail, MapPin, PawPrint, Phone, Plus, Trash2 } from "lucide-react";
import AppPageHero from "@/components/shared/AppPageHero";
import { AppAlert } from "@/components/shared/AppAlert";
import DataTable, { type DataTableColumn } from "@/components/shared/Datatable";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import ModalDelete from "@/components/shared/ModalDelete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { ClientFormSchema, zodFieldErrors } from "@/lib/validators/client";

export type ClientPayload = z.infer<typeof ClientFormSchema>;

type ClientRow = {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  petsCount: number;
};

type ClientForm = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const emptyForm: ClientForm = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

async function apiGetClients(): Promise<ClientRow[]> {
  const res = await fetch("/api/clients", { cache: "no-store" });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error ?? "Error cargando clientes");
  return payload;
}

async function apiCreateClient(data: ClientPayload): Promise<ClientRow> {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error ?? "Error creando cliente");
  return payload;
}

async function apiUpdateClient(id: number, data: ClientPayload): Promise<ClientRow> {
  const res = await fetch(`/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error ?? "Error actualizando cliente");
  return payload;
}

async function apiDeleteClient(id: number): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error ?? "Error eliminando cliente");
}

function ClientsPageContent() {
  const access = useCurrentUserAccess();
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const canCreateClients = !!access?.actions.clients.create;
  const canUpdateClients = !!access?.actions.clients.update;
  const canDeleteClients = !!access?.actions.clients.delete;

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [formData, setFormData] = useState<ClientForm>(emptyForm);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<{
    variant: "success" | "info" | "warning" | "destructive";
    title: string;
    description?: string;
  }>({ variant: "info", title: "" });

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);
      setClients(await apiGetClients());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  useEffect(() => {
    if (action === "new" && canCreateClients) {
      setEditingClient(null);
      setFormData(emptyForm);
      setModalOpen(true);
    }
  }, [action, canCreateClients]);

  const askDelete = useCallback((row: ClientRow) => {
    setSelected({ id: row.id, name: row.fullName });
    setDeleteOpen(true);
  }, []);

  const handleEdit = useCallback((client: ClientRow) => {
    if (!canUpdateClients) return;
    setEditingClient(client);
    setFormData({
      fullName: client.fullName ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
    });
    setModalOpen(true);
  }, [canUpdateClients]);

  function handleChange(event: FormFieldChangeEvent) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: String(value) }));

    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();

    if ((editingClient && !canUpdateClients) || (!editingClient && !canCreateClients)) {
      setError("No tienes permisos para realizar esta acción.");
      return;
    }

    const payload = ClientFormSchema.safeParse(formData);
    if (!payload.success) {
      setErrors(zodFieldErrors(payload.error));
      return;
    }

    setErrors({});

    try {
      setSaving(true);
      setError(null);

      if (editingClient) {
        await apiUpdateClient(editingClient.id, payload.data);
      } else {
        await apiCreateClient(payload.data);
      }

      setModalOpen(false);
      setEditingClient(null);
      setFormData(emptyForm);

      if (action === "new") {
        router.replace("/clients");
      }

      await loadClients();
      setAlert({
        variant: "success",
        title: editingClient ? "Editado" : "Guardado",
        description: editingClient
          ? "El cliente se actualizó correctamente."
          : "El cliente se creó correctamente.",
      });
      setAlertOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error guardando cliente");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!selected) return;
    if (!canDeleteClients) {
      setError("No tienes permisos para eliminar clientes.");
      return;
    }

    try {
      setLoadingDelete(true);
      await apiDeleteClient(selected.id);
      await loadClients();
      setDeleteOpen(false);
      setSelected(null);
      setAlert({
        variant: "success",
        title: "Eliminado",
        description: "El cliente se eliminó correctamente.",
      });
      setAlertOpen(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error eliminando cliente");
    } finally {
      setLoadingDelete(false);
    }
  }

  const columns = useMemo<DataTableColumn<ClientRow>[]>(
    () => [
      {
        header: "Cliente",
        cell: (row: ClientRow) => (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-sm font-semibold text-primary">
              {row.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{row.fullName}</p>
              {row.notes ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {row.notes}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        header: "Contacto",
        cell: (row: ClientRow) => (
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" /> {row.phone || <span className="text-muted-foreground/60">-</span>}
            </p>
            {row.email ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" /> {row.email}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        header: "Dirección",
        cell: (row: ClientRow) =>
          row.address ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" /> {row.address}
            </p>
          ) : (
            <span className="text-muted-foreground/60">-</span>
          ),
      },
      {
        header: "Mascotas",
        cell: (row: ClientRow) => {
          const count = row.petsCount ?? 0;
          return (
            <Badge variant="secondary" className="rounded-full border border-primary/15 bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <PawPrint className="mr-1 h-3 w-3" />
              {count} {count === 1 ? "mascota" : "mascotas"}
            </Badge>
          );
        },
      },
      {
        header: "Acciones",
        cell: (row: ClientRow) => (
          <div className="flex items-center gap-2">
            <Link href={`/clients/${row.id}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={`Ver cliente ${row.fullName}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {canUpdateClients ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                disabled={saving}
                onClick={(event) => {
                  event.stopPropagation();
                  handleEdit(row);
                }}
                aria-label={`Editar cliente ${row.fullName}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            ) : null}
            {canDeleteClients ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                disabled={saving}
                onClick={(event) => {
                  event.stopPropagation();
                  askDelete(row);
                }}
                aria-label={`Eliminar cliente ${row.fullName}`}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [askDelete, canDeleteClients, canUpdateClients, handleEdit, saving]
  );

  const clientsWithEmail = clients.filter((client) => Boolean(client.email)).length;
  const clientsWithPets = clients.filter((client) => (client.petsCount ?? 0) > 0).length;
  const totalPets = clients.reduce((sum, client) => sum + (client.petsCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<PawPrint className="size-3.5" />}
        badgeLabel="Clientes y familias"
        title="Clientes"
        description="Consulta los datos de contacto y el historial básico de cada cliente."
        actions={
          canCreateClients ? (
            <Button
              className="gap-2"
              onClick={() => {
                setEditingClient(null);
                setFormData(emptyForm);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          ) : null
        }
        stats={[
          { label: "Clientes", value: clients.length, hint: "Total de clientes" },
          { label: "Con acceso", value: clientsWithEmail, hint: "Clientes con acceso" },
          { label: "Con mascotas", value: clientsWithPets, hint: "Clientes con mascotas" },
          { label: "Mascotas", value: totalPets, hint: "Mascotas vinculadas" },
        ]}
      />

      {error ? (
        <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={clients}
        title="Clientes"
        description={`${clients.length} ${clients.length === 1 ? "registro encontrado" : "registros encontrados"}`}
        searchKey="fullName"
        searchPlaceholder="Buscar cliente..."
        emptyMessage={loading ? "Cargando..." : "No hay clientes registrados"}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClient ? "Editar cliente" : "Nuevo cliente"}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            {(editingClient ? canUpdateClients : canCreateClients) ? (
              <Button disabled={saving} onClick={() => void handleSubmit()}>
                {saving ? "Guardando..." : editingClient ? "Guardar cambios" : "Crear cliente"}
              </Button>
            ) : null}
          </div>
        }
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Nombre completo"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="sm:col-span-2"
              error={errors.fullName}
            />
            <FormField
              label="Teléfono"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
              error={errors.phone}
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />
            <FormField
              label="Dirección"
              name="address"
              value={formData.address}
              onChange={handleChange}
              error={errors.address}
            />
            <FormField
              label="Notas"
              name="notes"
              type="textarea"
              value={formData.notes}
              onChange={handleChange}
              className="sm:col-span-2"
              error={errors.notes}
            />
          </div>
        </form>
      </Modal>

      <ModalDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar cliente"
        itemName={selected?.name}
        loading={loadingDelete}
        onConfirm={confirmDelete}
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

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="app-panel-strong p-6 text-sm text-muted-foreground">Cargando clientes...</div>}>
      <ClientsPageContent />
    </Suspense>
  );
}
