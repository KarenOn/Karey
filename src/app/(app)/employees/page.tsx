"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";

import AppPageHero from "@/components/shared/AppPageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

type PermissionMap = Record<string, string[]>;
type Role = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  permissions: PermissionMap;
  isActive: boolean;
  isSystem: boolean;
  membersCount: number;
};
type Member = {
  id: number;
  isActive: boolean;
  user: { name: string | null; email: string };
  role: { id: number; name: string };
};
type Invite = { id: number; email: string; expiresAt: string; role: { name: string } };
type Capabilities = {
  canInviteEmployees: boolean;
  canUpdateEmployees: boolean;
  canManageRoles: boolean;
};

const permissionCatalog = [
  { module: "clinic", label: "Clinica", actions: ["update"] },
  { module: "employees", label: "Empleados", actions: ["read", "invite", "update"] },
  { module: "roles", label: "Roles", actions: ["read", "manage"] },
  { module: "appointments", label: "Citas", actions: ["read", "create", "update", "delete"] },
  { module: "clients", label: "Clientes", actions: ["read", "create", "update", "delete"] },
  { module: "services", label: "Servicios", actions: ["read", "create", "update", "delete"] },
  { module: "inventory", label: "Inventario", actions: ["read", "create", "update", "delete"] },
  { module: "invoices", label: "Facturas", actions: ["read", "create", "update", "delete"] },
] as const;

const emptyInvite = { name: "", email: "", roleId: "" };
const emptyRole = {
  id: null as number | null,
  key: "",
  name: "",
  description: "",
  isActive: true,
  permissions: {} as PermissionMap,
};

function normalizePermissions(value: unknown): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<PermissionMap>(
    (acc, [key, actions]) => {
      if (Array.isArray(actions)) {
        acc[key] = actions.filter((item): item is string => typeof item === "string");
      }
      return acc;
    },
    {}
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function togglePermission(perms: PermissionMap, moduleKey: string, action: string) {
  const current = perms[moduleKey] ?? [];
  const next = current.includes(action)
    ? current.filter((item) => item !== action)
    : [...current, action];

  if (!next.length) {
    const rest = { ...perms };
    delete rest[moduleKey];
    return rest;
  }

  return { ...perms, [moduleKey]: next.sort() };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function EmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities>({
    canInviteEmployees: false,
    canUpdateEmployees: false,
    canManageRoles: false,
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl: string;
    tempPassword: string | null;
  } | null>(null);

  const [roleOpen, setRoleOpen] = useState(false);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [roleKeyTouched, setRoleKeyTouched] = useState(false);

  const roleOptions = useMemo(
    () => roles.filter((role) => role.id && role.isActive),
    [roles]
  );

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [employeesRes, rolesRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/roles"),
      ]);
      const employeesData = await employeesRes.json();
      const rolesData = await rolesRes.json();

      if (!employeesRes.ok) {
        throw new Error(employeesData?.error ?? "No se pudo cargar empleados");
      }
      if (!rolesRes.ok) {
        throw new Error(rolesData?.error ?? "No se pudo cargar roles");
      }

      setMembers(employeesData.members ?? []);
      setInvites(employeesData.invites ?? []);
      setRoles(
        (rolesData.roles ?? []).map((role: Role) => ({
          ...role,
          permissions: normalizePermissions(role.permissions),
        }))
      );
      setCapabilities({
        canInviteEmployees: !!employeesData.capabilities?.canInviteEmployees,
        canUpdateEmployees: !!employeesData.capabilities?.canUpdateEmployees,
        canManageRoles:
          !!employeesData.capabilities?.canManageRoles ||
          !!rolesData.capabilities?.canManageRoles,
      });
    } catch (err: unknown) {
      setError(errorMessage(err, "No se pudo cargar el modulo"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function submitInvite() {
    try {
      const res = await fetch("/api/employees/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteForm.name.trim(),
          email: inviteForm.email.trim(),
          roleId: Number(inviteForm.roleId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error creando empleado");
      setInviteResult({ inviteUrl: data.inviteUrl, tempPassword: data.tempPassword ?? null });
      toast.success("Empleado creado");
      await loadAll();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Error creando empleado"));
    }
  }

  async function updateMember(memberId: number, patch: { roleId?: number; isActive?: boolean }) {
    try {
      const res = await fetch(`/api/employees/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error actualizando empleado");
      toast.success("Empleado actualizado");
      await loadAll();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Error actualizando empleado"));
    }
  }

  function openCreateRole() {
    setRoleKeyTouched(false);
    setRoleForm(emptyRole);
    setRoleOpen(true);
  }

  function openEditRole(role: Role) {
    setRoleKeyTouched(true);
    setRoleForm({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description ?? "",
      isActive: role.isActive,
      permissions: normalizePermissions(role.permissions),
    });
    setRoleOpen(true);
  }

  async function submitRole() {
    try {
      const res = await fetch(roleForm.id ? `/api/roles/${roleForm.id}` : "/api/roles", {
        method: roleForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: roleForm.key.trim(),
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
          permissions: roleForm.permissions,
          isActive: roleForm.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error guardando rol");
      toast.success(roleForm.id ? "Rol actualizado" : "Rol creado");
      setRoleOpen(false);
      await loadAll();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Error guardando rol"));
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  const activeMembers = members.filter((member) => member.isActive).length;
  const activeRoles = roles.filter((role) => role.isActive).length;

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<ShieldCheck className="size-3.5" />}
        badgeLabel="Equipo y permisos"
        title="Empleados, roles y accesos con una vista mas ordenada y consistente"
        description="La administracion del equipo vuelve a compartir la misma vibra del resto de la app: paneles cuidados, tablas con mejor lectura y permisos mas faciles de revisar."
        actions={
          <>
            {capabilities.canManageRoles ? (
              <Button variant="outline" className="gap-2" onClick={openCreateRole}>
                <KeyRound className="h-4 w-4" />
                Nuevo rol
              </Button>
            ) : null}
            {capabilities.canInviteEmployees ? (
              <Button
                className="gap-2"
                onClick={() => {
                  setInviteForm(emptyInvite);
                  setInviteResult(null);
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4" />
                Crear empleado
              </Button>
            ) : null}
          </>
        }
        stats={[
          { label: "Miembros", value: members.length, hint: "Equipo registrado" },
          { label: "Activos", value: activeMembers, hint: "Con acceso vigente" },
          { label: "Roles", value: activeRoles, hint: "Perfiles habilitados" },
          { label: "Invitaciones", value: invites.length, hint: "Pendientes de activar" },
        ]}
      />

      {error ? (
        <Card className="rounded-[1.5rem] border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive shadow-none">
          {error}
        </Card>
      ) : null}

      <Card className="app-panel-strong overflow-hidden p-0 shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div>
            <div className="font-semibold text-foreground">Miembros</div>
            <p className="text-sm text-muted-foreground">
              Administra acceso, rol y estado operativo del equipo.
            </p>
          </div>
          {!capabilities.canUpdateEmployees ? <Badge variant="outline">Solo lectura</Badge> : null}
        </div>
        {loading ? (
          <div className="p-5 text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/45 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-extrabold">Empleado</th>
                  <th className="px-5 py-3 text-left font-extrabold">Email</th>
                  <th className="px-5 py-3 text-left font-extrabold">Rol</th>
                  <th className="px-5 py-3 text-left font-extrabold">Estado</th>
                  <th className="px-5 py-3 text-right font-extrabold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-t border-border/50 transition-colors hover:bg-muted/35"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="app-stat-icon h-10 w-10 rounded-[1rem]">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {member.user.name || "Sin nombre"}
                          </p>
                          <p className="text-xs text-muted-foreground">Miembro #{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{member.user.email}</td>
                    <td className="px-5 py-4">
                      <Select
                        value={String(member.role.id)}
                        onValueChange={(value) =>
                          updateMember(member.id, { roleId: Number(value) })
                        }
                        disabled={!capabilities.canUpdateEmployees}
                      >
                        <SelectTrigger className="w-[220px] rounded-xl bg-input/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={
                          member.isActive
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-border/70 bg-muted text-muted-foreground"
                        }
                      >
                        {member.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!capabilities.canUpdateEmployees}
                        onClick={() =>
                          updateMember(member.id, { isActive: !member.isActive })
                        }
                      >
                        {member.isActive ? "Desactivar" : "Activar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="app-panel-strong p-5 shadow-none">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-foreground">Roles y permisos</div>
              <p className="text-sm text-muted-foreground">
                Perfiles reutilizables para recepcion, clinica y administracion.
              </p>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {roles.length} roles
            </div>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="app-panel-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{role.name}</span>
                        <Badge variant={role.isSystem ? "secondary" : "outline"}>
                          {role.isSystem ? "Sistema" : "Personalizado"}
                        </Badge>
                        {!role.isActive ? <Badge variant="outline">Inactivo</Badge> : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {role.key} · {role.membersCount} empleados
                      </div>
                      {role.description ? (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {role.description}
                        </div>
                      ) : null}
                    </div>
                    {capabilities.canManageRoles ? (
                      <Button variant="outline" size="sm" onClick={() => openEditRole(role)}>
                        Editar
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {permissionCatalog
                      .filter((group) => (role.permissions[group.module] ?? []).length > 0)
                      .map((group) => (
                        <Badge
                          key={`${role.id}-${group.module}`}
                          variant="outline"
                          className="bg-background/70"
                        >
                          {group.label}
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="app-panel-strong p-5 shadow-none">
          <div className="mb-4">
            <div className="font-semibold text-foreground">Invitaciones pendientes</div>
            <p className="text-sm text-muted-foreground">
              Credenciales y enlaces listos para compartir con nuevos miembros.
            </p>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : invites.length === 0 ? (
            <div className="app-panel-muted p-4 text-sm text-muted-foreground">
              No hay invitaciones pendientes.
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="app-panel-muted flex items-start justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{invite.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{invite.role.name}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="font-semibold uppercase tracking-[0.16em]">Expira</p>
                    <p className="mt-1 text-sm normal-case tracking-normal text-foreground">
                      {new Date(invite.expiresAt).toLocaleString("es-BO")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear empleado</DialogTitle>
            <DialogDescription>
              Se genera el usuario y el enlace de invitacion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) =>
                  setInviteForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm((current) => ({ ...current, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={inviteForm.roleId}
                onValueChange={(value) =>
                  setInviteForm((current) => ({ ...current, roleId: value }))
                }
              >
                <SelectTrigger className="rounded-xl bg-input/60">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteResult ? (
              <Card className="app-panel-muted space-y-3 p-4 text-sm shadow-none">
                <div className="break-all">
                  <span className="text-muted-foreground">Link:</span> {inviteResult.inviteUrl}
                </div>
                {inviteResult.tempPassword ? (
                  <div className="break-all">
                    <span className="text-muted-foreground">Temp password:</span>{" "}
                    {inviteResult.tempPassword}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyText(inviteResult.inviteUrl)}
                  >
                    Copiar link
                  </Button>
                  {inviteResult.tempPassword ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyText(inviteResult.tempPassword ?? "")}
                    >
                      Copiar contraseña
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cerrar
            </Button>
            <Button
              onClick={submitInvite}
              disabled={!inviteForm.name || !inviteForm.email || !inviteForm.roleId}
            >
              Crear empleado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{roleForm.id ? "Editar rol" : "Nuevo rol"}</DialogTitle>
            <DialogDescription>
              Asigna los permisos que este rol podra usar en la app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm((current) => ({
                      ...current,
                      name: e.target.value,
                      key: current.id || roleKeyTouched ? current.key : slugify(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Clave</Label>
                <Input
                  disabled={!!roleForm.id}
                  value={roleForm.key}
                  onChange={(e) => {
                    setRoleKeyTouched(true);
                    setRoleForm((current) => ({ ...current, key: slugify(e.target.value) }));
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Textarea
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm((current) => ({ ...current, description: e.target.value }))
                }
              />
            </div>
            <div className="app-panel-muted flex items-center justify-between p-4">
              <div>
                <div className="font-medium text-foreground">Rol activo</div>
                <div className="text-sm text-muted-foreground">
                  Disponible para asignar a empleados.
                </div>
              </div>
              <Switch
                checked={roleForm.isActive}
                onCheckedChange={(checked) =>
                  setRoleForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {permissionCatalog.map((group) => (
                <div key={group.module} className="app-panel-muted p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-medium text-foreground">{group.label}</div>
                    <Badge variant="outline">
                      {(roleForm.permissions[group.module] ?? []).length}/{group.actions.length}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.actions.map((action) => {
                      const active = (roleForm.permissions[group.module] ?? []).includes(action);
                      return (
                        <Button
                          key={`${group.module}-${action}`}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() =>
                            setRoleForm((current) => ({
                              ...current,
                              permissions: togglePermission(
                                current.permissions,
                                group.module,
                                action
                              ),
                            }))
                          }
                        >
                          {action}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitRole} disabled={!roleForm.name || !roleForm.key}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
