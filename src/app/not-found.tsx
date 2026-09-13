import Link from "next/link";
import { Home, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="app-shell-bg flex min-h-screen items-center justify-center px-6 py-12">
      <section className="app-panel-strong w-full max-w-lg p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PawPrint className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Página no encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La página o recurso que buscas no existe o ya no está disponible.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/dashboard"><Home className="mr-2 h-4 w-4" />Volver al inicio</Link></Button>
        </div>
      </section>
    </main>
  );
}
