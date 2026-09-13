"use client";

import React from "react";
import { Calendar, DollarSign, PawPrint, Sparkles, Users } from "lucide-react";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingAppointments from "@/components/dashboard/UpcomingAppointments";
import VaccineReminders from "@/components/dashboard/VaccineReminders";
import LowStockAlerts from "@/components/dashboard/LowStockAlerts";
import ExpiringInventoryAlerts from "@/components/dashboard/ExpiringInventoryAlerts";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import AppMetricCard from "@/components/shared/AppMetricCard";
import AppPageHero from "@/components/shared/AppPageHero";
import OwnerSetupChecklist from "@/components/layout/onboarding/OwnerSetupChecklist";

import type { DashboardDataDTO } from "@/types/common";
import type { ClinicAccess } from "@/lib/permissions";
import { toMoney } from "@/lib/utility";

export default function DashboardClient({ data, access, showOwnerChecklist = false }: { data: DashboardDataDTO; access: ClinicAccess; showOwnerChecklist?: boolean }) {
  const {
    clients,
    patients,
    todayAppointmentsCount,
    monthlyRevenue,
    upcomingAppointments,
    vaccinations,
    products,
    expiringProducts,
    invoices,
  } = data;

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<Sparkles className="size-3.5" />}
        badgeLabel="Resumen operativo"
        title="Panel principal"
        description="Consulta agenda, pacientes, inventario y facturación desde una misma vista operativa."
      />

      {showOwnerChecklist ? <OwnerSetupChecklist state={data.setupChecklist} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {access.modules.clients ? <AppMetricCard
          label="Clientes"
          value={clients.length}
          icon={Users}
          hint="Base activa"
        /> : null}
        {access.modules.pets ? <AppMetricCard
          label="Pacientes"
          value={patients.length}
          icon={PawPrint}
          hint="Historial clínico"
        /> : null}
        {access.modules.appointments ? <AppMetricCard
          label="Citas hoy"
          value={todayAppointmentsCount}
          icon={Calendar}
          hint="Agenda del día"
        /> : null}
        {access.actions.payments.read ? <AppMetricCard
          label="Ingresos"
          value={toMoney(monthlyRevenue)}
          icon={DollarSign}
          hint="Mes en curso"
        /> : null}
      </div>

      <QuickActions access={access} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {access.modules.appointments ? <UpcomingAppointments
          appointments={upcomingAppointments}
          patients={patients}
          clients={clients}
        /> : null}
        {access.modules.vaccines && access.modules.pets ? <VaccineReminders vaccinations={vaccinations} patients={patients} /> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {access.modules.inventory ? <ExpiringInventoryAlerts products={expiringProducts} /> : null}
        {access.modules.inventory ? <LowStockAlerts products={products} /> : null}
        {access.modules.invoices ? <RecentInvoices invoices={invoices} clients={clients} /> : null}
      </div>
    </div>
  );
}
