"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MailWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUserProfile } from "@/components/layout/current-user-context";

export default function EmailVerificationBanner() {
  const currentUser = useCurrentUserProfile();
  const pathname = usePathname();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser || currentUser.emailVerified) {
    return null;
  }

  const userEmail = currentUser.email;

  async function handleResend() {
    try {
      setSending(true);
      setMessage(null);
      setError(null);

      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          callbackURL: pathname || "/today",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.message ??
            payload?.error ??
            "No se pudo enviar el correo de verificación."
        );
      }

      setMessage("Te enviamos un nuevo enlace de verificación.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo enviar el correo de verificación."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-amber-500/25 bg-amber-500/10">
      <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700">
            <MailWarning className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Tu correo todavía no fue verificado
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Puedes seguir usando la aplicación, pero te recomendamos verificar{" "}
              <span className="font-semibold text-foreground">{userEmail}</span>.
            </p>
            {message ? (
              <p className="mt-2 text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          </div>
        </div>

        <Button
          className="min-w-44 gap-2 self-start md:self-center"
          disabled={sending}
          onClick={() => void handleResend()}
          variant="outline"
        >
          <RefreshCw className={sending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {sending ? "Enviando..." : "Enviar enlace"}
        </Button>
      </div>
    </div>
  );
}
