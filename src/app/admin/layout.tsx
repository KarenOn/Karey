import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import SignOutButton from "@/components/shared/SignOutButton";
import { requireSuperAdmin } from "@/lib/server-auth";

async function getAdminSessionOrRedirect() {
  try {
    return await requireSuperAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    if (message === "UNAUTHORIZED") {
      redirect("/login");
    }
    redirect("/");
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getAdminSessionOrRedirect();

  return (
    <div className="app-shell-bg min-h-screen">
      <div className="app-grid pointer-events-none fixed inset-0 opacity-70" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 lg:px-6 lg:py-6">
        <header className="glass flex items-center justify-between gap-4 rounded-[1.8rem] px-5 py-4">
          <div className="min-w-0">
            <div className="app-kicker border-0">
              <ShieldCheck className="size-3.5" />
              Panel interno
            </div>
            <h1 className="mt-3 app-heading text-2xl sm:text-3xl">Administración</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sesión activa como {session.user.name ?? session.user.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground">
              Solo super admin
            </div>
            <SignOutButton label="Salir" variant="outline" />
          </div>
        </header>

        <main className="flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
