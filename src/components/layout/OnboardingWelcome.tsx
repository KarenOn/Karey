"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CurrentUserProfile } from "@/lib/current-user-profile";

export default function OnboardingWelcome({ user }: { user: CurrentUserProfile }) {
  const [open, setOpen] = useState(Boolean(user.onboardingCompletedAt && !user.welcomeSeenAt));
  async function close() {
    if (!open) return;
    await fetch("/api/profile/welcome", { method: "POST" }).catch(() => undefined);
    setOpen(false);
  }
  if (!open) return null;
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) void close(); }}><DialogContent><DialogHeader><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><CheckCircle2 className="h-6 w-6" /></div><DialogTitle className="pt-3 text-center">¡Bienvenido a Karey Vet, {user.name}!</DialogTitle></DialogHeader><p className="text-center text-sm text-muted-foreground">Tu cuenta ya está lista. Ya puedes comenzar a trabajar con tu clínica.</p><DialogFooter><Button className="w-full" onClick={() => void close()}>Comenzar</Button></DialogFooter></DialogContent></Dialog>;
}