import { headers } from "next/headers";
import { auth, getClinicIdOrFail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, isElevatedClinicRole, type PermissionKey } from "@/lib/permissions";

export async function getSessionOrThrow() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireClinicPermission(permission: PermissionKey) {
  const session = await getSessionOrThrow();
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) throw new Error("NO_CLINIC");

  // si el user es admin global (better-auth), le damos pase
  if (session.user.role === "admin") {
    return { session, clinicId };
  }

  console.log("requireClinicPermission clinicId", clinicId);
  console.log("requireClinicPermission session", session);
  const member = await prisma.clinicMember.findFirst({
    where: { clinicId, userId: session.user.id },
    include: { role: true },
  });

  console.log("member requireClinicPermission", member);

  if (!member || !member.isActive) throw new Error("FORBIDDEN");

  if (isElevatedClinicRole(member.role.key)) {
    return { session, clinicId, member };
  }

  const ok = hasPermission(member.role.permissions, permission);
  if (!ok) throw new Error("FORBIDDEN");

  return { session, clinicId, member };
}
