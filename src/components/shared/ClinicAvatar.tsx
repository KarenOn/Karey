"use client";

import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ClinicAvatarProps = {
  name?: string | null;
  logoUrl?: string | null;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
};

export default function ClinicAvatar({
  name,
  logoUrl,
  className,
  imageClassName,
  iconClassName,
}: ClinicAvatarProps) {
  return (
    <div
      className={cn(
        "app-stat-icon relative inline-flex overflow-hidden bg-[linear-gradient(135deg,rgba(13,148,136,0.12),rgba(245,158,11,0.12))]",
        className
      )}
      aria-label={name ? `Logo de ${name}` : "Logo de clinica"}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name ? `Logo de ${name}` : "Logo de clinica"}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : (
        <Building2 className={cn("size-4", iconClassName)} />
      )}
    </div>
  );
}
