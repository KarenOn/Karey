import Link from "next/link";
import { Mail, PawPrint, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="app-panel-strong hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="app-kicker mb-4">KAREY VET</div>
            <h1 className="app-heading max-w-xl text-5xl leading-[1.05]">Una operación más clara para tu clínica.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              Conoce Karey Vet y descubre cómo puede ayudarte a organizar pacientes, citas, inventario y facturación en un solo lugar.
            </p>
          </div>
          <div className="app-panel-muted p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-bold">Te acompañamos desde el inicio</p>
                <p className="text-sm text-muted-foreground">Nuestro equipo te ayudará a conocer Karey y preparar tu clínica para comenzar.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="app-panel-strong mx-auto w-full max-w-xl p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-primary">
            <PawPrint className="size-7 text-primary-foreground" />
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">CONOCE KAREY VET</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">¿Quieres probar Karey en tu clínica?</h1>
          <p className="mt-4 text-muted-foreground">Solicita una demo y conoce cómo Karey puede adaptarse a la forma de trabajar de tu equipo.</p>
          <Button asChild className="mt-8 h-12 w-full">
            <a href="https://karenon.github.io/Karey-Landing/" target="_blank" rel="noreferrer"><Mail className="mr-2 size-4" />Solicitar demo</a>
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">
            ¿Ya tienes una cuenta? <Link href="/login" className="font-semibold text-foreground">Inicia sesión</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
