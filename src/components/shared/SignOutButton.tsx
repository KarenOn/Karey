"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
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

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push(redirectTo);
          router.refresh();
        },
        onError: () => {
          setLoading(false);
        },
      },
    });
  };

  return (
    <Button className={className} disabled={loading} onClick={handleSignOut} variant={variant}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {label}
    </Button>
  );
}
