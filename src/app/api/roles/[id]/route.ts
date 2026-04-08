import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { z } from "zod";

const RoleUpdateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.record(z.string(), z.array(z.string())),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await requireClinicPermission("roles.manage");
    const { id } = await params;
    const roleId = Number(id);

    const body = RoleUpdateSchema.parse(await req.json());

    const existing = await prisma.role.findFirst({ where: { id: roleId, clinicId } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const updated = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: body.name,
        description: body.description,
        permissions: JSON.parse(JSON.stringify(body.permissions)),
        isActive: body.isActive
      },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "Datos inválidos", details: message }, { status: 422 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await requireClinicPermission("roles.manage");
    const { id } = await params;
    const roleId = Number(id);

    const existing = await prisma.role.findFirst({ where: { id: roleId, clinicId } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (existing.isSystem) return NextResponse.json({ error: "No se puede borrar un rol del sistema" }, { status: 400 });

    await prisma.role.delete({ where: { id: roleId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
