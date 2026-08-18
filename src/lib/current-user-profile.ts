import { headers } from "next/headers";
import { auth, getActiveClinicMembershipForUser } from "@/lib/auth";
import { activatePendingEmployeeInviteForUser } from "@/lib/employee-invites";
import { prisma } from "@/lib/prisma";
import {
  buildClinicAccess,
  isGlobalAdminRole,
  type ClinicAccess,
} from "@/lib/permissions";
import type { SubscriptionStatus } from "@/generated/prisma/client";
import {
  deleteStoredFile,
  isS3StorageRef,
  resolveStoredFileUrl,
} from "@/lib/storage";
import type { UserProfileUpdateInput } from "@/lib/validators/profile";

type UserProfileRow = Awaited<ReturnType<typeof loadCurrentUserProfileRow>>;

export type CurrentUserProfile = {
  userId: string;
  emailVerified: boolean;
  clinicId: number | null;
  clinicName: string | null;
  clinicLogoUrl: string | null;
  clinicIsActive: boolean | null;
  clinicSetupRequired: boolean;
  subscriptionStatus: "active" | "inactive" | "past_due" | null;
  subscriptionEndDate: string | null;
  plan: string | null;
  isGlobalAdmin: boolean;
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarStorageRef: string | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  roleKey: string | null;
  roleLabel: string | null;
  access: ClinicAccess;
};

function toNullishString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toClientSubscriptionStatus(status?: SubscriptionStatus | null) {
  if (!status) return null;

  switch (status) {
    case "ACTIVE":
      return "active";
    case "INACTIVE":
      return "inactive";
    case "PAST_DUE":
      return "past_due";
  }
}

function isClinicSetupRequired(clinic?: {
  name?: string | null;
  owner?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
} | null) {
  if (!clinic) {
    return false;
  }

  const hasName = !!clinic.name?.trim();
  const hasOwner = !!clinic.owner?.trim();
  const hasContact = !!clinic.email?.trim() || !!clinic.phone?.trim() || !!clinic.mobile?.trim();

  return !hasName || !hasOwner || !hasContact;
}

async function getSessionUserOrThrow() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session.user.email) {
    throw new Error("UNAUTHORIZED");
  }

  return session.user;
}

async function loadCurrentUserProfileRow() {
  const sessionUser = await getSessionUserOrThrow();
  let membership = await getActiveClinicMembershipForUser(sessionUser.id);

  if (!membership) {
    await activatePendingEmployeeInviteForUser(sessionUser.id, sessionUser.email);
    membership = await getActiveClinicMembershipForUser(sessionUser.id);
  }

  const clinicId = membership?.clinicId ?? null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    clinicId,
    membership,
    user,
  };
}

async function syncStoredUserRole(row: UserProfileRow) {
  if (isGlobalAdminRole(row.user.role)) {
    return row.user.role;
  }

  const membershipRoleKey = row.membership?.role.key ?? null;

  if (row.user.role === membershipRoleKey) {
    return membershipRoleKey;
  }

  await prisma.user.update({
    where: { id: row.user.id },
    data: { role: membershipRoleKey },
  });

  return membershipRoleKey;
}

export async function readCurrentUserProfile(): Promise<CurrentUserProfile> {
  const row = await loadCurrentUserProfileRow();
  const roleKey = await syncStoredUserRole(row);
  const roleLabel = row.membership?.role.name ?? row.user.role ?? "Usuario";
  const access = buildClinicAccess(roleKey, row.membership?.role.permissions);

  return {
    userId: row.user.id,
    emailVerified: row.user.emailVerified,
    clinicId: row.clinicId,
    clinicName: row.membership?.clinic.name ?? null,
    clinicLogoUrl: await resolveStoredFileUrl(row.membership?.clinic.logoUrl, {
      fileName: row.membership?.clinicId
        ? `logo-clinica-${row.membership.clinicId}.png`
        : "logo-clinica.png",
    }),
    clinicIsActive: row.membership?.clinic.isActive ?? null,
    clinicSetupRequired: isClinicSetupRequired(row.membership?.clinic),
    subscriptionStatus: toClientSubscriptionStatus(row.membership?.clinic.subscriptionStatus),
    subscriptionEndDate: row.membership?.clinic.subscriptionEndDate?.toISOString().slice(0, 10) ?? null,
    plan: row.membership?.clinic.plan ?? null,
    isGlobalAdmin: isGlobalAdminRole(roleKey),
    name: row.user.name,
    email: row.user.email,
    avatarStorageRef: row.user.image ?? null,
    avatarUrl: await resolveStoredFileUrl(row.user.image, {
      fileName: `perfil-${row.user.name || "usuario"}.png`,
    }),
    phone: row.user.profile?.phone ?? null,
    jobTitle: row.user.profile?.jobTitle ?? null,
    bio: row.user.profile?.bio ?? null,
    roleKey,
    roleLabel,
    access,
  };
}

export async function updateCurrentUserProfile(data: UserProfileUpdateInput) {
  const row = await loadCurrentUserProfileRow();
  const previousAvatarRef = row.user.image ?? null;
  const nextAvatarRef = toNullishString(data.avatarStorageRef);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.user.id },
      data: {
        name: data.name.trim(),
        image: nextAvatarRef,
      },
    });

    await tx.userProfile.upsert({
      where: { userId: row.user.id },
      update: {
        phone: toNullishString(data.phone),
        jobTitle: toNullishString(data.jobTitle),
        bio: toNullishString(data.bio),
      },
      create: {
        userId: row.user.id,
        phone: toNullishString(data.phone),
        jobTitle: toNullishString(data.jobTitle),
        bio: toNullishString(data.bio),
      },
    });
  });

  if (
    previousAvatarRef &&
    previousAvatarRef !== nextAvatarRef &&
    isS3StorageRef(previousAvatarRef)
  ) {
    await deleteStoredFile(previousAvatarRef).catch(() => undefined);
  }

  return readCurrentUserProfile();
}

export async function syncUserRoleFromMembership(userId: string, clinicId: number) {
  const membership = await prisma.clinicMember.findFirst({
    where: { userId, clinicId, isActive: true },
    include: {
      role: {
        select: { key: true },
      },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: membership?.role.key ?? null,
    },
  });
}
