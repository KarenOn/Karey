import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { hasPermission, isElevatedClinicRole } from "@/lib/permissions";

const RoleCreateSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.record(z.string(), z.array(z.string())),
});

export async function GET() {
  try {
    const { clinicId, member } = await requireClinicPermission("employees.read");

    const roles = await prisma.role.findMany({
      where: { clinicId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        permissions: true,
        isActive: true,
        isSystem: true,
        _count: { select: { members: true } },
      },
    });

    const elevated = isElevatedClinicRole(member?.role.key);

    return NextResponse.json({
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isActive: role.isActive,
        isSystem: role.isSystem,
        membersCount: role._count.members,
      })),
      capabilities: {
        canManageRoles: elevated || hasPermission(member?.role.permissions, "roles.manage"),
      },
    });
  } catch {
    return NextResponse.json({ error: "No autorizado", roles: [] }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { clinicId } = await requireClinicPermission("roles.manage");
    const body = RoleCreateSchema.parse(await req.json());

    const created = await prisma.role.create({
      data: {
        clinicId,
        key: body.key,
        name: body.name,
        description: body.description,
        permissions: JSON.parse(JSON.stringify(body.permissions)),
        isSystem: false,
      },
    });

    return NextResponse.json(created);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "Datos inválidos", details: message }, { status: 422 });
  }
}
