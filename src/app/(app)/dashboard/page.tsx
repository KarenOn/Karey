export const dynamic = "force-dynamic";
import DashboardClient from "./DashboardClient";
import { requireClinicPermissions } from "@/lib/server-auth";
import { getDashboardData } from "@/server/queries/dashboard";
import { buildClinicAccess } from "@/lib/permissions";

export default async function DashboardPage() {
  const { clinicId, member } = await requireClinicPermissions([]);
  const access = buildClinicAccess(member.role.key, member.role.permissions);
  const data = await getDashboardData(clinicId, {
    canViewClients: access.modules.clients,
    canViewPatients: access.modules.pets,
    canViewAppointments: access.modules.appointments,
    canViewVaccines: access.modules.vaccines,
    canViewInventory: access.modules.inventory,
    canViewInvoices: access.modules.invoices,
    canViewRevenue: access.actions.payments.read,
  });

  // ⚠️ aquí solo pasas datos planos (strings, numbers, arrays de objetos simples)
  return (
    <DashboardClient
      data={data}
      showOwnerChecklist={member?.role.key === "owner"}
      access={access}
    />
  );
}
