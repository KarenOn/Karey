"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  Loader2,
  PencilLine,
  Plus,
  Power,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import ClinicAvatar from "@/components/shared/ClinicAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminClinicRecord,
  AdminClinicSubscriptionStatus,
} from "@/types/admin-clinics";

type AdminClinicsClientProps = {
  initialClinics: AdminClinicRecord[];
};

type EditForm = {
  id: number;
  name: string;
  email: string;
  phone: string;
  plan: string;
  isActive: boolean;
  subscriptionStatus: AdminClinicSubscriptionStatus;
  subscriptionEndDate: string;
};

type CreateForm = {
  clinicName: string;
  clinicEmail: string;
  clinicPhone: string;
  plan: string;
  isActive: boolean;
  subscriptionStatus: AdminClinicSubscriptionStatus;
  subscriptionEndDate: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
};

type CreateClinicResponse = {
  clinic: AdminClinicRecord;
  emailWarning?: string | null;
  ownerAccess: {
    email: string;
    password: string;
  };
};

type OwnerAccessResult = {
  clinicName: string;
  email: string;
  password: string;
};

const statusLabel: Record<AdminClinicSubscriptionStatus, string> = {
  active: "Activa",
  inactive: "Inactiva",
  past_due: "Past due",
};

const statusClassName: Record<AdminClinicSubscriptionStatus, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  inactive: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  past_due: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const emptyCreateForm: CreateForm = {
  clinicName: "",
  clinicEmail: "",
  clinicPhone: "",
  plan: "",
  isActive: true,
  subscriptionStatus: "active",
  subscriptionEndDate: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerPassword: "",
};

function formatDate(value?: string | null) {
  if (!value) return "Sin definir";
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createEditForm(clinic: AdminClinicRecord): EditForm {
  return {
    id: clinic.id,
    name: clinic.name,
    email: clinic.email ?? "",
    phone: clinic.phone ?? "",
    plan: clinic.plan ?? "",
    isActive: clinic.isActive,
    subscriptionStatus: clinic.subscriptionStatus,
    subscriptionEndDate: clinic.subscriptionEndDate ?? "",
  };
}

export default function AdminClinicsClient({ initialClinics }: AdminClinicsClientProps) {
  const [clinics, setClinics] = useState(initialClinics);
  const [busyClinicId, setBusyClinicId] = useState<number | null>(null);
  const [viewClinic, setViewClinic] = useState<AdminClinicRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [creatingClinic, setCreatingClinic] = useState(false);
  const [ownerAccessResult, setOwnerAccessResult] = useState<OwnerAccessResult | null>(null);

  const orderedClinics = useMemo(
    () =>
      [...clinics].sort((left, right) => {
        const weight = (status: AdminClinicSubscriptionStatus) => {
          if (status === "past_due") return 0;
          if (status === "active") return 1;
          return 2;
        };

        const statusDiff = weight(left.subscriptionStatus) - weight(right.subscriptionStatus);
        if (statusDiff !== 0) return statusDiff;

        return left.name.localeCompare(right.name, "es");
      }),
    [clinics]
  );

  function mergeClinic(updated: AdminClinicRecord) {
    setClinics((current) => {
      const exists = current.some((clinic) => clinic.id === updated.id);
      if (exists) {
        return current.map((clinic) => (clinic.id === updated.id ? updated : clinic));
      }

      return [updated, ...current];
    });

    setViewClinic((current) => (current?.id === updated.id ? updated : current));
    setEditForm((current) => (current?.id === updated.id ? createEditForm(updated) : current));
  }

  async function updateClinic(
    clinicId: number,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    try {
      setBusyClinicId(clinicId);
      const res = await fetch(`/api/admin/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo actualizar la clínica");
      }

      mergeClinic(data as AdminClinicRecord);
      toast.success(successMessage);
      return data as AdminClinicRecord;
    } catch (error) {
      toast.error(errorMessage(error, "No se pudo actualizar la clínica"));
      return null;
    } finally {
      setBusyClinicId(null);
    }
  }

  async function toggleClinic(clinic: AdminClinicRecord) {
    await updateClinic(
      clinic.id,
      { action: clinic.isActive ? "deactivate" : "activate" },
      clinic.isActive ? "Clínica desactivada" : "Clínica activada"
    );
  }

  async function saveEdit() {
    if (!editForm) {
      return;
    }

    try {
      setSavingEdit(true);
      const updated = await updateClinic(
        editForm.id,
        {
          action: "update",
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          plan: editForm.plan,
          isActive: editForm.isActive,
          subscriptionStatus: editForm.subscriptionStatus,
          subscriptionEndDate: editForm.subscriptionEndDate,
        },
        "Clínica actualizada"
      );

      if (updated) {
        setEditForm(null);
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function createClinic() {
    try {
      setCreatingClinic(true);

      const res = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = (await res.json().catch(() => null)) as
        | CreateClinicResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          data && "error" in data ? data.error ?? "No se pudo crear la clínica" : "No se pudo crear la clínica"
        );
      }

      const payload = data as CreateClinicResponse;
      mergeClinic(payload.clinic);
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      setOwnerAccessResult({
        clinicName: payload.clinic.name,
        email: payload.ownerAccess.email,
        password: payload.ownerAccess.password,
      });
      if (payload.emailWarning) {
        toast.warning(payload.emailWarning);
      } else {
        toast.success("Clínica y owner creados");
      }
    } catch (error) {
      toast.error(errorMessage(error, "No se pudo crear la clínica"));
    } finally {
      setCreatingClinic(false);
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error(`No se pudo copiar ${label.toLowerCase()}`);
    }
  }

  return (
    <>
      <section className="app-panel-strong overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Base de clínicas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea la clínica, genera su owner inicial y controla el acceso manualmente.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {clinics.length} registros
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nueva clínica
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/35">
            <TableRow>
              <TableHead>Nombre clínica</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Proximo pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedClinics.map((clinic) => {
              const isBusy = busyClinicId === clinic.id;

              return (
                <TableRow key={clinic.id}>
                  <TableCell className="whitespace-normal">
                    <div className="flex items-center gap-3">
                      <ClinicAvatar
                        name={clinic.name}
                        logoUrl={clinic.logoUrl}
                        className="h-10 w-10 rounded-[1rem]"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{clinic.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {clinic.email ?? "Sin correo"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium text-foreground">
                      {clinic.responsible?.name ?? "Sin responsable"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {clinic.responsible?.email ?? "Sin usuario principal"}
                    </p>
                  </TableCell>
                  <TableCell>{clinic.phone ?? "Sin telefono"}</TableCell>
                  <TableCell>
                    <Badge className={statusClassName[clinic.subscriptionStatus]} variant="outline">
                      {statusLabel[clinic.subscriptionStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>{clinic.plan ?? "Manual"}</TableCell>
                  <TableCell>{formatDate(clinic.subscriptionEndDate)}</TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant={clinic.isActive ? "secondary" : "default"}
                        onClick={() => void toggleClinic(clinic)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Power className="size-4" />
                        )}
                        {clinic.isActive ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditForm(createEditForm(clinic))}
                      >
                        <PencilLine className="size-4" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setViewClinic(clinic)}>
                        <Eye className="size-4" />
                        Ver detalle
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nueva clínica</DialogTitle>
            <DialogDescription>
              Crea la clínica y su usuario owner inicial para que el cliente pueda entrar a la app.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-clinic-name">Nombre de la clínica</Label>
                <Input
                  id="create-clinic-name"
                  value={createForm.clinicName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      clinicName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-clinic-email">Email de la clínica</Label>
                <Input
                  id="create-clinic-email"
                  type="email"
                  value={createForm.clinicEmail}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      clinicEmail: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-clinic-phone">Teléfono de la clínica</Label>
                <Input
                  id="create-clinic-phone"
                  value={createForm.clinicPhone}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      clinicPhone: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-clinic-plan">Plan</Label>
                <Input
                  id="create-clinic-plan"
                  value={createForm.plan}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      plan: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-clinic-date">Proxima fecha de pago</Label>
                <Input
                  id="create-clinic-date"
                  type="date"
                  value={createForm.subscriptionEndDate}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      subscriptionEndDate: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Estado de suscripción</Label>
                <Select
                  value={createForm.subscriptionStatus}
                  onValueChange={(value: AdminClinicSubscriptionStatus) =>
                    setCreateForm((current) => ({
                      ...current,
                      subscriptionStatus: value,
                    }))
                  }
                  disabled={!createForm.isActive}
                >
                  <SelectTrigger className="rounded-xl bg-input/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="inactive">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="app-panel-muted flex items-center justify-between p-4 sm:col-span-2">
                <div>
                  <p className="font-semibold text-foreground">Acceso habilitado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Si se desactiva, la clínica entra bloqueada desde el primer login.
                  </p>
                </div>
                <Switch
                  checked={createForm.isActive}
                  onCheckedChange={(checked) =>
                    setCreateForm((current) => ({
                      ...current,
                      isActive: checked,
                      subscriptionStatus: checked
                        ? current.subscriptionStatus === "inactive"
                          ? "active"
                          : current.subscriptionStatus
                        : "inactive",
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserRoundPlus className="size-4" />
                  Usuario owner inicial
                </div>
                <p className="text-sm text-muted-foreground">
                  Este usuario será el admin-owner de la clínica y podrá entrar apenas reciba sus credenciales.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-owner-name">Nombre owner</Label>
                <Input
                  id="create-owner-name"
                  value={createForm.ownerName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      ownerName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-owner-phone">Telefono owner</Label>
                <Input
                  id="create-owner-phone"
                  value={createForm.ownerPhone}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      ownerPhone: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-owner-email">Email owner</Label>
                <Input
                  id="create-owner-email"
                  type="email"
                  value={createForm.ownerEmail}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      ownerEmail: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-owner-password">Contraseña inicial</Label>
                <Input
                  id="create-owner-password"
                  type="text"
                  value={createForm.ownerPassword}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      ownerPassword: event.target.value,
                    }))
                  }
                  placeholder="Si la dejas vacia, se genera automaticamente"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void createClinic()}
              disabled={
                creatingClinic ||
                !createForm.clinicName.trim() ||
                !createForm.ownerName.trim() ||
                !createForm.ownerEmail.trim()
              }
            >
              {creatingClinic ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Crear clínica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!ownerAccessResult}
        onOpenChange={(open) => !open && setOwnerAccessResult(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Acceso creado</DialogTitle>
            <DialogDescription>
              Ya puedes pasar estas credenciales al owner de{" "}
              {ownerAccessResult?.clinicName ?? "la clínica"}.
            </DialogDescription>
          </DialogHeader>

          {ownerAccessResult ? (
            <div className="grid gap-4">
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{ownerAccessResult.email}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copyText(ownerAccessResult.email, "Email")}
                  >
                    <Copy className="size-4" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Contraseña inicial
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{ownerAccessResult.password}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copyText(ownerAccessResult.password, "Contraseña")}
                  >
                    <Copy className="size-4" />
                    Copiar
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Esta contraseña solo se muestra en este momento. Luego el usuario ya entra desde la pantalla normal de login.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setOwnerAccessResult(null)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewClinic} onOpenChange={(open) => !open && setViewClinic(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de clínica</DialogTitle>
            <DialogDescription>
              Resumen operativo y estado actual de la suscripción.
            </DialogDescription>
          </DialogHeader>

          {viewClinic ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Nombre
                </p>
                <p className="mt-2 font-semibold text-foreground">{viewClinic.name}</p>
              </div>
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Estado actual
                </p>
                <div className="mt-2">
                  <Badge className={statusClassName[viewClinic.subscriptionStatus]} variant="outline">
                    {statusLabel[viewClinic.subscriptionStatus]}
                  </Badge>
                </div>
              </div>
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-2 text-sm text-foreground">{viewClinic.email ?? "Sin correo"}</p>
              </div>
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Telefono
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {viewClinic.phone ?? "Sin telefono"}
                </p>
              </div>
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Responsable
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {viewClinic.responsible?.name ?? "Sin responsable"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {viewClinic.responsible?.email ?? "Sin usuario principal"}
                </p>
              </div>
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Plan
                </p>
                <p className="mt-2 text-sm text-foreground">{viewClinic.plan ?? "Manual"}</p>
              </div>
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Fecha inicio
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(
                    new Date(viewClinic.createdAt)
                  )}
                </p>
              </div>
              <div className="app-panel-muted p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Fecha fin de suscripción
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {formatDate(viewClinic.subscriptionEndDate)}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editForm} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar clínica</DialogTitle>
            <DialogDescription>
              Ajusta acceso, plan y seguimiento manual de pagos.
            </DialogDescription>
          </DialogHeader>

          {editForm ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clinic-name">Nombre</Label>
                <Input
                  id="clinic-name"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, name: event.target.value } : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-email">Email</Label>
                <Input
                  id="clinic-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, email: event.target.value } : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-phone">Teléfono</Label>
                <Input
                  id="clinic-phone"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, phone: event.target.value } : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-plan">Plan</Label>
                <Input
                  id="clinic-plan"
                  value={editForm.plan}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, plan: event.target.value } : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-date">Proxima fecha de pago</Label>
                <Input
                  id="clinic-date"
                  type="date"
                  value={editForm.subscriptionEndDate}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current
                        ? { ...current, subscriptionEndDate: event.target.value }
                        : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Estado de suscripción</Label>
                <Select
                  value={editForm.subscriptionStatus}
                  onValueChange={(value: AdminClinicSubscriptionStatus) =>
                    setEditForm((current) =>
                      current ? { ...current, subscriptionStatus: value } : current
                    )
                  }
                  disabled={!editForm.isActive}
                >
                  <SelectTrigger className="rounded-xl bg-input/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="inactive">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="app-panel-muted flex items-center justify-between p-4 sm:col-span-2">
                <div>
                  <p className="font-semibold text-foreground">Acceso habilitado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Si se desactiva, la app muestra &quot;Tu suscripción no está activa&quot;.
                  </p>
                </div>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm((current) =>
                      current
                        ? {
                            ...current,
                            isActive: checked,
                            subscriptionStatus: checked
                              ? current.subscriptionStatus === "inactive"
                                ? "active"
                                : current.subscriptionStatus
                              : "inactive",
                          }
                        : current
                    )
                  }
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditForm(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void saveEdit()}
              disabled={savingEdit || !editForm?.name.trim()}
            >
              {savingEdit ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
