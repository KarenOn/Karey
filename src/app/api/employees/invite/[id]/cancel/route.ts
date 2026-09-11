import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { clinicId } = await requireClinicPermission("employees.deactivate");
    const inviteId = Number((await params).id);
    if (!Number.isInteger(inviteId)) return NextResponse.json({ error: "Invitación inválida" }, { status: 400 });

    const invite = await prisma.employeeInvite.findFirst({
      where: { id: inviteId, clinicId, acceptedAt: null, revokedAt: null },
      select: { id: true },
    });
    if (!invite) return NextResponse.json({ error: "Invitación no disponible" }, { status: 404 });

    await prisma.employeeInvite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date(), tokenHash: crypto.randomBytes(32).toString("hex") },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo anular la invitación" }, { status: 500 });
  }
}
