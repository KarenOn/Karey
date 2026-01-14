"use client";

import React from "react";
import { Users, PawPrint, Calendar, DollarSign } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingAppointments from "@/components/dashboard/UpcomingAppointments";
import VaccineReminders from "@/components/dashboard/VaccineReminders";
import LowStockAlerts from "@/components/dashboard/LowStockAlerts";
import RecentInvoices from "@/components/dashboard/RecentInvoices";

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Clientes Totales" value={clients.length} icon={Users} color="blue" delay={0} />
        <StatsCard title="Pacientes Registrados" value={patients.length} icon={PawPrint} color="teal" delay={0.1} />
        <StatsCard title="Citas Hoy" value={todayAppointmentsCount} icon={Calendar} color="purple" delay={0.2} />
        <StatsCard title="Ingresos del Mes" value={`$${monthlyRevenue.toLocaleString("es-MX")}`} icon={DollarSign} color="green" delay={0.3} />
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingAppointments appointments={upcomingAppointments} patients={patients} clients={clients} />
        <VaccineReminders vaccinations={vaccinations} patients={patients} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockAlerts products={products} />
        <RecentInvoices invoices={invoices} clients={clients} />
      </div>
    </div>
  );
}
