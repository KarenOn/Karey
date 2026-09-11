export const dynamic = 'force-dynamic';
import DashboardClient from "./DashboardClient";
import { requireClinicPermission } from "@/lib/server-auth";
import { getDashboardData } from "@/server/queries/dashboard";
import { hasPermission, isElevatedClinicRole } from "@/lib/permissions";

export default async function DashboardPage() {
  const { clinicId, member } = await requireClinicPermission("dashboard.read");
  const canViewInventory = isElevatedClinicRole(member?.role.key) || hasPermission(member?.role.permissions, "inventory.read");
  const data = await getDashboardData(clinicId, canViewInventory);

  // ⚠️ aquí solo pasas datos planos (strings, numbers, arrays de objetos simples)
  return <DashboardClient data={data} showOwnerChecklist={member?.role.key === "owner"} />;
}
