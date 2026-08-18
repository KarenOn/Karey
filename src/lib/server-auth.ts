import { headers } from "next/headers";
import { auth, getActiveClinicMembershipForUser } from "@/lib/auth";
import { activatePendingEmployeeInviteForUser } from "@/lib/employee-invites";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  isElevatedClinicRole,
  isGlobalAdminRole,
  type PermissionKey,
} from "@/lib/permissions";

export async function getSessionOrThrow() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getSessionUserRole(userId: string, fallbackRole?: string | null) {
  if (fallbackRole) {
    return fallbackRole;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role ?? null;
}

export async function isSessionUserGlobalAdmin(userId: string, fallbackRole?: string | null) {
  const role = await getSessionUserRole(userId, fallbackRole);
  return isGlobalAdminRole(role);
}

export async function requireClinicPermission(permission: PermissionKey) {
  const session = await getSessionOrThrow();
  let member = await getActiveClinicMembershipForUser(session.user.id);

  if (!member && session.user.email) {
    await activatePendingEmployeeInviteForUser(session.user.id, session.user.email);
    member = await getActiveClinicMembershipForUser(session.user.id);
  }

  if (!member) {
    throw new Error("FORBIDDEN");
  }

  if (!member.clinic.isActive) {
    throw new Error("CLINIC_INACTIVE");
  }

  if (isElevatedClinicRole(member.role.key)) {
    return { session, clinicId: member.clinicId, member };
  }

  const ok = hasPermission(member.role.permissions, permission);
  if (!ok) throw new Error("FORBIDDEN");

  return { session, clinicId: member.clinicId, member };
}

export async function requireSuperAdmin() {
  const session = await getSessionOrThrow();

  const isGlobalAdmin = await isSessionUserGlobalAdmin(session.user.id, session.user.role);

  if (!isGlobalAdmin) {
    throw new Error("FORBIDDEN");
  }

  return { session };
}
