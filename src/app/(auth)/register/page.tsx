"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, PawPrint, ShieldCheck } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setIsLoading(true);

    const { error: signUpError } = await authClient.signUp.email(
      {
        name: fullName,
        email,
        password,
        callbackURL: "/today",
      },
      {
        onSuccess: () => router.push("/today"),
        onError: (ctx) => setError(ctx.error.message),
      }
    );

    if (!signUpError) {
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
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
                <p className="text-sm font-extrabold text-foreground">Acceso seguro con Better Auth</p>
                <p className="text-sm text-muted-foreground">Flujo moderno con sesiones protegidas para clinicas y staff.</p>
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
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Dra. Karen Roldan" className="h-12 pl-11 pr-4 font-semibold" required />
              </div>
            </div>

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
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Minimo 8 caracteres" className="h-12 pl-11 pr-12 font-semibold" required minLength={8} />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((v) => !v)} aria-label="Mostrar contrasena">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground/88">Confirmar contrasena</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite la contrasena"
                  className="h-12 pl-11 pr-12 font-semibold"
                  required
                  minLength={8}
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowConfirmPassword((v) => !v)} aria-label="Mostrar confirmacion">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Button disabled={isLoading} className="h-12 w-full text-md disabled:opacity-60">
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-foreground">Inicia sesion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
