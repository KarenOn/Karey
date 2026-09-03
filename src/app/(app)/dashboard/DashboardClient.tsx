"use client";

import React from "react";
import { Calendar, DollarSign, PawPrint, Sparkles, Users } from "lucide-react";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingAppointments from "@/components/dashboard/UpcomingAppointments";
import VaccineReminders from "@/components/dashboard/VaccineReminders";
import LowStockAlerts from "@/components/dashboard/LowStockAlerts";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import AppMetricCard from "@/components/shared/AppMetricCard";
import AppPageHero from "@/components/shared/AppPageHero";

import type { DashboardDataDTO } from "@/types/common";

export default function DashboardClient({ data }: { data: DashboardDataDTO }) {
  const {
    clients,
    patients,
    todayAppointmentsCount,
    monthlyRevenue,
    upcomingAppointments,
    vaccinations,
    products,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AppMetricCard
          label="Clientes"
          value={clients.length}
          icon={Users}
          hint="Base activa"
        />
        <AppMetricCard
          label="Pacientes"
          value={patients.length}
          icon={PawPrint}
          hint="Historial clínico"
        />
        <AppMetricCard
          label="Citas hoy"
          value={todayAppointmentsCount}
          icon={Calendar}
          hint="Agenda del día"
        />
        <AppMetricCard
          label="Ingresos"
          value={`$${monthlyRevenue.toLocaleString("es-MX")}`}
          icon={DollarSign}
          hint="Mes en curso"
        />
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UpcomingAppointments
          appointments={upcomingAppointments}
          patients={patients}
          clients={clients}
        />
        <VaccineReminders vaccinations={vaccinations} patients={patients} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LowStockAlerts products={products} />
        <RecentInvoices invoices={invoices} clients={clients} />
      </div>
    </div>
  );
}
