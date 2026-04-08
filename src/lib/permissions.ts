export type PermissionKey =
  | "clinic.update"
  | "employees.read"
  | "employees.invite"
  | "employees.update"
  | "roles.read"
  | "roles.manage";

type PermissionsJson = Record<string, string[]>; // { employees:["read","invite"], roles:["manage"] }

const ELEVATED_CLINIC_ROLE_KEYS = new Set(["owner", "admin"]);

export function isElevatedClinicRole(roleKey?: string | null) {
  return !!roleKey && ELEVATED_CLINIC_ROLE_KEYS.has(roleKey);
}

export function hasPermission(perms: unknown, key: string) {
  if (!perms || typeof perms !== "object") return false;

  const obj = perms as PermissionsJson;

  // full access: { "*": ["*"] }
  if (obj["*"]?.includes("*")) return true;

  const [module, action] = key.split(".");
  const actions = obj[module] ?? [];
  return actions.includes(action) || actions.includes("*");
}
