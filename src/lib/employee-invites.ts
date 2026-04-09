import { prisma } from "@/lib/prisma";

type PendingInviteActivation = {
  clinicId: number;
  roleKey: string;
};

export async function activatePendingEmployeeInviteForUser(
  userId: string,
  email: string
): Promise<PendingInviteActivation | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const invite = await prisma.employeeInvite.findFirst({
    where: {
      acceptedAt: null,
      email: normalizedEmail,
      expiresAt: { gt: new Date() },
    },
    include: {
      role: {
        select: {
          key: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (!invite) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.clinicMember.upsert({
      where: {
        clinicId_userId: {
          clinicId: invite.clinicId,
          userId,
        },
      },
      update: {
        isActive: true,
        roleId: invite.roleId,
      },
      create: {
        clinicId: invite.clinicId,
        isActive: true,
        roleId: invite.roleId,
        userId,
      },
    });

    await tx.employeeInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
        userId,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        role: invite.role.key,
      },
    });
  });

  return {
    clinicId: invite.clinicId,
    roleKey: invite.role.key,
  };
}
