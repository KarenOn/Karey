import AppSidebar from "@/components/layout/AppSidebar";
import { readCurrentUserProfile } from "@/lib/current-user-profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await readCurrentUserProfile().catch(() => null);

  return <AppSidebar initialUser={currentUser}>{children}</AppSidebar>;
}
