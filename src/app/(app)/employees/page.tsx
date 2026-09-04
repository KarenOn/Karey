"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, LoaderCircle, ShieldCheck, UserPlus, Users } from "lucide-react";

import AppPageHero from "@/components/shared/AppPageHero";
import DataTablePagination from "@/components/shared/DataTablePagination";
import SearchableSelect from "@/components/shared/SearchableSelect";
import SearchInput from "@/components/shared/SearchInput";
import StatusBadge from "@/components/shared/StatusBadge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUserProfile } from "@/components/layout/current-user-context";

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
  userId: string;
  isActive: boolean;
  user: { name: string | null; email: string };
  role: { id: number; name: string };
};
type Invite = { id: number; email: string; expiresAt: string; role: { name: string }; invitedUser?: { name: string | null } | null };
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
  const currentUser = useCurrentUserProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [membersPage, setMembersPage] = useState(0);
  const [membersPageSize, setMembersPageSize] = useState(10);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberStatus, setMemberStatus] = useState("ALL");
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ member: Member; roleId: number; roleName: string } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Member | null>(null);
  const [resendTarget, setResendTarget] = useState<Invite | null>(null);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
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

  async function loadAll(showLoading = true) {
    if (showLoading) setLoading(true);
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
    if (inviteSubmitting) return;
    setInviteSubmitting(true);
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
      await loadAll(false);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Error creando empleado"));
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function resendInvite() {
    if (!resendTarget || resendingInvite) return;
    setResendingInvite(true);
    try {
      const response = await fetch(`/api/employees/invite/${resendTarget.id}/resend`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "No se pudo reenviar la invitación");
      setResendTarget(null);
      await loadAll(false);
      toast.success("Invitación reenviada correctamente");
    } catch (resendError) {
      toast.error(errorMessage(resendError, "No se pudo reenviar la invitación"));
    } finally {
      setResendingInvite(false);
    }
  }

  async function updateMember(memberId: number, patch: { roleId?: number; isActive?: boolean }) {
    if (pendingMemberId === memberId) return;
    setPendingMemberId(memberId);
    try {
      const res = await fetch(`/api/employees/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error actualizando empleado");
      setMembers((current) => current.map((member) => member.id === memberId ? {
        ...member,
        isActive: data.isActive ?? member.isActive,
        role: roleOptions.find((role) => role.id === (data.roleId ?? member.role.id)) ?? member.role,
      } : member));
      toast.success("Empleado actualizado");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Error actualizando empleado"));
    } finally {
      setPendingMemberId(null);
    }
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return;
    const { member, roleId } = pendingRoleChange;
    await updateMember(member.id, { roleId });
    setPendingRoleChange(null);
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
      await loadAll(false);
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
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const statusMatches = memberStatus === "ALL" || (memberStatus === "ACTIVE" ? member.isActive : !member.isActive);
      const searchMatches = !query || [member.user.name, member.user.email].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      return statusMatches && searchMatches;
    });
  }, [memberSearch, memberStatus, members]);
  const visibleMembers = filteredMembers.slice(membersPage * membersPageSize, (membersPage + 1) * membersPageSize);

  useEffect(() => {
    setMembersPage(0);
  }, [membersPageSize, memberSearch, memberStatus, members.length]);

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<ShieldCheck className="size-3.5" />}
        badgeLabel="Equipo y permisos"
        title="Empleados, roles y accesos"
        description="Gestiona el acceso de tu equipo, asigna roles y permisos según sus funciones en la clínica."
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} onClear={() => setMemberSearch("")} placeholder="Buscar por nombre o correo..." className="sm:max-w-md" />
            <Select value={memberStatus} onValueChange={setMemberStatus}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="INACTIVE">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!capabilities.canUpdateEmployees ? <Badge variant="outline">Solo lectura</Badge> : null}
        </div>
        {loading ? (
          // <div className="p-5 text-sm text-muted-foreground">Cargando...</div>
          <div className="flex min-h-60 items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-190 text-sm">
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
                {visibleMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-t border-border/50 transition-colors hover:bg-muted/35"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="app-stat-icon h-10 w-10 rounded-lg">
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
                      <SearchableSelect
                        options={roleOptions.map((role) => ({ value: String(role.id), label: role.name }))}
                        value={String(member.role.id)}
                        onValueChange={(value) => {
                          const nextRole = roleOptions.find((role) => role.id === Number(value));
                          if (nextRole && nextRole.id !== member.role.id) setPendingRoleChange({ member, roleId: nextRole.id, roleName: nextRole.name });
                        }}
                        disabled={!capabilities.canUpdateEmployees || currentUser?.userId === member.userId || pendingMemberId === member.id}
                        loading={pendingMemberId === member.id}
                        title={currentUser?.userId === member.userId ? "No puedes cambiar tu propio rol" : undefined}
                        buttonClassName="w-[220px] rounded-lg bg-input/60"
                        searchPlaceholder="Buscar rol..."
                      />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge active={member.isActive} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!capabilities.canUpdateEmployees}
                        onClick={() => {
                          if (currentUser?.userId === member.userId) return;
                          if (member.isActive) setDeactivateTarget(member);
                          else void updateMember(member.id, { isActive: true });
                        }}
                        title={currentUser?.userId === member.userId ? "No puedes desactivar tu propio usuario" : undefined}
                      >
                        {pendingMemberId === member.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : member.isActive ? "Desactivar" : "Activar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredMembers.length > 0 ? <DataTablePagination page={membersPage} pageSize={membersPageSize} total={filteredMembers.length} onPageChange={setMembersPage} pageSizeOptions={[10, 20, 50]} onPageSizeChange={(pageSize) => { setMembersPageSize(pageSize); setMembersPage(0); }} /> : null}
      </Card>

      <Dialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol del empleado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cambiar el rol de &quot;{pendingRoleChange?.member.user.name || pendingRoleChange?.member.user.email}&quot; de &quot;{pendingRoleChange?.member.role.name}&quot; a &quot;{pendingRoleChange?.roleName}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRoleChange(null)}>Cancelar</Button>
            <Button onClick={() => void confirmRoleChange()} disabled={pendingMemberId !== null}>
              {pendingMemberId !== null ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cambiar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar empleado</DialogTitle>
            <DialogDescription>
              Este empleado ya no podrá operar normalmente en la plataforma hasta que sea activado nuevamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
            <Button onClick={async () => {
                if (!deactivateTarget) return;
                const target = deactivateTarget;
                await updateMember(target.id, { isActive: false });
                setDeactivateTarget(null);
              }}>
              {pendingMemberId === deactivateTarget?.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resendTarget} onOpenChange={(open) => { if (!open) setResendTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar invitación</DialogTitle>
            <DialogDescription>
              Se generará una nueva contraseña temporal y la invitación anterior dejará de ser válida. Se enviará un nuevo correo a {resendTarget?.email ?? "la cuenta invitada"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendTarget(null)}>Cancelar</Button>
            <Button onClick={async () => {
                // if (!deactivateTarget) return;
                // const target = deactivateTarget;
                // await updateMember(target.id, { isActive: false });
                // setDeactivateTarget(null);
                resendInvite();
              }}>
              {pendingMemberId === resendTarget?.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {resendingInvite ? "Reenviando..." : "Reenviar invitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* <ModalDelete
        open={!!resendTarget}
        onOpenChange={(open) => { if (!open && !resendingInvite) setResendTarget(null); }}
        title="Reenviar invitación"
        itemName={resendTarget?.invitedUser?.name || resendTarget?.email}
        description={`Se generará una nueva contraseña temporal y la invitación anterior dejará de ser válida. Se enviará un nuevo correo a ${resendTarget?.email ?? "la cuenta invitada"}.`}
        dangerText={resendingInvite ? "Reenviando..." : "Reenviar invitación"}
        loading={resendingInvite}
        onConfirm={resendInvite}
      /> */}

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
            // <div className="text-sm text-muted-foreground">Cargando...</div>
            <div className="flex min-h-60 items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
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
            // <div className="text-sm text-muted-foreground">Cargando...</div>
            <div className="flex min-h-60 items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
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
                    <p className="font-medium text-foreground">{invite.invitedUser?.name || "Nombre no disponible"}</p>
                    <p className="text-sm text-muted-foreground">{invite.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{invite.role.name}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right text-xs text-muted-foreground">
                    <p className="font-semibold uppercase tracking-[0.16em]">{new Date(invite.expiresAt) > new Date() ? "Expira" : "Expirada"}</p>
                    <p className="mt-1 text-sm normal-case tracking-normal text-foreground">
                      {new Date(invite.expiresAt).toLocaleString("es-BO")}
                    </p>
                    {capabilities.canInviteEmployees ? <Button variant="outline" size="sm" onClick={() => setResendTarget(invite)}>Reenviar invitación</Button> : null}
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
              <SearchableSelect
                options={roleOptions.map((role) => ({ value: String(role.id), label: role.name }))}
                value={inviteForm.roleId}
                onValueChange={(value) =>
                  setInviteForm((current) => ({ ...current, roleId: value }))
                }
                placeholder="Selecciona un rol"
                searchPlaceholder="Buscar rol..."
                buttonClassName="rounded-lg bg-input/60"
              />
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
              disabled={!inviteForm.name || !inviteForm.email || !inviteForm.roleId || inviteSubmitting}
            >
              {inviteSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {inviteSubmitting ? "Creando..." : "Crear empleado"}
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
