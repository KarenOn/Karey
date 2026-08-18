import Link from "next/link";
import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="app-panel-strong w-full max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#0d9488_0%,#2d3a66_100%)] text-white">
          <WifiOff className="h-7 w-7" />
        </div>

        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Modo offline
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">
          No hay conexion disponible
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Puedes volver a intentar cuando regrese la red. Si ya abriste la app antes,
          algunas pantallas seguiran disponibles desde cache.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Reintentar
          </Link>
        </div>
      </div>
    </div>
  );
}
