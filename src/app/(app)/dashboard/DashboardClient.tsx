"use client";

import React from "react";
import { Users, PawPrint, Calendar, DollarSign, Sparkles } from "lucide-react";
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
      <section className="app-panel-strong relative overflow-hidden p-6 lg:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.16),transparent_55%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="app-kicker mb-3">
              <Sparkles className="size-3.5" />
              Centro de control clinico
            </div>
            <h2 className="app-heading text-3xl sm:text-4xl">Panel Principal</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Resumen operativo con foco clínico, agenda y finanzas.
            </p>
          </div>

          {/* <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[30rem]">
            <div className="app-panel-muted p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Clientes</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{clients.length}</p>
            </div>
            <div className="app-panel-muted p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Pacientes</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{patients.length}</p>
            </div>
            <div className="app-panel-muted p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Citas hoy</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{todayAppointmentsCount}</p>
            </div>
            <div className="app-panel-muted p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Ingresos</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">${monthlyRevenue.toLocaleString("es-MX")}</p>
            </div>
          </div> */}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Clientes Totales" value={clients.length} icon={Users} color="blue" delay={0} trend="up" trendValue="Base activa" />
        <StatsCard title="Pacientes Registrados" value={patients.length} icon={PawPrint} color="teal" delay={0.1} trend="up" trendValue="Historial vivo" />
        <StatsCard title="Citas Hoy" value={todayAppointmentsCount} icon={Calendar} color="purple" delay={0.2} trend="up" trendValue="Agenda en curso" />
        <StatsCard title="Ingresos del Mes" value={`$${monthlyRevenue.toLocaleString("es-MX")}`} icon={DollarSign} color="green" delay={0.3} trend="up" trendValue="Caja saludable" />
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
