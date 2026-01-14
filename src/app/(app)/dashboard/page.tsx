import DashboardClient from "./DashboardClient";
import { getDashboardData } from "@/server/queries/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();

  // ⚠️ aquí solo pasas datos planos (strings, numbers, arrays de objetos simples)
  return <DashboardClient data={data} />;
}
