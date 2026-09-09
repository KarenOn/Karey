import type { ClinicAccess } from "@/lib/permissions";

type ModuleAccess = ClinicAccess["modules"];

const FIRST_ALLOWED_ROUTES: ReadonlyArray<readonly [keyof ModuleAccess, string]> = [
  ["dashboard", "/dashboard"],
  ["today", "/today"],
  ["appointments", "/appointments"],
  ["pets", "/pets"],
  ["clients", "/clients"],
  ["invoices", "/invoices"],
  ["inventory", "/inventory"],
  ["services", "/services"],
  ["employees", "/employees"],
  ["clinicProfile", "/clinic-profile"],
];

export function getFirstAllowedRoute(userPermissions: ModuleAccess): string | null {
  return FIRST_ALLOWED_ROUTES.find(([module]) => userPermissions[module])?.[1] ?? null;
}
