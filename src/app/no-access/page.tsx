import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const runtime = "nodejs";

export default async function NoAccessPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <Card className="w-full max-w-lg space-y-4 p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Karey Vet</p>
        <h1 className="text-2xl font-semibold text-foreground">Acceso pendiente de configuración</h1>
        <p className="text-sm leading-6 text-muted-foreground">Tu cuenta está activa, pero todavía no tiene un módulo disponible. Solicita al administrador que revise tu membresía o permisos.</p>
        <Button asChild variant="outline"><Link href="/login">Volver al inicio de sesión</Link></Button>
      </Card>
    </main>
  );
}
