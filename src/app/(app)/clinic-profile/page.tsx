"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Building2, Mail, Phone, Globe, MapPin, FileText, CreditCard, Clock,
  Camera, Save, Facebook, Instagram, MessageCircle, Pencil, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const dayNames: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

type DayKey = keyof typeof dayNames;

type ClinicProfile = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  timezone: string;

  logoUrl: string | null;
  slogan: string | null;
  owner: string | null;
  mobile: string | null;
  website: string | null;

//   city: string | null;
//   state: string | null;
//   zipCode: string | null;
//   country: string | null;

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

  schedule: Record<DayKey, { open: string; close: string; closed: boolean }>;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...(init ?? {}) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Error");
  return data as T;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [snapshot, setSnapshot] = useState<ClinicProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "fiscal" | "schedule" | "invoice">("general");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tabs = useMemo(() => ([
    { id: "general", label: "General", icon: Building2 },
    { id: "fiscal", label: "Fiscal", icon: FileText },
    { id: "schedule", label: "Horarios", icon: Clock },
    { id: "invoice", label: "Facturación", icon: CreditCard },
  ]), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await fetchJson<ClinicProfile>("/api/clinic-profile");
        if (!mounted) return;
        setProfile(data);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Error cargando perfil");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const startEdit = () => {
    if (!profile) return;
    setSnapshot(profile);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (snapshot) setProfile(snapshot);
    setIsEditing(false);
    setErr(null);
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setErr(null);

      const payload = {
        name: profile.name,
        logoUrl: profile.logoUrl ?? "",
        slogan: profile.slogan ?? "",
        owner: profile.owner ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        mobile: profile.mobile ?? "",
        website: profile.website ?? "",

        address: profile.address ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        zipCode: profile.zipCode ?? "",
        country: profile.country ?? "",

        socialMedia: {
          facebook: profile.socialMedia?.facebook ?? "",
          instagram: profile.socialMedia?.instagram ?? "",
          whatsapp: profile.socialMedia?.whatsapp ?? "",
        },

        taxName: profile.taxName ?? "",
        taxId: profile.taxId ?? "",

        bankName: profile.bankName ?? "",
        bankAccount: profile.bankAccount ?? "",
        bankClabe: profile.bankClabe ?? "",

        invoiceNotes: profile.invoiceNotes ?? "",
        invoiceTerms: profile.invoiceTerms ?? "",

        schedule: profile.schedule,
      };

      const updated = await fetchJson<ClinicProfile>("/api/clinic-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setProfile(updated);
      setSnapshot(updated);
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setErr(e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (day: DayKey, field: "open" | "close" | "closed", value: string | boolean) => {
    if (!profile) return;
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: {
            ...prev.schedule[day],
            [field]: value as any,
          },
        },
      };
    });
  };

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-3xl bg-muted animate-pulse" />
        <div className="h-12 rounded-xl bg-muted animate-pulse" />
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 border border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Logo */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl bg-card border-2 border-border flex items-center justify-center overflow-hidden shadow-xl">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-12 h-12 text-primary" />
              )}
            </div>
            {isEditing && (
              <button
                type="button"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg opacity-70 cursor-not-allowed"
                title="Luego conectamos subida de imagen (S3)"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{profile.name}</h1>
            {profile.slogan && <p className="text-muted-foreground mt-1 italic">"{profile.slogan}"</p>}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {profile.email ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {profile.phone ?? "—"}
              </span>
              {profile.website && (
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {profile.website}
                </span>
              )}
            </div>

            {err ? <p className="mt-3 text-sm text-rose-600">{err}</p> : null}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEdit} className="gap-2" disabled={saving}>
                  <X className="w-4 h-4" /> Cancelar
                </Button>
                <Button onClick={handleSave} className="gap-2" disabled={saving}>
                  {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Guardado" : saving ? "Guardando..." : "Guardar"}
                </Button>
              </>
            ) : (
              <Button onClick={startEdit} className="gap-2">
                <Pencil className="w-4 h-4" />
                Editar Perfil
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-card rounded-2xl border border-border p-6">
        {/* GENERAL */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2 md:col-span-2">
                <Label>Logo URL</Label>
                <Input
                  value={profile.logoUrl ?? ""}
                  onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Nombre de la Clínica</Label>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Slogan</Label>
                <Input value={profile.slogan ?? ""} onChange={(e) => setProfile({ ...profile, slogan: e.target.value })} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Propietario / Director</Label>
                <Input value={profile.owner ?? ""} onChange={(e) => setProfile({ ...profile, owner: e.target.value })} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Correo Electrónico</Label>
                <Input type="email" value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Teléfono Fijo</Label>
                <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Teléfono Móvil</Label>
                <Input value={profile.mobile ?? ""} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Sitio Web</Label>
                <Input value={profile.website ?? ""} onChange={(e) => setProfile({ ...profile, website: e.target.value })} disabled={!isEditing} />
              </div>
            </div>

            {/* Dirección */}
            <div className="pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" /> Dirección
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label className="font-semibold">Calle y Número</Label>
                  <Input value={profile.address ?? ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} disabled={!isEditing} />
                </div>
                {/* <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={profile.state ?? ""} onChange={(e) => setProfile({ ...profile, state: e.target.value })} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input value={profile.zipCode ?? ""} onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input value={profile.country ?? ""} onChange={(e) => setProfile({ ...profile, country: e.target.value })} disabled={!isEditing} />
                </div> */}
              </div>
            </div>

            {/* Redes */}
            <div className="pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4">Redes Sociales</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Facebook className="w-4 h-4" /> Facebook</Label>
                  <Input
                    value={profile.socialMedia?.facebook ?? ""}
                    onChange={(e) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, facebook: e.target.value } })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram</Label>
                  <Input
                    value={profile.socialMedia?.instagram ?? ""}
                    onChange={(e) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, instagram: e.target.value } })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</Label>
                  <Input
                    value={profile.socialMedia?.whatsapp ?? ""}
                    onChange={(e) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, whatsapp: e.target.value } })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FISCAL */}
        {activeTab === "fiscal" && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">Esta información aparecerá en las facturas generadas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label className="font-semibold">Razón Social</Label>
                <Input value={profile.taxName ?? ""} onChange={(e) => setProfile({ ...profile, taxName: e.target.value })} disabled={!isEditing} />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">RNC / Identificación Fiscal</Label>
                <Input value={profile.taxId ?? ""} onChange={(e) => setProfile({ ...profile, taxId: e.target.value })} disabled={!isEditing} />
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" /> Datos Bancarios
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Banco</Label>
                  <Input value={profile.bankName ?? ""} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Número de Cuenta</Label>
                  <Input value={profile.bankAccount ?? ""} onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">CLABE / Referencia</Label>
                  <Input value={profile.bankClabe ?? ""} onChange={(e) => setProfile({ ...profile, bankClabe: e.target.value })} disabled={!isEditing} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-6">
              Configura el horario de atención. Este horario se mostrará a tus clientes.
            </p>

            {(Object.keys(profile.schedule) as DayKey[]).map((day) => {
              const hours = profile.schedule[day];
              return (
                <div
                  key={day}
                  className={cn(
                    "flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border transition-colors",
                    hours.closed ? "bg-muted/50 border-border" : "bg-card border-border hover:border-primary/30",
                  )}
                >
                  <div className="w-32 flex items-center gap-3">
                    <Switch
                      checked={!hours.closed}
                      onCheckedChange={(checked) => updateSchedule(day, "closed", !checked)}
                      disabled={!isEditing}
                    />
                    <span className={cn("font-semibold", hours.closed && "text-muted-foreground font-medium")}>{dayNames[day]}</span>
                  </div>

                  {!hours.closed && (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Abre</Label>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateSchedule(day, "open", e.target.value)}
                          disabled={!isEditing}
                          className="w-32"
                        />
                      </div>
                      <span className="text-muted-foreground">—</span>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Cierra</Label>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateSchedule(day, "close", e.target.value)}
                          disabled={!isEditing}
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}

                  {hours.closed && <span className="text-sm text-muted-foreground italic">Cerrado</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* INVOICE */}
        {activeTab === "invoice" && (
            <>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="font-semibold">Notas en Factura</Label>
              <Textarea
                value={profile.invoiceNotes ?? ""}
                onChange={(e) => setProfile({ ...profile, invoiceNotes: e.target.value })}
                disabled={!isEditing}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Términos y Condiciones</Label>
              <Textarea
                value={profile.invoiceTerms ?? ""}
                onChange={(e) => setProfile({ ...profile, invoiceTerms: e.target.value })}
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4">Vista Previa en Factura</h3>
              <div className="bg-muted/30 rounded-xl p-6 border border-dashed border-border">
                <div className="flex items-start gap-4 mb-4 pb-4 border-b border-border">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{profile.name}</h4>
                    <p className="text-sm text-muted-foreground">{profile.taxName}</p>
                    <p className="text-sm text-muted-foreground">RFC: {profile.taxId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dirección:</p>
                    <p className="text-foreground">
                      {profile.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contacto:</p>
                    <p className="text-foreground">{profile.phone}</p>
                    <p className="text-foreground">{profile.email}</p>
                  </div>
                </div>
                {profile.bankName && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">Datos para transferencia:</p>
                    <p className="text-sm text-foreground">
                      {profile.bankName} | Cuenta: {profile.bankAccount} | CLABE: {profile.bankClabe}
                    </p>
                  </div>
                )}
              </div>
            </div>
            </>
        )}
      </div>
    </div>
  );
}
