"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, PawPrint, Sparkles, MoonStar } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isViewActive, setIsViewActive] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await authClient.signIn.email(
      {
        email: normalizedEmail,
        password,
        rememberMe: true,
      },
      {
        onError: (ctx) => setErr(ctx.error.message),
      }
    );

    if (error) {
      setIsLoading(false);
      return;
    }

    if (!data?.user.emailVerified) {
      try {
        const response = await fetch("/api/auth/send-verification-email", {
          body: JSON.stringify({
            callbackURL: "/dashboard",
            email: normalizedEmail,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;

          throw new Error(
            payload?.message ??
              payload?.error ??
              "No se pudo enviar el correo de verificacion."
          );
        }

        toast.success("Te enviamos un correo para verificar tu cuenta.");
      } catch (verificationError) {
        const message =
          verificationError instanceof Error
            ? verificationError.message
            : "No se pudo enviar el correo de verificacion.";
        toast.error(message);
      }
    }

    setIsLoading(false);
    router.push("/dashboard");
  };

  const onGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center py-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="app-panel-strong relative hidden overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.16),transparent_50%)]" />
          <div className="relative">
            <div className="app-kicker mb-4">
              <Sparkles className="size-3.5" />
              Karey Vet Suite
            </div>
            <h1 className="app-heading max-w-xl text-5xl leading-[1.05]">La operacion veterinaria puede sentirse premium sin perder calidez.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              Disenado para clinicas que necesitan mas informacion visible, mejor jerarquia y una experiencia agradable tanto en escritorio como en jornadas largas.
            </p>
          </div>

          <div className="relative grid gap-4 sm:grid-cols-3">
            <div className="app-panel-muted p-4">
              <PawPrint className="mb-3 size-5 text-primary" />
              <p className="text-sm font-extrabold text-foreground">Pacientes al centro</p>
              <p className="mt-1 text-sm text-muted-foreground">Todo mantiene contexto clinico y humano.</p>
            </div>
            <div className="app-panel-muted p-4">
              <MoonStar className="mb-3 size-5 text-(--brand-gold)" />
              <p className="text-sm font-extrabold text-foreground">Dark mode real</p>
              <p className="mt-1 text-sm text-muted-foreground">Contraste comodo para jornadas extensas.</p>
            </div>
            <div className="app-panel-muted p-4">
              <Sparkles className="mb-3 size-5 text-primary" />
              <p className="text-sm font-extrabold text-foreground">Diseno uniforme</p>
              <p className="mt-1 text-sm text-muted-foreground">Mismos patrones en tablas, cards y formularios.</p>
            </div>
          </div>
        </section>

        <div className="app-panel-strong mx-auto w-full max-w-xl overflow-hidden p-8 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#0d9488_0%,#2d3a66_100%)] shadow-[0_20px_40px_rgba(18,41,79,0.24)]">
              <PawPrint className="size-7 text-white" />
            </div>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">Bienvenida de regreso</p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">Inicia sesion en Karey Vet</h1>
            <p className="mt-3 text-muted-foreground">Accede a clientes, pacientes, agenda y facturacion con una interfaz mas clara y expresiva.</p>
          </div>

          <button type="button" onClick={onGoogle} className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border/80 bg-background/70 transition hover:bg-background">
            <span className="text-lg">G</span>
            <span className="font-semibold text-foreground">Continuar con Google</span>
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">o</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {err && <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{err}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground/88">Correo electronico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="h-12 pl-11 pr-4 font-semibold" required />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground/88">Contrasena</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type={isViewActive ? "text" : "password"} placeholder="••••••••" className="h-12 pl-11 pr-12 font-semibold" required />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setIsViewActive(!isViewActive)} aria-label="Mostrar contrasena">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Button disabled={isLoading} className="h-12 w-full text-md disabled:opacity-60">
              {isLoading ? "Ingresando..." : "Entrar al sistema"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <button className="text-left transition hover:text-foreground" type="button">¿Olvidaste tu contrasena?</button>
            <span>
              ¿Necesitas una cuenta? <Link className="font-semibold text-foreground" href="/register">Crear cuenta</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
