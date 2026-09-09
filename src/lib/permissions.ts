export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "invite"
  | "manage";

export type PermissionCatalogGroup = {
  module: string;
  label: string;
  actions: readonly string[];
};

/** Catálogo único usado por la pantalla de roles y por la documentación del ACL. */
export const PERMISSION_CATALOG: readonly PermissionCatalogGroup[] = [
  { module: "dashboard", label: "Resumen", actions: ["read"] },
  { module: "clinic", label: "Clínica", actions: ["read", "update"] },
  { module: "employees", label: "Empleados", actions: ["read", "invite", "create", "changeRole", "activate", "deactivate", "resendInvite"] },
  { module: "roles", label: "Roles y permisos", actions: ["read", "manage", "create", "update", "delete"] },
  { module: "appointments", label: "Citas", actions: ["read", "create", "update", "edit", "attend", "cancel", "reschedule", "delete", "receiveUnassignedNowAlerts", "assign"] },
  { module: "clients", label: "Clientes", actions: ["read", "create", "update", "edit", "delete"] },
  { module: "pets", label: "Pacientes", actions: ["read", "create", "update", "edit", "delete", "viewClinicalHistory"] },
  { module: "today", label: "Hoy", actions: ["read", "manageWalkIns", "manageEncounter"] },
  { module: "todayTurn", label: "Turnos sin cita", actions: ["read", "create", "edit", "delete"] },
  { module: "encounters", label: "Atenciones", actions: ["manage", "addConsumptions"] },
  { module: "visits", label: "Visitas clínicas", actions: ["read", "create", "update", "edit", "attachDocuments"] },
  { module: "vaccines", label: "Vacunas", actions: ["read", "create", "update", "edit"] },
  { module: "services", label: "Servicios", actions: ["read", "create", "update", "edit", "delete"] },
  { module: "inventory", label: "Inventario", actions: ["read", "create", "update", "edit", "delete"] },
  { module: "inventoryMovements", label: "Movimientos de inventario", actions: ["read", "create"] },
  { module: "invoices", label: "Facturación", actions: ["read", "viewDrafts", "create", "update", "edit", "issue", "annul", "sendToBilling", "download", "print", "delete"] },
  { module: "payments", label: "Pagos", actions: ["read", "create", "register"] },
] as const;

export type PermissionKey = `${string}.${string}`;
export type PermissionMap = Record<string, string[]>;

export type ClinicAccess = {
  modules: {
    dashboard: boolean;
    clients: boolean;
    pets: boolean;
    today: boolean;
    todayTurns: boolean;
    appointments: boolean;
    inventory: boolean;
    invoices: boolean;
    services: boolean;
    employees: boolean;
    clinicProfile: boolean;
    visits: boolean;
    vaccines: boolean;
    inventoryMovements: boolean;
  };
  actions: {
    clinic: { read: boolean; update: boolean };
    employees: {
      read: boolean;
      invite: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
      changeRole: boolean;
      activate: boolean;
      deactivate: boolean;
      resendInvite: boolean;
      manageRoles: boolean;
    };
    roles: { read: boolean; manage: boolean };
    appointments: { read: boolean; create: boolean; update: boolean; edit: boolean; attend: boolean; cancel: boolean; reschedule: boolean; delete: boolean; receiveUnassignedNowAlerts: boolean; assign: boolean };
    clients: { read: boolean; create: boolean; update: boolean; edit: boolean; delete: boolean };
    pets: { read: boolean; create: boolean; update: boolean; edit: boolean; delete: boolean; viewClinicalHistory: boolean };
    today: { read: boolean; create: boolean; update: boolean; delete: boolean };
    todayTurns: { read: boolean; create: boolean; update: boolean; delete: boolean };
    services: { read: boolean; create: boolean; update: boolean; delete: boolean };
    inventory: { read: boolean; create: boolean; update: boolean; delete: boolean };
    encounters: { manage: boolean; addConsumptions: boolean };
    invoices: { read: boolean; create: boolean; update: boolean; edit: boolean; viewDrafts: boolean; issue: boolean; annul: boolean; sendToBilling: boolean; download: boolean; print: boolean; delete: boolean };
    payments: { read: boolean; register: boolean };
    visits: { read: boolean; create: boolean; update: boolean; edit: boolean; delete: boolean; attachDocuments: boolean };
    vaccines: { read: boolean; create: boolean; update: boolean; edit: boolean; delete: boolean };
    inventoryMovements: { read: boolean; create: boolean; update: boolean; delete: boolean };
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

  const [module, ...actionParts] = key.split(".");
  const action = actionParts.join(".");
  const actions = obj[module] ?? [];
  return actions.includes(action) || actions.includes("*");
}

export function hasAnyPermission(perms: unknown, keys: string[]) {
  return keys.some((key) => hasPermission(perms, key));
}

export function canActAsVeterinarian(roleKey?: string | null, perms?: unknown) {
  return (
    isElevatedClinicRole(roleKey) ||
    roleKey === "vet" ||
    hasAnyPermission(perms, ["visits.create", "visits.update"])
  );
}

export function buildClinicAccess(roleKey?: string | null, perms?: unknown): ClinicAccess {
  const elevated = isElevatedClinicRole(roleKey);
  const allow = (key: string, fallbacks: string[] = []) =>
    elevated || hasAnyPermission(perms, [key, ...fallbacks]);

  const dashboardRead = allow("dashboard.read", ["today.read"]);
  const clinicRead = allow("clinic.read");
  const clinicUpdate = allow("clinic.update");

  const employeesRead = allow("employees.read");
  const employeesInvite = allow("employees.invite");
  const employeesCreate = allow("employees.create", ["employees.invite"]);
  const employeesUpdate = allow("employees.update");
  const employeesDelete = allow("employees.delete");
  const employeesChangeRole = allow("employees.changeRole", ["employees.update"]);
  const employeesActivate = allow("employees.activate", ["employees.update"]);
  const employeesDeactivate = allow("employees.deactivate", ["employees.update"]);
  const employeesResendInvite = allow("employees.resendInvite", ["employees.invite"]);
  const rolesRead = allow("roles.read");
  const rolesManage = allow("roles.manage");

  const clientsRead = allow("clients.read");
  const clientsCreate = allow("clients.create");
  const clientsUpdate = allow("clients.update");
  const clientsEdit = allow("clients.edit", ["clients.update"]);
  const clientsDelete = allow("clients.delete");

  const petsRead = allow("pets.read", ["clients.read"]);
  const petsCreate = allow("pets.create", ["clients.create"]);
  const petsUpdate = allow("pets.update", ["clients.update"]);
  const petsEdit = allow("pets.edit", ["pets.update"]);
  const petsDelete = allow("pets.delete", ["clients.delete"]);
  const petsHistory = allow("pets.viewClinicalHistory", ["visits.read"]);

  const todayRead = allow("today.read", ["appointments.read"]);
  const todayCreate = allow("today.create", ["appointments.create"]);
  const todayUpdate = allow("today.update", ["appointments.update"]);
  const todayDelete = allow("today.delete", ["appointments.delete"]);

  const todayTurnsRead = allow("todayTurn.read", ["appointments.read"]);
  const todayTurnsCreate = allow("todayTurn.create", ["appointments.create"]);
  const todayTurnsUpdate = allow("todayTurn.update", ["appointments.update"]);
  const todayTurnsDelete = allow("todayTurn.delete", ["appointments.delete"]);

  const appointmentsRead = allow("appointments.read");
  const appointmentsCreate = allow("appointments.create");
  const appointmentsUpdate = allow("appointments.update");
  const appointmentsEdit = allow("appointments.edit", ["appointments.update"]);
  const appointmentsAttend = allow("appointments.attend", ["appointments.update"]);
  const appointmentsCancel = allow("appointments.cancel", ["appointments.update"]);
  const appointmentsReschedule = allow("appointments.reschedule", ["appointments.update"]);
  const appointmentsDelete = allow("appointments.delete");
  const appointmentsReceiveUnassignedNowAlerts = allow("appointments.receiveUnassignedNowAlerts");
  const appointmentsAssign = allow("appointments.assign");

  const inventoryRead = allow("inventory.read");
  const inventoryCreate = allow("inventory.create");
  const inventoryUpdate = allow("inventory.update");
  const inventoryDelete = allow("inventory.delete");

  const invoicesRead = allow("invoices.read");
  const invoicesCreate = allow("invoices.create");
  const invoicesUpdate = allow("invoices.update");
  const invoicesEdit = allow("invoices.edit", ["invoices.update"]);
  const invoicesViewDrafts = allow("invoices.viewDrafts", ["invoices.read"]);
  const invoicesIssue = allow("invoices.issue", ["invoices.update"]);
  const invoicesAnnul = allow("invoices.annul", ["invoices.update"]);
  const invoicesSendToBilling = allow("invoices.sendToBilling", ["invoices.create"]);
  const invoicesDownload = allow("invoices.download", ["invoices.read"]);
  const invoicesPrint = allow("invoices.print", ["invoices.read"]);
  const invoicesDelete = allow("invoices.delete");
  const paymentsRead = allow("payments.read", ["invoices.read"]);
  const paymentsRegister = allow("payments.register", ["payments.create"]);
  const encountersManage = allow("encounters.manage", ["visits.create", "visits.update"]);
  const encountersAddConsumptions = allow("encounters.addConsumptions", ["visits.create", "visits.update"]);

  const servicesRead = allow("services.read");
  const servicesCreate = allow("services.create");
  const servicesUpdate = allow("services.update");
  const servicesDelete = allow("services.delete");
  const visitsRead = allow("visits.read", ["pets.read"]);
  const visitsCreate = allow("visits.create");
  const visitsUpdate = allow("visits.update");
  const visitsEdit = allow("visits.edit", ["visits.update"]);
  const visitsAttachDocuments = allow("visits.attachDocuments", ["visits.update"]);
  const visitsDelete = allow("visits.delete");
  const vaccinesRead = allow("vaccines.read", ["pets.read"]);
  const vaccinesCreate = allow("vaccines.create", ["pets.update"]);
  const vaccinesUpdate = allow("vaccines.update", ["pets.update"]);
  const vaccinesDelete = allow("vaccines.delete", ["pets.update"]);
  const vaccinesEdit = allow("vaccines.edit", ["vaccines.update"]);
  const inventoryMovementsRead = allow("inventory.movements", ["inventory.read"]);
  const inventoryMovementsCreate = allow("inventory.movements.create", ["inventory.create"]);
  const inventoryMovementsUpdate = allow("inventory.movements.update", ["inventory.update"]);
  const inventoryMovementsDelete = allow("inventory.movements.delete", ["inventory.delete"]);

  // La visibilidad de un módulo representa su permiso de lectura, no cualquier
  // acción relacionada ni un fallback de otro módulo.
  const modules = {
    dashboard: dashboardRead,
    clients: clientsRead,
    pets: petsRead,
    today: todayRead,
    todayTurns: todayTurnsRead,
    appointments: appointmentsRead,
    inventory: inventoryRead,
    invoices: invoicesRead,
    services: servicesRead,
    employees: employeesRead,
    clinicProfile: clinicRead,
    visits: visitsRead,
    vaccines: vaccinesRead,
    inventoryMovements: inventoryMovementsRead,
  };

  return {
    modules,
    actions: {
      clinic: { read: clinicRead, update: clinicUpdate },
      employees: {
        read: employeesRead,
        invite: employeesInvite,
        create: employeesCreate,
        update: employeesUpdate,
        delete: employeesDelete,
        changeRole: employeesChangeRole,
        activate: employeesActivate,
        deactivate: employeesDeactivate,
        resendInvite: employeesResendInvite,
        manageRoles: rolesManage,
      },
      roles: { read: rolesRead, manage: rolesManage },
      appointments: {
        read: appointmentsRead,
        create: appointmentsCreate,
        update: appointmentsUpdate,
        edit: appointmentsEdit,
        attend: appointmentsAttend,
        cancel: appointmentsCancel,
        reschedule: appointmentsReschedule,
        delete: appointmentsDelete,
        receiveUnassignedNowAlerts: appointmentsReceiveUnassignedNowAlerts,
        assign: appointmentsAssign,
      },
      clients: {
        read: clientsRead,
        create: clientsCreate,
        update: clientsUpdate,
        edit: clientsEdit,
        delete: clientsDelete,
      },
      pets: {
        read: petsRead,
        create: petsCreate,
        update: petsUpdate,
        edit: petsEdit,
        delete: petsDelete,
        viewClinicalHistory: petsHistory,
      },
      today: {
        read: todayRead,
        create: todayCreate,
        update: todayUpdate,
        delete: todayDelete,
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
        edit: invoicesEdit,
        viewDrafts: invoicesViewDrafts,
        issue: invoicesIssue,
        annul: invoicesAnnul,
        sendToBilling: invoicesSendToBilling,
        download: invoicesDownload,
        print: invoicesPrint,
        delete: invoicesDelete,
      },
      encounters: { manage: encountersManage, addConsumptions: encountersAddConsumptions },
      payments: { read: paymentsRead, register: paymentsRegister },
      visits: { read: visitsRead, create: visitsCreate, update: visitsUpdate, edit: visitsEdit, delete: visitsDelete, attachDocuments: visitsAttachDocuments },
      vaccines: { read: vaccinesRead, create: vaccinesCreate, update: vaccinesUpdate, edit: vaccinesEdit, delete: vaccinesDelete },
      inventoryMovements: { read: inventoryMovementsRead, create: inventoryMovementsCreate, update: inventoryMovementsUpdate, delete: inventoryMovementsDelete },
    },
  };
}
