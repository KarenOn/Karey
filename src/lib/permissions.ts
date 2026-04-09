export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "invite"
  | "manage";

export type PermissionKey = `${string}.${PermissionAction}`;
export type PermissionMap = Record<string, string[]>;

export type ClinicAccess = {
  modules: {
    dashboard: boolean;
    clients: boolean;
    pets: boolean;
    todayTurns: boolean;
    appointments: boolean;
    inventory: boolean;
    invoices: boolean;
    services: boolean;
    employees: boolean;
    clinicProfile: boolean;
  };
  actions: {
    clinic: { read: boolean; update: boolean };
    employees: {
      read: boolean;
      invite: boolean;
      update: boolean;
      delete: boolean;
      manageRoles: boolean;
    };
    roles: { read: boolean; manage: boolean };
    appointments: { read: boolean; create: boolean; update: boolean; delete: boolean };
    clients: { read: boolean; create: boolean; update: boolean; delete: boolean };
    pets: { read: boolean; create: boolean; update: boolean; delete: boolean };
    todayTurns: { read: boolean; create: boolean; update: boolean; delete: boolean };
    services: { read: boolean; create: boolean; update: boolean; delete: boolean };
    inventory: { read: boolean; create: boolean; update: boolean; delete: boolean };
    invoices: { read: boolean; create: boolean; update: boolean; delete: boolean };
  };
};

const ELEVATED_CLINIC_ROLE_KEYS = new Set(["owner", "admin"]);
const GLOBAL_ADMIN_ROLE_KEYS = new Set(["superadmin"]);

export function isElevatedClinicRole(roleKey?: string | null) {
  return !!roleKey && ELEVATED_CLINIC_ROLE_KEYS.has(roleKey);
}

export function isGlobalAdminRole(roleKey?: string | null) {
  return !!roleKey && GLOBAL_ADMIN_ROLE_KEYS.has(roleKey);
}

export function normalizePermissions(perms: unknown): PermissionMap {
  if (!perms || typeof perms !== "object" || Array.isArray(perms)) {
    return {};
  }

  return Object.entries(perms as Record<string, unknown>).reduce<PermissionMap>(
    (acc, [module, actions]) => {
      if (Array.isArray(actions)) {
        acc[module] = actions.filter((action): action is string => typeof action === "string");
      }
      return acc;
    },
    {}
  );
}

export function hasPermission(perms: unknown, key: string) {
  const obj = normalizePermissions(perms);

  if (obj["*"]?.includes("*")) return true;

  const [module, action] = key.split(".");
  const actions = obj[module] ?? [];
  return actions.includes(action) || actions.includes("*");
}

export function hasAnyPermission(perms: unknown, keys: string[]) {
  return keys.some((key) => hasPermission(perms, key));
}

export function buildClinicAccess(roleKey?: string | null, perms?: unknown): ClinicAccess {
  const elevated = isElevatedClinicRole(roleKey);
  const allow = (key: string, fallbacks: string[] = []) =>
    elevated || hasAnyPermission(perms, [key, ...fallbacks]);

  const clinicRead = allow("clinic.read");
  const clinicUpdate = allow("clinic.update");

  const employeesRead = allow("employees.read");
  const employeesInvite = allow("employees.invite");
  const employeesUpdate = allow("employees.update");
  const employeesDelete = allow("employees.delete");
  const rolesRead = allow("roles.read");
  const rolesManage = allow("roles.manage");

  const clientsRead = allow("clients.read");
  const clientsCreate = allow("clients.create");
  const clientsUpdate = allow("clients.update");
  const clientsDelete = allow("clients.delete");

  const petsRead = allow("pets.read", ["clients.read"]);
  const petsCreate = allow("pets.create", ["clients.create"]);
  const petsUpdate = allow("pets.update", ["clients.update"]);
  const petsDelete = allow("pets.delete", ["clients.delete"]);

  const todayTurnsRead = allow("todayTurn.read", ["appointments.read"]);
  const todayTurnsCreate = allow("todayTurn.create", ["appointments.create"]);
  const todayTurnsUpdate = allow("todayTurn.update", ["appointments.update"]);
  const todayTurnsDelete = allow("todayTurn.delete", ["appointments.delete"]);

  const appointmentsRead = allow("appointments.read");
  const appointmentsCreate = allow("appointments.create");
  const appointmentsUpdate = allow("appointments.update");
  const appointmentsDelete = allow("appointments.delete");

  const inventoryRead = allow("inventory.read");
  const inventoryCreate = allow("inventory.create");
  const inventoryUpdate = allow("inventory.update");
  const inventoryDelete = allow("inventory.delete");

  const invoicesRead = allow("invoices.read");
  const invoicesCreate = allow("invoices.create");
  const invoicesUpdate = allow("invoices.update");
  const invoicesDelete = allow("invoices.delete");

  const servicesRead = allow("services.read");
  const servicesCreate = allow("services.create");
  const servicesUpdate = allow("services.update");
  const servicesDelete = allow("services.delete");

  const modules = {
    dashboard: true,
    clients: clientsRead || clientsCreate || clientsUpdate || clientsDelete,
    pets: petsRead || petsCreate || petsUpdate || petsDelete,
    todayTurns: todayTurnsRead || todayTurnsCreate || todayTurnsUpdate || todayTurnsDelete,
    appointments:
      appointmentsRead || appointmentsCreate || appointmentsUpdate || appointmentsDelete,
    inventory: inventoryRead || inventoryCreate || inventoryUpdate || inventoryDelete,
    invoices: invoicesRead || invoicesCreate || invoicesUpdate || invoicesDelete,
    services: servicesRead || servicesCreate || servicesUpdate || servicesDelete,
    employees:
      employeesRead ||
      employeesInvite ||
      employeesUpdate ||
      employeesDelete ||
      rolesRead ||
      rolesManage,
    clinicProfile: clinicRead || clinicUpdate,
  };

  return {
    modules,
    actions: {
      clinic: { read: clinicRead, update: clinicUpdate },
      employees: {
        read: employeesRead,
        invite: employeesInvite,
        update: employeesUpdate,
        delete: employeesDelete,
        manageRoles: rolesManage,
      },
      roles: { read: rolesRead, manage: rolesManage },
      appointments: {
        read: appointmentsRead,
        create: appointmentsCreate,
        update: appointmentsUpdate,
        delete: appointmentsDelete,
      },
      clients: {
        read: clientsRead,
        create: clientsCreate,
        update: clientsUpdate,
        delete: clientsDelete,
      },
      pets: {
        read: petsRead,
        create: petsCreate,
        update: petsUpdate,
        delete: petsDelete,
      },
      todayTurns: {
        read: todayTurnsRead,
        create: todayTurnsCreate,
        update: todayTurnsUpdate,
        delete: todayTurnsDelete,
      },
      services: {
        read: servicesRead,
        create: servicesCreate,
        update: servicesUpdate,
        delete: servicesDelete,
      },
      inventory: {
        read: inventoryRead,
        create: inventoryCreate,
        update: inventoryUpdate,
        delete: inventoryDelete,
      },
      invoices: {
        read: invoicesRead,
        create: invoicesCreate,
        update: invoicesUpdate,
        delete: invoicesDelete,
      },
    },
  };
}
