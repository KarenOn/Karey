"use client";

import { createContext, useContext } from "react";
import type { CurrentUserProfile } from "@/lib/current-user-profile";

const CurrentUserContext = createContext<CurrentUserProfile | null>(null);

export function CurrentUserProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CurrentUserProfile | null;
}) {
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUserProfile() {
  return useContext(CurrentUserContext);
}

export function useCurrentUserAccess() {
  return useCurrentUserProfile()?.access ?? null;
}
