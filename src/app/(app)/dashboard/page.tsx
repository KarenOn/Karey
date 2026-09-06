export const dynamic = 'force-dynamic';
import DashboardClient from "./DashboardClient";
import { requireClinicPermission } from "@/lib/server-auth";
import { getDashboardData } from "@/server/queries/dashboard";

export default async function DashboardPage() {
  const { clinicId } = await requireClinicPermission("dashboard.read");
  const data = await getDashboardData(clinicId);

  // ⚠️ aquí solo pasas datos planos (strings, numbers, arrays de objetos simples)
  return <DashboardClient data={data} />;
}
