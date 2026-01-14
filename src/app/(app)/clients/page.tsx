"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Mail, MapPin, Edit, Trash2, PawPrint, Eye, FileText } from "lucide-react";

import DataTable from "@/components/shared/Datatable";
import Modal from "@/components/shared/Modal";
import FormField from "@/components/shared/FormField";
import ModalDelete from "@/components/shared/ModalDelete";
import { AppAlert } from "@/components/shared/AppAlert";

import { ClientFormSchema, zodFieldErrors } from "@/lib/validators/client";
import z from "zod";

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

export default function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

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
    } catch (e: any) {
      setError(e?.message ?? "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (action === "new") {
      setEditingClient(null);
      setFormData(emptyForm);
      setModalOpen(true);
    }
  }, [action]);

  const handleEdit = (client: ClientRow) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    } catch (e: any) {
      setError(e?.message ?? "Error guardando cliente");
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold">
              {row.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{row.fullName}</p>
              {row.notes && <p className="flex items-center gap-1 text-xs text-slate-500"><FileText className="w-3 h-3" />{row.notes}</p>}
            </div>
          </div>
        ),
      },
      {
        header: "Contacto",
        cell: (row: ClientRow) => (
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-3 h-3" /> {row.phone || <span className="text-slate-400">-</span>}
            </p>
            {row.email ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
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
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-3 h-3" /> {row.address}
            </p>
          ) : (
            <span className="text-slate-400">-</span>
          ),
      },
      {
        header: "Mascotas",
        cell: (row: ClientRow) => {
          const count = row.petsCount ?? 0;
          return (
            <Badge variant="secondary" className="bg-teal-50 text-teal-700">
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="w-4 h-4 text-slate-600" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row);
              }}
              disabled={saving}
            >
              <Edit className="w-4 h-4 text-slate-600" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                askDelete(row);
              }}
              disabled={saving}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [saving]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500">Gestiona los propietarios de las mascotas</p>
        </div>

        <Button
          onClick={() => {
            setEditingClient(null);
            setFormData(emptyForm);
            setModalOpen(true);
          }}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
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
            <Button
              onClick={() => handleSubmit()}
              className="bg-gradient-to-r from-teal-500 to-teal-600"
              disabled={saving}
            >
              {editingClient ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
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

            <FormField label="Dirección" name="address" value={formData.address} onChange={handleChange} error={errors.address} />

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
        autoCloseMs={3500}
      />
    </div>
  );
}
