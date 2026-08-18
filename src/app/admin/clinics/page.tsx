import { Building2, CircleDollarSign, ShieldCheck, Wallet } from "lucide-react";
import AppPageHero from "@/components/shared/AppPageHero";
import { listAdminClinics } from "@/lib/admin-clinics";
import AdminClinicsClient from "./AdminClinicsClient";

export default async function AdminClinicsPage() {
  const clinics = await listAdminClinics();
  const activeCount = clinics.filter((clinic) => clinic.subscriptionStatus === "active").length;
  const pastDueCount = clinics.filter((clinic) => clinic.subscriptionStatus === "past_due").length;
  const inactiveCount = clinics.filter((clinic) => !clinic.isActive).length;

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<ShieldCheck className="size-3.5" />}
        badgeLabel="Super admin"
        title="Clínicas"
        description="Control manual de acceso, estado de suscripción y seguimiento operativo de cada clínica."
        stats={[
          { label: "Clínicas", value: clinics.length, hint: "Base total" },
          { label: "Activas", value: activeCount, hint: "Acceso habilitado" },
          { label: "En mora", value: pastDueCount, hint: "Seguimiento manual" },
          { label: "Inactivas", value: inactiveCount, hint: "Bloqueadas" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
              <Building2 className="size-3.5" />
              Activa
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">
              <Wallet className="size-3.5" />
              Past due
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-rose-700 dark:text-rose-300">
              <CircleDollarSign className="size-3.5" />
              Inactiva
            </span>
          </div>
        }
      />

      <AdminClinicsClient initialClinics={clinics} />
    </div>
  );
}
