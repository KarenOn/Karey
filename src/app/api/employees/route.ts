import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { hasPermission, isElevatedClinicRole } from "@/lib/permissions";

export async function GET() {
  try {
    const { clinicId, member } = await requireClinicPermission("employees.read");
    const members = await prisma.clinicMember.findMany({
      where: { clinicId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, key: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const invites = await prisma.employeeInvite.findMany({
      where: { clinicId, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { role: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
    });

    const elevated = isElevatedClinicRole(member?.role.key);

    return NextResponse.json({
      members,
      invites,
      capabilities: {
        canInviteEmployees: elevated || hasPermission(member?.role.permissions, "employees.invite"),
        canUpdateEmployees: elevated || hasPermission(member?.role.permissions, "employees.update"),
        canManageRoles: elevated || hasPermission(member?.role.permissions, "roles.manage"),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
