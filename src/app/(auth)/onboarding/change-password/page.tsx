"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/shared/PasswordInput";

export default function ChangeTemporaryPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [callbackUrl, setCallbackUrl] = useState("/");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("callbackUrl");
    if (value?.startsWith("/") && !value.startsWith("//")) setCallbackUrl(value);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || submittingRef.current) return;
    submittingRef.current = true;
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/onboarding/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "No se pudo actualizar la contraseña");
      toast.success("Contraseña actualizada correctamente.");
      router.push(callbackUrl);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar la contraseña"); setSaving(false); submittingRef.current = false; }
  }

  return <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10"><section className="app-panel-strong w-full p-7 sm:p-9"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><LockKeyhole className="h-6 w-6" /></div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Primer acceso</p><h1 className="app-heading mt-3 text-4xl text-foreground">Crea tu nueva contraseña</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Estás usando una contraseña temporal. Crea una contraseña personal para continuar.</p>{error ? <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}<form onSubmit={submit} className="mt-7 space-y-4"><div className="space-y-2"><Label htmlFor="temporary-password">Contraseña temporal</Label><PasswordInput id="temporary-password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="new-password">Nueva contraseña</Label><PasswordInput id="new-password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirmar contraseña</Label><PasswordInput id="confirm-password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div><Button className="w-full" disabled={saving}>{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? "Guardando..." : "Guardar contraseña"}</Button></form></section></main>;
}