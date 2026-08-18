import crypto from "crypto";
import { hashPassword } from "better-auth/crypto";
import { Prisma, SubscriptionStatus, Weekday } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveStoredFileUrl } from "@/lib/storage";
import type {
  AdminClinicContact,
  AdminClinicRecord,
  AdminClinicSubscriptionStatus,
} from "@/types/admin-clinics";

type CreateAdminClinicInput = {
  clinicName: string;
  clinicEmail?: string | null;
  clinicPhone?: string | null;
  plan?: string | null;
  isActive?: boolean;
  subscriptionStatus?: AdminClinicSubscriptionStatus;
  subscriptionEndDate?: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  ownerPassword?: string | null;
};

type CreateClinicWithOwnerInput = CreateAdminClinicInput & {
  emailVerified?: boolean;
};

export type CreateAdminClinicResult = {
  clinic: AdminClinicRecord;
  ownerAccess: {
    email: string;
    password: string;
  };
};

const DEFAULT_CLINIC_ROLES = [
  {
    key: "owner",
    name: "Owner",
    description: "Acceso total a la clinica",
    permissions: {
      clinic: ["read", "update"],
      employees: ["read", "invite", "update", "delete"],
      roles: ["read", "manage"],
      appointments: ["read", "create", "update", "delete"],
      invoices: ["read", "create", "update", "delete"],
      inventory: ["read", "create", "update", "delete"],
      clients: ["read", "create", "update", "delete"],
      pets: ["read", "create", "update", "delete"],
      services: ["read", "create", "update", "delete"],
      today: ["read", "create", "update", "delete"],
      todayTurn: ["read", "create", "update", "delete"],
      reports: ["read"],
    },
  },
  {
    key: "admin",
    name: "Administrator",
    description: "Administra la operacion de la clinica",
    permissions: {
      clinic: ["read"],
      employees: ["read", "invite", "update"],
      roles: ["read", "manage"],
      appointments: ["read", "create", "update"],
      invoices: ["read", "create", "update"],
      inventory: ["read", "create", "update"],
      clients: ["read", "create", "update"],
      pets: ["read", "create", "update"],
      services: ["read", "create", "update"],
      today: ["read", "create", "update"],
      todayTurn: ["read", "create", "update"],
      reports: ["read"],
    },
  },
  {
    key: "vet",
    name: "Veterinarian",
    description: "Gestiona citas y visitas clinicas",
    permissions: {
      appointments: ["read", "update"],
      visits: ["read", "create", "update"],
      clients: ["read"],
      pets: ["read"],
      inventory: ["read"],
      invoices: ["read"],
      services: ["read"],
      today: ["read", "update"],
      todayTurn: ["read", "update"],
    },
  },
  {
    key: "reception",
    name: "Reception",
    description: "Agenda y atencion al cliente",
    permissions: {
      appointments: ["read", "create", "update"],
      clients: ["read", "create", "update"],
      pets: ["read", "create", "update"],
      today: ["read", "create", "update"],
      todayTurn: ["read", "create", "update"],
      invoices: ["read", "create"],
      services: ["read"],
    },
  },
] as const;

const DEFAULT_CLINIC_SCHEDULE: Array<{
  day: Weekday;
  open: string | null;
  close: string | null;
  closed: boolean;
}> = [
  { day: Weekday.monday, open: "08:00", close: "18:00", closed: false },
  { day: Weekday.tuesday, open: "08:00", close: "18:00", closed: false },
  { day: Weekday.wednesday, open: "08:00", close: "18:00", closed: false },
  { day: Weekday.thursday, open: "08:00", close: "18:00", closed: false },
  { day: Weekday.friday, open: "08:00", close: "18:00", closed: false },
  { day: Weekday.saturday, open: "09:00", close: "13:00", closed: false },
  { day: Weekday.sunday, open: null, close: null, closed: true },
];

function toClientSubscriptionStatus(status: SubscriptionStatus): AdminClinicSubscriptionStatus {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "INACTIVE":
      return "inactive";
    case "PAST_DUE":
      return "past_due";
  }
}

export function toPrismaSubscriptionStatus(status: AdminClinicSubscriptionStatus) {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "inactive":
      return SubscriptionStatus.INACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
  }
}

function toNullishString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toDateOnly(value?: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function createRandomPassword() {
  return `${crypto.randomBytes(6).toString("hex")}Aa1!`;
}

export function buildInitialClinicName(ownerName: string) {
  const trimmed = ownerName.trim();
  const firstName = trimmed.split(/\s+/).find(Boolean);

  if (!firstName) {
    return "Mi clínica";
  }

  return `Clínica de ${firstName}`;
}

function pickResponsible(
  members: Array<{
    user: { name: string | null; email: string; profile: { phone: string | null } | null };
    role: { key: string; name: string };
  }>
): AdminClinicContact | null {
  const ranked = [...members].sort((left, right) => {
    const score = (roleKey: string) => {
      if (roleKey === "owner") return 0;
      if (roleKey === "admin") return 1;
      return 2;
    };

    const roleDiff = score(left.role.key) - score(right.role.key);
    if (roleDiff !== 0) return roleDiff;

    return (left.user.name ?? left.user.email).localeCompare(right.user.name ?? right.user.email, "es");
  });

  const primary = ranked[0];
  if (!primary) {
    return null;
  }

  return {
    name: primary.user.name,
    email: primary.user.email,
    phone: primary.user.profile?.phone ?? null,
  };
}

const clinicAdminSelect = {
  id: true,
  name: true,
  logoUrl: true,
  email: true,
  phone: true,
  mobile: true,
  address: true,
  plan: true,
  isActive: true,
  subscriptionStatus: true,
  subscriptionEndDate: true,
  createdAt: true,
  members: {
    where: { isActive: true },
    select: {
      user: {
        select: {
          name: true,
          email: true,
          profile: { select: { phone: true } },
        },
      },
      role: { select: { key: true, name: true } },
    },
  },
} as const;

async function serializeClinic(clinic: {
  id: number;
  name: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  plan: string | null;
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: Date | null;
  createdAt: Date;
  members: Array<{
    user: { name: string | null; email: string; profile: { phone: string | null } | null };
    role: { key: string; name: string };
  }>;
}): Promise<AdminClinicRecord> {
  return {
    id: clinic.id,
    name: clinic.name,
    logoUrl: await resolveStoredFileUrl(clinic.logoUrl, {
      fileName: `logo-clinica-${clinic.id}.png`,
    }),
    email: clinic.email,
    phone: clinic.phone ?? clinic.mobile ?? null,
    address: clinic.address,
    plan: clinic.plan ?? null,
    isActive: clinic.isActive,
    subscriptionStatus: toClientSubscriptionStatus(clinic.subscriptionStatus),
    subscriptionEndDate: clinic.subscriptionEndDate?.toISOString().slice(0, 10) ?? null,
    createdAt: clinic.createdAt.toISOString(),
    responsible: pickResponsible(clinic.members),
  };
}

export async function listAdminClinics() {
  const clinics = await prisma.clinic.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: clinicAdminSelect,
  });

  return Promise.all(clinics.map((clinic) => serializeClinic(clinic)));
}

export async function getAdminClinicById(id: number) {
  const clinic = await prisma.clinic.findUnique({
    where: { id },
    select: clinicAdminSelect,
  });

  return clinic ? serializeClinic(clinic) : null;
}

export async function createAdminClinic(
  input: CreateAdminClinicInput
): Promise<CreateAdminClinicResult> {
  return createClinicWithOwner({
    ...input,
    emailVerified: true,
  });
}

export async function createClinicWithOwner(
  input: CreateClinicWithOwnerInput
): Promise<CreateAdminClinicResult> {
  const clinicName = input.clinicName.trim();
  const ownerName = input.ownerName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const emailVerified = input.emailVerified ?? true;

  const isActive = input.isActive ?? true;
  let subscriptionStatus = input.subscriptionStatus
    ? toPrismaSubscriptionStatus(input.subscriptionStatus)
    : SubscriptionStatus.ACTIVE;

  if (!isActive) {
    subscriptionStatus = SubscriptionStatus.INACTIVE;
  } else if (subscriptionStatus === SubscriptionStatus.INACTIVE) {
    subscriptionStatus = SubscriptionStatus.ACTIVE;
  }

  const ownerPassword = toNullishString(input.ownerPassword) ?? createRandomPassword();

  const created = await prisma.$transaction(async (tx) => {
    const existingOwner = await tx.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true },
    });

    if (existingOwner) {
      throw new Error("OWNER_EMAIL_ALREADY_EXISTS");
    }

    const clinic = await tx.clinic.create({
      data: {
        name: clinicName,
        email: toNullishString(input.clinicEmail),
        phone: toNullishString(input.clinicPhone),
        owner: ownerName,
        plan: toNullishString(input.plan),
        isActive,
        subscriptionStatus,
        subscriptionEndDate: toDateOnly(input.subscriptionEndDate),
      },
      select: { id: true },
    });

    const roleIds = new Map<string, number>();
    for (const role of DEFAULT_CLINIC_ROLES) {
      const createdRole = await tx.role.create({
        data: {
          clinicId: clinic.id,
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: role.permissions as Prisma.InputJsonValue,
          isActive: true,
          isSystem: true,
        },
        select: { id: true, key: true },
      });

      roleIds.set(createdRole.key, createdRole.id);
    }

    for (const schedule of DEFAULT_CLINIC_SCHEDULE) {
      await tx.clinicSchedule.create({
        data: {
          clinicId: clinic.id,
          day: schedule.day,
          open: schedule.closed ? null : schedule.open,
          close: schedule.closed ? null : schedule.close,
          closed: schedule.closed,
        },
      });
    }

    const userId = crypto.randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(ownerPassword);

    await tx.user.create({
      data: {
        id: userId,
        name: ownerName,
        email: ownerEmail,
        emailVerified,
        role: "owner",
      },
    });

    await tx.account.create({
      data: {
        id: crypto.randomBytes(16).toString("hex"),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      },
    });

    if (toNullishString(input.ownerPhone)) {
      await tx.userProfile.create({
        data: {
          userId,
          phone: toNullishString(input.ownerPhone),
        },
      });
    }

    const ownerRoleId = roleIds.get("owner");
    if (!ownerRoleId) {
      throw new Error("OWNER_ROLE_NOT_CREATED");
    }

    await tx.clinicMember.create({
      data: {
        clinicId: clinic.id,
        userId,
        roleId: ownerRoleId,
        isActive: true,
      },
    });

    return { clinicId: clinic.id };
  });

  const clinic = await getAdminClinicById(created.clinicId);
  if (!clinic) {
    throw new Error("CLINIC_CREATE_FAILED");
  }

  return {
    clinic,
    ownerAccess: {
      email: ownerEmail,
      password: ownerPassword,
    },
  };
}
