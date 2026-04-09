import { headers } from "next/headers";
import { auth, getClinicIdOrFail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteStoredFile,
  isS3StorageRef,
  resolveStoredFileUrl,
} from "@/lib/storage";
import type { UserProfileUpdateInput } from "@/lib/validators/profile";

type UserProfileRow = Awaited<ReturnType<typeof loadCurrentUserProfileRow>>;

export type CurrentUserProfile = {
  userId: string;
  clinicId: number | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarStorageRef: string | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  roleKey: string | null;
  roleLabel: string | null;
};

function toNullishString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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

  let clinicId: number | null = null;
  try {
    clinicId = await getClinicIdOrFail();
  } catch {
    clinicId = null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profile: true,
      memberships: clinicId
        ? {
            where: { clinicId, isActive: true },
            take: 1,
            include: { role: { select: { key: true, name: true } } },
          }
        : {
            where: { isActive: true },
            take: 1,
            include: { role: { select: { key: true, name: true } } },
          },
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    clinicId,
    membership: user.memberships[0] ?? null,
    user,
  };
}

async function syncStoredUserRole(row: UserProfileRow) {
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

  return {
    userId: row.user.id,
    clinicId: row.clinicId,
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
