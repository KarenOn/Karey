"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmState =
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function ConfirmAppointmentPage() {
  const token = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);

  const [state, setState] = useState<ConfirmState>({
    kind: "loading",
    message: "Estamos confirmando tu cita. Esto tomará unos segundos.",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function confirm() {
      try {
        const response = await fetch("/api/appointments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { clientName?: string; error?: string; petName?: string }
          | null;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setState({
            kind: "error",
            message:
              payload?.error ??
              "No pudimos confirmar la cita con este enlace. Comunícate con la clínica si necesitas ayuda.",
          });
          return;
        }

        setState({
          kind: "success",
          message: payload?.petName
            ? `La cita de ${payload.petName} quedó confirmada correctamente.`
            : "La cita quedó confirmada correctamente.",
        });
      } catch {
        if (cancelled) {
          return;
        }

        setState({
          kind: "error",
          message: "Ocurrió un problema al confirmar la cita. Inténtalo nuevamente en unos momentos.",
        });
      }
    }

    void confirm();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const resolvedState = token
    ? state
      : {
        kind: "error",
        message: "Este enlace de confirmación no es válido.",
      } satisfies ConfirmState;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="app-panel-strong w-full max-w-xl p-8 text-center sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,#0d9488_0%,#2d3a66_100%)] text-white shadow-[0_20px_40px_rgba(18,41,79,0.24)]">
          {resolvedState.kind === "loading" ? (
            <LoaderCircle className="h-7 w-7 animate-spin" />
          ) : resolvedState.kind === "success" ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <XCircle className="h-7 w-7" />
          )}
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
          Confirmación de cita
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">
          {resolvedState.kind === "success"
            ? "¡Cita confirmada!"
            : resolvedState.kind === "error"
              ? "No se pudo confirmar"
              : "Confirmando cita"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {resolvedState.message}
        </p>

        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link href="/login">Abrir Karey Vet</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
