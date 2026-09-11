"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type SignOutButtonProps = {
  className?: string;
  label?: string;
  redirectTo?: string;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
};

export default function SignOutButton({
  className,
  label = "Cerrar sesión",
  redirectTo = "/login",
  variant = "outline",
}: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);

    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      router.push(redirectTo);
    } catch {
      setLoading(false);
      toast.error("No se pudo cerrar la sesión. Inténtalo nuevamente.");
    }
  };

  return (
    <>
      <Button className={className} disabled={loading} onClick={handleSignOut} variant={variant}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        {label}
      </Button>
      {loading ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-lg"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-lg font-semibold text-foreground">Cerrando sesión...</p><p className="mt-2 text-sm text-muted-foreground">Espera un momento mientras cerramos tu sesión de forma segura.</p></div></div> : null}
    </>
  );
}
