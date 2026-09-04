"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, LoaderCircle, LogOut, PawPrint, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type InviteState = "pending" | "accepted" | "expired" | "unavailable" | "invalid";
type InviteResponse = {
  state: InviteState;
  invitation?: { email: string; clinicName: string; roleName: string; expiresAt: string };
  sessionEmail: string | null;
};

function loginUrl(token: string) {
  return `/login?callbackUrl=${encodeURIComponent(`/accept-invite?token=${encodeURIComponent(token)}`)}`;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(nextToken);
    if (!nextToken) { setInvite({ state: "invalid", sessionEmail: null }); setLoading(false); return; }
    fetch(`/api/employees/invite/accept?token=${encodeURIComponent(nextToken)}`, { cache: "no-store" })
      .then(async (response) => { const data = (await response.json().catch(() => null)) as InviteResponse | null; if (!data) throw new Error(); setInvite(data); })
      .catch(() => setInvite({ state: "invalid", sessionEmail: null }))
      .finally(() => setLoading(false));
  }, []);

  const callbackUrl = useMemo(() => loginUrl(token), [token]);
  const wrongAccount = Boolean(invite?.invitation && invite.sessionEmail && invite.sessionEmail.toLowerCase() !== invite.invitation.email.toLowerCase());

  async function switchAccount() {
    if (switching) return;
    setSwitching(true);
    await authClient.signOut({ fetchOptions: { onSuccess: () => router.push(callbackUrl), onError: () => { setSwitching(false); setError("No se pudo cerrar la sesión actual."); } } });
  }

  async function acceptInvitation() {
    if (accepting || !token) return;
    setAccepting(true); setError(null);
    try {
      const response = await fetch("/api/employees/invite/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "No se pudo aceptar la invitación.");
      toast.success("Invitación aceptada correctamente.");
      router.push("/dashboard");
    } catch (acceptError) { setError(acceptError instanceof Error ? acceptError.message : "No se pudo aceptar la invitación."); setAccepting(false); }
  }

  if (loading) return <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-label="Cargando invitación" /></div>;

  const state = invite?.state ?? "invalid";
  const title = state === "expired" ? "Invitación expirada" : state === "accepted" ? "Invitación ya aceptada" : state === "unavailable" ? "Invitación no disponible" : state === "invalid" ? "Invitación no encontrada" : "Aceptar invitación";
  const message = state === "expired" ? "Esta invitación ya no está disponible. Solicita al administrador de la clínica que envíe una nueva invitación." : state === "accepted" ? "Esta invitación ya fue utilizada." : state === "unavailable" ? "Esta invitación fue cancelada o la clínica ya no está disponible." : state === "invalid" ? "El enlace de invitación no es válido. Solicita un nuevo enlace al administrador." : wrongAccount ? `Esta invitación fue enviada a ${invite?.invitation?.email}. Actualmente has iniciado sesión como ${invite?.sessionEmail}.` : invite?.sessionEmail ? "Tu sesión coincide con el correo invitado. Puedes continuar." : `Para continuar, inicia sesión con el correo electrónico al que fue enviada esta invitación: ${invite?.invitation?.email}.`;

  return <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center py-10"><Card className="w-full border-border/80 p-7 shadow-sm sm:p-9"><div className="mb-7 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><PawPrint className="h-6 w-6" /></div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Karey Vet</p><h1 className="app-heading mt-3 text-4xl text-foreground">{title}</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">{message}</p>{invite?.invitation && state === "pending" && !wrongAccount ? <div className="mt-6 space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm"><p className="font-semibold text-foreground">Invitación para unirte a {invite.invitation.clinicName}</p><p className="text-muted-foreground">Rol: <span className="font-medium text-foreground">{invite.invitation.roleName}</span></p><p className="text-muted-foreground">Cuenta: <span className="font-medium text-foreground">{invite.invitation.email}</span></p><p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Expira {new Date(invite.invitation.expiresAt).toLocaleString("es-DO")}</p></div> : null}{error ? <div className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}<div className="mt-7 flex flex-col gap-3">{!invite?.sessionEmail && state === "pending" ? <Button asChild><Link href={callbackUrl}>Iniciar sesión</Link></Button> : null}{wrongAccount && state === "pending" ? <Button onClick={() => void switchAccount()} disabled={switching}>{switching ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}{switching ? "Cerrando sesión..." : "Cambiar de cuenta"}</Button> : null}{invite?.sessionEmail && !wrongAccount && state === "pending" ? <Button onClick={() => void acceptInvitation()} disabled={accepting}>{accepting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{accepting ? "Aceptando..." : "Aceptar invitación"}</Button> : null}{state === "accepted" ? <Button asChild><Link href="/dashboard">Ir a Karey Vet</Link></Button> : null}{state !== "pending" || wrongAccount ? <Button variant="outline" asChild><Link href={wrongAccount ? callbackUrl : "/login"}>{wrongAccount ? "Volver al inicio de sesión" : "Ir al inicio de sesión"}</Link></Button> : null}</div></Card></main>;
}
