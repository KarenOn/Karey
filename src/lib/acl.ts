import { prisma } from "@/lib/prisma";
import { hasPermission, isElevatedClinicRole } from "@/lib/permissions";

export async function hasClinicPermission(userId: string, clinicId: number, perm: string) {
  const membership = await prisma.clinicMember.findFirst({
    where: { clinicId, userId, isActive: true },
    select: {
      role: { select: { key: true, permissions: true, isActive: true } },
    },
  });

  if (!membership?.role?.isActive) return false;

  if (isElevatedClinicRole(membership.role.key)) return true;

  return hasPermission(membership.role.permissions, perm);
}
