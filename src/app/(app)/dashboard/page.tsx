export const dynamic = 'force-dynamic';
import DashboardClient from "./DashboardClient";
import { getClinicIdOrFail } from "@/lib/auth";
import { getDashboardData } from "@/server/queries/dashboard";

export default async function DashboardPage() {
  const clinicId = await getClinicIdOrFail();
  const data = await getDashboardData(clinicId);

  // ⚠️ aquí solo pasas datos planos (strings, numbers, arrays de objetos simples)
  return <DashboardClient data={data} />;
}
