"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, PawPrint, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  getFriendlyAuthMessage,
  getFriendlyVerificationMessage,
} from "@/lib/auth-feedback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PasswordInput from "@/components/shared/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const registerResponse = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: normalizedEmail,
          password,
        }),
      });

      const registerPayload = (await registerResponse.json().catch(() => null)) as
        | { error?: string; emailWarning?: string | null }
        | null;

      if (!registerResponse.ok) {
        throw new Error(registerPayload?.error ?? "No se pudo crear la cuenta.");
      }

      if (registerPayload?.emailWarning) {
        toast.warning(registerPayload.emailWarning);
      }

      const { error: signInError } = await authClient.signIn.email(
        {
          email: normalizedEmail,
          password,
          rememberMe: true,
        },
        {
          onError: () => setError("La cuenta fue creada, pero no pudimos iniciar sesión automáticamente."),
        }
      );

      if (signInError) {
        setError("La cuenta se creó, pero no pudimos iniciar sesión automáticamente.");
        setIsLoading(false);
        return;
      }

      const verificationResponse = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          callbackURL: "/today",
        }),
      });

      if (verificationResponse.ok) {
        toast.success("Te enviamos un correo para verificar tu cuenta.");
      } else {
        const verificationPayload = (await verificationResponse.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;

        toast.warning(
          getFriendlyVerificationMessage(
            verificationPayload?.message ?? verificationPayload?.error
          )
        );
      }

      router.push("/today");
    } catch (submitError) {
      setError(
        getFriendlyAuthMessage(
          submitError instanceof Error ? submitError.message : null,
          "register"
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center py-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="app-panel-strong relative hidden overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(216,162,87,0.18),transparent_50%)]" />

          <div className="relative">
            <div className="app-kicker mb-4">Nuevo comienzo</div>
            <h1 className="app-heading max-w-xl text-5xl leading-[1.05]">Crea tu espacio de trabajo veterinario en minutos.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              Registra tu equipo, organiza pacientes y controla inventario desde una interfaz pensada para densidad informativa sin ruido visual.
            </p>
          </div>

          <div className="relative app-panel-muted p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">Acceso seguro</p>
                <p className="text-sm text-muted-foreground">Tu cuenta y tus sesiones quedan protegidas para trabajar con tranquilidad.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="app-panel-strong mx-auto w-full max-w-xl overflow-hidden p-8 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#2d3a66_0%,#0d9488_100%)] shadow-[0_20px_40px_rgba(18,41,79,0.24)]">
              <PawPrint className="size-7 text-white" />
            </div>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">Crear cuenta</p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">Empieza con Karey Vet</h1>
            <p className="mt-3 text-muted-foreground">Configura tu cuenta y entra al panel con estilo coherente en modo claro y oscuro.</p>
          </div>

          {error && <div className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground/88">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Dra. Karen Roldan" autoComplete="name" className="h-12 pl-11 pr-4 font-semibold" required />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground/88">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="nombre@ejemplo.com" autoComplete="email" className="h-12 pl-11 pr-4 font-semibold" required />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground/88">Contraseña</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crea una contraseña de al menos 8 caracteres" autoComplete="new-password" className="h-12 font-semibold" leadingIcon required minLength={8} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground/88">Confirmar contraseña</label>
              <div>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Vuelve a escribir la contraseña"
                  autoComplete="new-password"
                  className="h-12 font-semibold"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button disabled={isLoading} className="h-12 w-full text-md disabled:opacity-60">
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-foreground">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
