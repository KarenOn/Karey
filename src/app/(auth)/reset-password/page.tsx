"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, KeyRound, Lock, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) {
      setError("Este enlace ya no es válido o venció.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!response.ok) {
        throw new Error("No pudimos restablecer la contraseña.");
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos restablecer la contraseña."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4">
        <div className="app-panel-strong w-full p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2d3a66_0%,#0d9488_100%)]">
            <PawPrint className="size-6 text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold">Contraseña actualizada</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/login">Ir al inicio de sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4">
        <div className="app-panel-strong w-full p-8 text-center">
          <h1 className="font-display text-3xl font-semibold">Enlace no disponible</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Solicita un nuevo enlace para recuperar tu contraseña.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/forgot-password">Solicitar nuevo enlace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4">
      <form onSubmit={onSubmit} className="app-panel-strong w-full space-y-5 p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2d3a66_0%,#0d9488_100%)]">
          <PawPrint className="size-6 text-white" />
        </div>

        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea una nueva contraseña para volver a entrar a Karey Vet.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground/88">
            Nueva contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-11 pr-12 font-semibold"
              minLength={8}
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShow((value) => !value)}
              aria-label="Mostrar contraseña"
            >
              <Eye className="size-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground/88">
            Confirmar contraseña
          </label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 pl-11 pr-12 font-semibold"
              minLength={8}
              type={showConfirm ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowConfirm((value) => !value)}
              aria-label="Mostrar confirmación de contraseña"
            >
              <Eye className="size-4" />
            </button>
          </div>
        </div>

        <Button className="h-12 w-full" disabled={loading}>
          {loading ? "Actualizando contraseña..." : "Guardar nueva contraseña"}
        </Button>

        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          href="/login"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
