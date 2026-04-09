"use client";

import { useEffect, useMemo, useState } from "react";
import { useMaskito } from "@maskito/react";
import {
  BadgeCheck,
  Camera,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import SignedFileUploader from "@/components/shared/SignedFileUploader";
import AppPageHero from "@/components/shared/AppPageHero";
import { AppAlert, type AppAlertVariant } from "@/components/shared/AppAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import options from "@/components/shared/PhoneMask";

type ProfileData = {
  userId: string;
  clinicId: number | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarStorageRef: string | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  roleKey: string | null;
  roleLabel: string | null;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  revokeOtherSessions: boolean;
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  revokeOtherSessions: false,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...(init ?? {}) });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? "Ocurrió un error inesperado");
  }

  return data as T;
}

async function deleteTemporaryUpload(storageRef?: string | null) {
  if (!storageRef) {
    return;
  }

  await fetch("/api/uploads/object", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storageRef }),
  }).catch(() => undefined);
}

export default function UserProfilePage() {
  const phoneMaskRef = useMaskito({ options });
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [snapshot, setSnapshot] = useState<ProfileData | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<{
    variant: AppAlertVariant;
    title: string;
    description?: string;
  }>({ variant: "info", title: "" });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await fetchJson<ProfileData>("/api/profile");
        if (!mounted) {
          return;
        }

        setProfile(data);
        setSnapshot(data);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setAlert({
          variant: "destructive",
          title: "No pudimos cargar tu perfil",
          description:
            error instanceof Error ? error.message : "Inténtalo nuevamente en unos segundos.",
        });
        setAlertOpen(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    if (!profile?.name) {
      return "U";
    }

    return profile.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile?.name]);

  const startEditing = () => {
    if (!profile) {
      return;
    }

    setSnapshot(profile);
    setEditing(true);
  };

  const cancelEditing = async () => {
    if (!profile || !snapshot) {
      setEditing(false);
      return;
    }

    if (
      profile.avatarStorageRef &&
      profile.avatarStorageRef !== snapshot.avatarStorageRef &&
      profile.avatarStorageRef.startsWith("s3://")
    ) {
      await deleteTemporaryUpload(profile.avatarStorageRef);
    }

    setProfile(snapshot);
    setEditing(false);
  };

  const handleAvatarUploaded = async (file: {
    fileName: string;
    fileType: string;
    previewUrl: string;
    storageRef: string;
  }) => {
    setProfile((current) => {
      if (!current) {
        return current;
      }

      const previousUnsavedAvatar =
        current.avatarStorageRef &&
        current.avatarStorageRef !== snapshot?.avatarStorageRef
          ? current.avatarStorageRef
          : null;

      if (previousUnsavedAvatar && previousUnsavedAvatar !== file.storageRef) {
        void deleteTemporaryUpload(previousUnsavedAvatar);
      }

      return {
        ...current,
        avatarStorageRef: file.storageRef,
        avatarUrl: file.previewUrl,
      };
    });
  };

  const removeAvatar = async () => {
    if (!profile) {
      return;
    }

    if (
      profile.avatarStorageRef &&
      profile.avatarStorageRef !== snapshot?.avatarStorageRef &&
      profile.avatarStorageRef.startsWith("s3://")
    ) {
      await deleteTemporaryUpload(profile.avatarStorageRef);
    }

    setProfile({
      ...profile,
      avatarStorageRef: null,
      avatarUrl: null,
    });
  };

  const saveProfile = async () => {
    if (!profile) {
      return;
    }

    try {
      setSaving(true);
      const updated = await fetchJson<ProfileData>("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          avatarStorageRef: profile.avatarStorageRef ?? "",
          phone: profile.phone ?? "",
          jobTitle: profile.jobTitle ?? "",
          bio: profile.bio ?? "",
        }),
      });

      setProfile(updated);
      setSnapshot(updated);
      setEditing(false);
      window.dispatchEvent(new CustomEvent("user-profile-updated"));
      setAlert({
        variant: "success",
        title: "Perfil actualizado",
        description: "Tus datos ya están listos y visibles en toda la app.",
      });
      setAlertOpen(true);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No pudimos guardar el perfil",
        description:
          error instanceof Error ? error.message : "Revisa los datos e inténtalo otra vez.",
      });
      setAlertOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const submitPasswordChange = async () => {
    try {
      setChangingPassword(true);
      await fetchJson("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      setPasswordForm(emptyPasswordForm);
      setAlert({
        variant: "success",
        title: "Contraseña actualizada",
        description: "Tu acceso ya quedó protegido con la nueva contraseña.",
      });
      setAlertOpen(true);
    } catch (error) {
      setAlert({
        variant: "destructive",
        title: "No pudimos cambiar la contraseña",
        description:
          error instanceof Error ? error.message : "Verifica tu contraseña actual e inténtalo de nuevo.",
      });
      setAlertOpen(true);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <div className="app-page-hero h-40 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="app-panel-strong h-[30rem] animate-pulse" />
          <div className="app-panel-strong h-[30rem] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<UserRound className="size-3.5" />}
        badgeLabel="Cuenta y seguridad"
        title="Mi perfil"
        description="Actualiza tu identidad visual, tus datos de contacto y la seguridad de tu acceso sin salir del entorno principal."
        actions={
          editing ? (
            <>
              <Button disabled={saving} onClick={() => void cancelEditing()} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={saving} onClick={() => void saveProfile()} type="button">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar cambios
              </Button>
            </>
          ) : (
            <Button onClick={startEditing} type="button">
              Editar perfil
            </Button>
          )
        }
        // stats={[
        //   { label: "Rol activo", value: profile.roleLabel ?? "Sin rol", hint: profile.roleKey ?? "Cuenta general" },
        //   { label: "Correo", value: profile.email, hint: "Identidad principal" },
        //   { label: "Teléfono", value: profile.phone ?? "Pendiente", hint: "Canal directo" },
        //   // { label: "Foto", value: profile.avatarStorageRef ? "Lista" : "Pendiente", hint: "Avatar del staff" },
        // ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="app-panel-strong p-6">
          <div className="flex flex-col gap-6 border-b border-border/60 pb-6 md:flex-row md:items-center">
            <div className="relative">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(135deg,rgba(13,148,136,0.14),rgba(45,58,102,0.14))] text-2xl font-black text-primary">
                {profile.avatarUrl ? (
                  <img alt={profile.name} className="h-full w-full object-cover" src={profile.avatarUrl} />
                ) : (
                  initials
                )}
              </div>

              {editing ? (
                <div className="absolute -bottom-3 -right-3 flex gap-2">
                  <SignedFileUploader
                    accept="image/*"
                    buttonLabel=""
                    className="h-10 w-10 rounded-full bg-primary p-0 text-primary-foreground"
                    onError={(message) => {
                      setAlert({
                        variant: "destructive",
                        title: "No pudimos subir la foto",
                        description: message,
                      });
                      setAlertOpen(true);
                    }}
                    onUploaded={handleAvatarUploaded}
                    scope="user-avatar"
                  />
                  <Button
                    className="h-10 w-10 rounded-full p-0"
                    onClick={() => void removeAvatar()}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-foreground">{profile.name}</h2>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
                  {profile.roleLabel ?? "Usuario"}
                </span>
              </div>

              <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {profile.phone ?? "Sin teléfono"}
                </p>
                <p className="flex items-center gap-2">
                  <IdCard className="h-4 w-4" />
                  {profile.jobTitle ?? "Sin cargo configurado"}
                </p>
                <p className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  {profile.roleKey ?? "Sin clave de rol"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile-name">Nombre completo</Label>
              <Input
                disabled={!editing}
                id="profile-name"
                onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                value={profile.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Correo electrónico</Label>
              <Input disabled id="profile-email" value={profile.email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-role">Rol activo</Label>
              <Input disabled id="profile-role" value={profile.roleLabel ?? "Sin rol"} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">Teléfono</Label>
              <Input
                disabled={!editing}
                id="profile-phone"
                onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                ref={phoneMaskRef}
                value={profile.phone ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-jobTitle">Cargo o especialidad</Label>
              <Input
                disabled={!editing}
                id="profile-jobTitle"
                onChange={(event) => setProfile({ ...profile, jobTitle: event.target.value })}
                placeholder="Veterinaria general, Recepción, etc."
                value={profile.jobTitle ?? ""}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile-bio">Descripción breve</Label>
              <Textarea
                disabled={!editing}
                id="profile-bio"
                onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                placeholder="Comparte una breve presentación para que el equipo identifique mejor tu perfil."
                rows={5}
                value={profile.bio ?? ""}
              />
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {/* <section className="app-panel-strong p-6">
            <div className="flex items-center gap-3">
              <div className="app-stat-icon">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Foto de perfil</h3>
                <p className="text-sm text-muted-foreground">
                  Se usa en el sidebar y en los espacios donde la app muestra tu identidad.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-border/60 bg-muted/35 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                {profile.avatarStorageRef ? "Avatar configurado" : "Todavía no tienes avatar"}
              </p>
              <p className="mt-1">
                {editing
                  ? "Puedes subir una foto cuadrada. Si no guardas, la app limpia el archivo temporal nuevo."
                  : "Entra en modo edición para cambiar o quitar tu foto de perfil."}
              </p>
            </div>
          </section> */}

          <section className="app-panel-strong p-6">
            <div className="flex items-center gap-3">
              <div className="app-stat-icon">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Cambiar contraseña</h3>
                <p className="text-sm text-muted-foreground">
                  Actualiza tu acceso manteniendo la misma sesión o cerrando las demás.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña actual</Label>
                <Input
                  id="current-password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                  }
                  type="password"
                  value={passwordForm.currentPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                  }
                  type="password"
                  value={passwordForm.newPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                <Input
                  id="confirm-password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  type="password"
                  value={passwordForm.confirmPassword}
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-[1.2rem] border border-border/60 bg-muted/35 p-4">
                <div>
                  <p className="font-semibold text-foreground">Cerrar otras sesiones</p>
                  <p className="text-sm text-muted-foreground">
                    Útil si cambiaste la contraseña por seguridad o compartiste el equipo.
                  </p>
                </div>
                <Switch
                  checked={passwordForm.revokeOtherSessions}
                  onCheckedChange={(checked) =>
                    setPasswordForm((current) => ({
                      ...current,
                      revokeOtherSessions: checked,
                    }))
                  }
                />
              </div>

              <Button
                className="w-full"
                disabled={changingPassword}
                onClick={() => void submitPasswordChange()}
                type="button"
              >
                {changingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Actualizar contraseña
              </Button>
            </div>
          </section>
        </div>
      </div>

      <AppAlert
        description={alert.description}
        onOpenChange={setAlertOpen}
        open={alertOpen}
        title={alert.title}
        variant={alert.variant}
      />
    </div>
  );
}
