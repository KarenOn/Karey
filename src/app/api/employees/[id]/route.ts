import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { z } from "zod";
import { syncUserRoleFromMembership } from "@/lib/current-user-profile";

const UpdateMemberSchema = z.object({
  roleId: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await requireClinicPermission("employees.update");
    const { id } = await params;
    const memberId = Number(id);

    const body = UpdateMemberSchema.parse(await req.json());

    const existing = await prisma.clinicMember.findFirst({ where: { id: memberId, clinicId } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (body.roleId !== undefined) {
      const role = await prisma.role.findFirst({
        where: { id: body.roleId, clinicId, isActive: true },
        select: { id: true },
      });

      if (!role) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }
    }

    const updated = await prisma.clinicMember.update({
      where: { id: memberId },
      data: {
        roleId: body.roleId ?? existing.roleId,
        isActive: body.isActive ?? existing.isActive,
      },
    });

    await syncUserRoleFromMembership(updated.userId, clinicId);

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "Datos inválidos", details: message }, { status: 422 });
  }
}
