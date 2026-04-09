import { headers } from "next/headers";
import { auth, getActiveClinicMembershipForUser } from "@/lib/auth";
import { activatePendingEmployeeInviteForUser } from "@/lib/employee-invites";
import {
  hasPermission,
  isElevatedClinicRole,
  type PermissionKey,
} from "@/lib/permissions";

export async function getSessionOrThrow() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session;
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

  if (isElevatedClinicRole(member.role.key)) {
    return { session, clinicId: member.clinicId, member };
  }

  const ok = hasPermission(member.role.permissions, permission);
  if (!ok) throw new Error("FORBIDDEN");

  return { session, clinicId: member.clinicId, member };
}
