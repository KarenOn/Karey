"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AcceptInvitePage() {
  const [token, setToken] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("token") ?? "";
    }
    return "";
  });
  const [status, setStatus] = useState<string>("");

  async function accept() {
    setStatus("Procesando...");

    const res = await fetch("/api/employees/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.error ?? "Error aceptando invitación (¿ya iniciaste sesión?)");
      return;
    }

    setStatus("✅ Invitación aceptada. Ya eres miembro de la clínica.");
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Aceptar invitación</h1>
      <p className="text-sm text-slate-500">
        Debes iniciar sesión con el email invitado para aceptar.
      </p>

      <Button onClick={accept} disabled={!token}>
        Aceptar
      </Button>

      {status && <div className="text-sm">{status}</div>}
    </div>
  );
}
