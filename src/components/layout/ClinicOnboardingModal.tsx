"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import SignOutButton from "@/components/shared/SignOutButton";
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
import { useCurrentUserProfile } from "@/components/layout/current-user-context";

type DaySchedule = {
  open: string;
  close: string;
  closed: boolean;
};

type ClinicProfile = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  logoStorageRef: string | null;
  slogan: string | null;
  owner: string | null;
  mobile: string | null;
  website: string | null;
  taxName: string | null;
  taxId: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankClabe: string | null;
  invoiceNotes: string | null;
  invoiceTerms: string | null;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
  schedule: Record<string, DaySchedule>;
};

const STEPS = [
  {
    id: "identity",
    title: "Identidad básica",
    description: "Confirma los datos principales de tu clínica antes de entrar.",
  },
  {
    id: "contact",
    title: "Canales de contacto",
    description: "Necesitamos al menos una vía de contacto para dejar la clínica operativa.",
  },
  {
    id: "extras",
    title: "Detalles opcionales",
    description: "Puedes completar estos campos ahora o saltarlos y hacerlo luego.",
  },
] as const;

function isIdentityValid(profile: ClinicProfile | null) {
  return !!profile?.name.trim() && !!profile.owner?.trim();
}

function hasContact(profile: ClinicProfile | null) {
  return !!profile?.email?.trim() || !!profile?.phone?.trim() || !!profile?.mobile?.trim();
}

export default function ClinicOnboardingModal() {
  const currentUser = useCurrentUserProfile();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClinicProfile | null>(null);

  const open = !!currentUser?.clinicSetupRequired;
  const currentStep = STEPS[step];

  useEffect(() => {
    if (!open) {
      setStep(0);
      setError(null);
      return;
    }

    let mounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/clinic-profile", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | ({ error?: string } & Partial<ClinicProfile>)
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudo cargar la clínica.");
        }

        if (!mounted) {
          return;
        }

        setProfile(payload as ClinicProfile);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la clínica."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [open]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return isIdentityValid(profile);
    }

    if (step === 1) {
      return hasContact(profile);
    }

    return true;
  }, [profile, step]);

  if (!open) {
    return null;
  }

  async function handleSubmit() {
    if (!profile) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/clinic-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          owner: profile.owner ?? "",
          slogan: profile.slogan ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          mobile: profile.mobile ?? "",
          address: profile.address ?? "",
          website: profile.website ?? "",
          socialMedia: {
            facebook: profile.socialMedia?.facebook ?? "",
            instagram: profile.socialMedia?.instagram ?? "",
            whatsapp: profile.socialMedia?.whatsapp ?? "",
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ({ error?: string; emailWarning?: string } & Partial<ClinicProfile>)
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar la clínica.");
      }

      if (payload?.emailWarning) {
        toast.warning(payload.emailWarning);
      } else {
        toast.success("La clínica quedó configurada correctamente.");
      }

      window.dispatchEvent(new Event("user-profile-updated"));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la clínica."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (!canContinue) {
      if (step === 0) {
        setError("Completa el nombre y el responsable de la clínica.");
      } else if (step === 1) {
        setError("Agrega al menos un correo o teléfono de contacto.");
      }
      return;
    }

    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-3xl rounded-[2rem] border-border/80 p-0"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <div className="overflow-hidden rounded-[2rem]">
          <div className="bg-[linear-gradient(135deg,rgba(13,148,136,0.14),rgba(45,58,102,0.12))] px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Configuración inicial obligatoria
                </div>
                <DialogHeader className="text-left">
                  <DialogTitle className="text-2xl font-black text-foreground sm:text-3xl">
                    Configura tu clínica para entrar a la app
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                    Este paso aparece solo mientras la clínica todavía no tiene su configuración mínima.
                    Si prefieres salir y volver luego, puedes cerrar sesión.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <SignOutButton label="Cerrar sesión" variant="outline" />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {STEPS.map((item, index) => {
                const active = index === step;
                const completed = index < step;

                return (
                  <div
                    key={item.id}
                    className={`rounded-[1.4rem] border px-4 py-3 ${
                      active
                        ? "border-primary/35 bg-background/90"
                        : completed
                          ? "border-emerald-500/25 bg-emerald-500/10"
                          : "border-border/70 bg-background/55"
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Paso {index + 1}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">{item.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {loading || !profile ? (
              <div className="space-y-4 py-10">
                <div className="h-12 animate-pulse rounded-2xl bg-muted" />
                <div className="h-40 animate-pulse rounded-3xl bg-muted" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-foreground">{currentStep.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentStep.description}
                  </p>
                </div>

                {step === 0 ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="clinic-name">Nombre de la clínica</Label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="clinic-name"
                          className="pl-10"
                          onChange={(event) =>
                            setProfile({ ...profile, name: event.target.value })
                          }
                          value={profile.name}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic-owner">Responsable / propietario</Label>
                      <Input
                        id="clinic-owner"
                        onChange={(event) =>
                          setProfile({ ...profile, owner: event.target.value })
                        }
                        value={profile.owner ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic-slogan">Slogan</Label>
                      <Input
                        id="clinic-slogan"
                        onChange={(event) =>
                          setProfile({ ...profile, slogan: event.target.value })
                        }
                        placeholder="Opcional"
                        value={profile.slogan ?? ""}
                      />
                    </div>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="clinic-email">Correo de la clínica</Label>
                      <Input
                        id="clinic-email"
                        onChange={(event) =>
                          setProfile({ ...profile, email: event.target.value })
                        }
                        placeholder="clinica@example.com"
                        type="email"
                        value={profile.email ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic-phone">Teléfono fijo</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="clinic-phone"
                          className="pl-10"
                          onChange={(event) =>
                            setProfile({ ...profile, phone: event.target.value })
                          }
                          value={profile.phone ?? ""}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic-mobile">Teléfono móvil / WhatsApp</Label>
                      <Input
                        id="clinic-mobile"
                        onChange={(event) =>
                          setProfile({ ...profile, mobile: event.target.value })
                        }
                        value={profile.mobile ?? ""}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="clinic-address">Dirección</Label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="clinic-address"
                          className="pl-10"
                          onChange={(event) =>
                            setProfile({ ...profile, address: event.target.value })
                          }
                          placeholder="Opcional"
                          value={profile.address ?? ""}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="clinic-website">Sitio web</Label>
                      <Input
                        id="clinic-website"
                        onChange={(event) =>
                          setProfile({ ...profile, website: event.target.value })
                        }
                        placeholder="Opcional"
                        value={profile.website ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic-facebook">Facebook</Label>
                      <Input
                        id="clinic-facebook"
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            socialMedia: {
                              ...profile.socialMedia,
                              facebook: event.target.value,
                            },
                          })
                        }
                        placeholder="Opcional"
                        value={profile.socialMedia?.facebook ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic-instagram">Instagram</Label>
                      <Input
                        id="clinic-instagram"
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            socialMedia: {
                              ...profile.socialMedia,
                              instagram: event.target.value,
                            },
                          })
                        }
                        placeholder="Opcional"
                        value={profile.socialMedia?.instagram ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clinic-whatsapp">WhatsApp público</Label>
                      <Input
                        id="clinic-whatsapp"
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            socialMedia: {
                              ...profile.socialMedia,
                              whatsapp: event.target.value,
                            },
                          })
                        }
                        placeholder="Opcional"
                        value={profile.socialMedia?.whatsapp ?? ""}
                      />
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
                    {error}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/70 px-6 py-5 sm:px-8">
            {step > 0 ? (
              <Button
                disabled={saving || loading}
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                type="button"
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4" />
                Atrás
              </Button>
            ) : (
              <div />
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {step === STEPS.length - 1 ? (
                <Button
                  disabled={saving || loading}
                  onClick={() => void handleSubmit()}
                  type="button"
                  variant="outline"
                >
                  Saltar este paso
                </Button>
              ) : null}

              {step < STEPS.length - 1 ? (
                <Button
                  disabled={saving || loading}
                  onClick={handleNext}
                  type="button"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  disabled={saving || loading}
                  onClick={() => void handleSubmit()}
                  type="button"
                >
                  {saving ? "Guardando..." : "Guardar y entrar"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
