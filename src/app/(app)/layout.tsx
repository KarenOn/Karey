import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import SignOutButton from "@/components/shared/SignOutButton";
import { readCurrentUserProfile } from "@/lib/current-user-profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await readCurrentUserProfile().catch(() => null);

  if (currentUser?.isGlobalAdmin && !currentUser.clinicId) {
    redirect("/admin/clinics");
  }

  if (currentUser?.clinicId && currentUser.clinicIsActive === false) {
    return (
      <div className="app-shell-bg min-h-screen">
        <div className="app-grid pointer-events-none fixed inset-0 opacity-70" />
        <main className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
          <section className="app-panel-strong w-full p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1rem] bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <span className="text-xl font-black">!</span>
            </div>
            <h1 className="mt-5 text-2xl font-black text-foreground">
              {"Tu suscripción no está activa"}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              El acceso a la aplicación está bloqueado para{" "}
              {currentUser.clinicName ?? "tu clínica"}. Ponte en contacto con el
              administrador del sistema para reactivar la cuenta.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Estado actual: {currentUser.subscriptionStatus ?? "inactive"}
            </p>
            <div className="mt-6 flex justify-center">
              <SignOutButton label="Cerrar sesión" variant="outline" />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return <AppSidebar initialUser={currentUser}>{children}</AppSidebar>;
}
