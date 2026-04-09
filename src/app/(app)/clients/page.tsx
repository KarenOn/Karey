"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Mail, MapPin, Edit, Trash2, PawPrint, Eye, FileText } from "lucide-react";

import DataTable from "@/components/shared/Datatable";
import Modal from "@/components/shared/Modal";
import FormField, { type FormFieldChangeEvent } from "@/components/shared/FormField";
import ModalDelete from "@/components/shared/ModalDelete";
import { AppAlert } from "@/components/shared/AppAlert";
import AppPageHero from "@/components/shared/AppPageHero";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";

import { ClientFormSchema, zodFieldErrors } from "@/lib/validators/client";
import z from "zod";
import { useMaskito } from "@maskito/react";
import options from '@/components/shared/PhoneMask';

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
  if (!res.ok) throw new Error("Error cargando clientes");
  return res.json();
}

async function apiCreateClient(data: ClientPayload): Promise<ClientRow> {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando cliente");
  return res.json();
}

async function apiUpdateClient(id: number, data: ClientPayload): Promise<ClientRow> {
  const res = await fetch(`/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error actualizando cliente");
  return res.json();
}

async function apiDeleteClient(id: number): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando cliente");
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
  const maskedInputRef = useMaskito({options});
  
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<{
    variant: "success" | "info" | "warning" | "destructive";
    title: string;
    description?: string;
  }>({ variant: "info", title: "" });

  const askDelete = (row: ClientRow) => {
    setSelected({ id: row.id, name: row.fullName });
    setDeleteOpen(true);
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetClients();
      setClients(data);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (action === "new" && canCreateClients) {
      setEditingClient(null);
      setFormData(emptyForm);
      setModalOpen(true);
    }
  }, [action, canCreateClients]);

  const handleEdit = (client: ClientRow) => {
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
  };

  const handleChange = (e: FormFieldChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if ((editingClient && !canUpdateClients) || (!editingClient && !canCreateClients)) {
      setError("No tienes permisos para realizar esta accion.");
      return;
    }

    // const payload: ClientForm = {
    //   fullName: formData.fullName.trim(),
    //   phone: formData.phone.trim(),
    //   email: formData.email.trim(),
    //   address: formData.address.trim(),
    //   notes: formData.notes.trim(),
    // };

    const payload = ClientFormSchema.safeParse({
      fullName: formData.fullName ?? formData.fullName ?? "",
      phone: formData.phone ?? "",
      email: formData.email ?? "",
      address: formData.address ?? "",
      notes: formData.notes ?? "",
    });

    // if (!payload.fullName) return;

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

      // limpia ?action=new si venías de ahí
      if (action === "new") router.replace("/clients");

      await loadClients();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Error guardando cliente");
    } finally {
      setSaving(false);

      if (editingClient) {
        setAlert({
          variant: "success",
          title: "Editado",
          description: "El cliente se actualizó correctamente.",
        });
      } else {
        setAlert({
          variant: "success",
          title: "Guardado",
          description: "El cliente se creó correctamente.",
        });
      }
      setAlertOpen(true);
    }
  };

  const confirmDelete = async () => {
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
    } finally {
      setLoadingDelete(false);

      setAlert({
        variant: "success",
        title: "Eliminado",
        description: "El cliente se eliminó correctamente.",
      });
      
      setAlertOpen(true);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: "Cliente",
        cell: (row: ClientRow) => (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-teal)_84%,white_16%),color-mix(in_srgb,var(--brand-navy)_82%,white_18%))] text-sm font-bold text-white shadow-[0_16px_34px_-24px_rgba(15,118,110,0.5)]">
              {row.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{row.fullName}</p>
              {row.notes && <p className="flex items-center gap-1 text-xs text-muted-foreground"><FileText className="w-3 h-3" />{row.notes}</p>}
            </div>
          </div>
        ),
      },
      {
        header: "Contacto",
        cell: (row: ClientRow) => (
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" /> {row.phone || <span className="text-muted-foreground/60">-</span>}
            </p>
            {row.email ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" /> {row.email}
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
              <MapPin className="w-3 h-3" /> {row.address}
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
              <PawPrint className="w-3 h-3 mr-1" />
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
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>

            {canUpdateClients ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
                }}
                disabled={saving}
              >
                <Edit className="w-4 h-4" />
              </Button>
            ) : null}

            {canDeleteClients ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  askDelete(row);
                }}
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDeleteClients, canUpdateClients, saving]
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
        description="Gestiona tus clientes y sus mascotas de manera eficiente"
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
              <Plus className="w-4 h-4" />
              Nuevo cliente
            </Button>
          ) : null
        }
        stats={[
          { label: "Clientes", value: clients.length, hint: "Total de clientes" },
          { label: "Con acceso", value: clientsWithEmail, hint: "Clientes con acceso" }, //Hacer que el cliente pueda tener acceso a la app
          { label: "Con mascotas", value: clientsWithPets, hint: "Clientes con mascotas" },
          { label: "Mascotas", value: totalPets, hint: "Mascotas vinculadas" },
        ]}
      />

      {error && (
        <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns as any[]}
        data={clients}
        searchKey="fullName"
        searchPlaceholder="Buscar cliente..."
        emptyMessage={loading ? "Cargando..." : "No hay clientes registrados"}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClient ? "Editar Cliente" : "Nuevo Cliente"}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            {(editingClient ? canUpdateClients : canCreateClients) ? (
              <Button onClick={() => handleSubmit()} disabled={saving}>
                {editingClient ? "Guardar Cambios" : "Crear Cliente"}
              </Button>
            ) : null}
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Nombre Completo"
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
              value={formData.phone} 
              onChange={handleChange} 
              required
              inputMask={maskedInputRef}
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

            <FormField label="Dirección" name="address" value={formData.address} onChange={() => handleChange} error={errors.address} />

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
